import "server-only";
import { all, one, run, now, tx, type User } from "./db";
import { emitToUser } from "./realtime";
import { creditsForUser, notify } from "./trading";
import { areFriends, getFriends } from "./friends";
import type {
  QuestCard,
  QuestMetric,
  QuestStatus,
  QuestsOverview,
} from "./friends-types";

/**
 * Friend quests.
 *
 * Two accepted friends put up the same number of credits. The server rolls a
 * random measurable challenge, records each player's baseline and then watches
 * real platform activity (trades, lessons, quizzes, arena wins, XP). The first
 * player to hit the target takes the whole pot. If the deadline passes with no
 * winner, both stakes are lost. Nothing here touches real money.
 */

export const QUEST_STAKES = [10, 25, 50] as const;
export type QuestStake = (typeof QUEST_STAKES)[number];

const PENDING_TTL = 24 * 60 * 60_000;
const MIN_QUEST_MS = 45 * 60_000;
const MAX_QUEST_MS = 120 * 60_000;
const HISTORY_LIMIT = 25;

type Template = {
  key: string;
  metric: QuestMetric;
  target: number;
  title: string;
  description: string;
};

const TEMPLATES: Template[] = [
  {
    key: "trade-trio",
    metric: "trades",
    target: 3,
    title: "Place 3 trades",
    description: "Execute three mock trades before your friend does.",
  },
  {
    key: "lesson-sprint",
    metric: "lessons",
    target: 1,
    title: "Finish a lesson",
    description: "Complete any lesson module first.",
  },
  {
    key: "quiz-sharp",
    metric: "quiz",
    target: 1,
    title: "Pass a quiz",
    description: "Submit a module quiz before your friend.",
  },
  {
    key: "arena-duel",
    metric: "arena_wins",
    target: 1,
    title: "Win an arena match",
    description: "Win one live arena match first.",
  },
  {
    key: "xp-rush",
    metric: "xp",
    target: 60,
    title: "Earn 60 XP",
    description: "Earn 60 XP from lessons, quizzes or arena first.",
  },
];

type QuestRow = {
  id: number;
  host_id: number;
  guest_id: number;
  stake: number;
  status: string;
  quest_key: string;
  metric: string;
  target: number;
  host_baseline: number;
  guest_baseline: number;
  host_progress: number;
  guest_progress: number;
  winner_id: number | null;
  created_at: number;
  accepted_at: number | null;
  ends_at: number | null;
  ended_at: number | null;
};

const templateByKey = new Map(TEMPLATES.map((t) => [t.key, t]));

function templateFor(row: QuestRow): Template {
  return (
    templateByKey.get(row.quest_key) ?? {
      key: row.quest_key,
      metric: row.metric as QuestMetric,
      target: Number(row.target) || 1,
      title: "Friend quest",
      description: "Finish the objective before your friend.",
    }
  );
}

function randomTemplate() {
  return TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
}

function count(sql: string, ...args: Array<string | number>) {
  return Number(one<{ n: number }>(sql, ...args)?.n ?? 0);
}

function metricValue(
  userId: number,
  metric: QuestMetric,
  since: number,
  baseline: number
): number {
  switch (metric) {
    case "trades":
      return count(
        "SELECT COUNT(*) AS n FROM orders WHERE user_id = ? AND created_at >= ?",
        userId,
        since
      );
    case "lessons":
      return count(
        `SELECT COUNT(*) AS n FROM module_progress
         WHERE user_id = ? AND status = 'completed' AND completed_at IS NOT NULL AND completed_at >= ?`,
        userId,
        since
      );
    case "quiz":
      return count(
        "SELECT COUNT(*) AS n FROM quiz_attempts WHERE user_id = ? AND created_at >= ?",
        userId,
        since
      );
    case "arena_wins":
      return count(
        `SELECT COUNT(*) AS n FROM arena_matches
         WHERE winner_id = ? AND ended_at IS NOT NULL AND ended_at >= ?`,
        userId,
        since
      );
    case "xp": {
      const row = one<{ xp: number }>("SELECT xp FROM users WHERE id = ?", userId);
      return Math.max(0, Number(row?.xp ?? 0) - baseline);
    }
    default:
      return 0;
  }
}

function userName(id: number) {
  return one<{ name: string }>("SELECT name FROM users WHERE id = ?", id)?.name ?? "Learner";
}

function toCard(row: QuestRow, viewerId: number): QuestCard {
  const role = row.host_id === viewerId ? "host" : "guest";
  const tpl = templateFor(row);
  const friendId = role === "host" ? row.guest_id : row.host_id;
  return {
    id: row.id,
    role,
    friendId,
    friendName: userName(friendId),
    stake: Number(row.stake) || 0,
    pot: (Number(row.stake) || 0) * 2,
    status: row.status as QuestStatus,
    title: tpl.title,
    description: tpl.description,
    metric: tpl.metric,
    target: Number(row.target) || tpl.target,
    myProgress:
      role === "host" ? Number(row.host_progress) || 0 : Number(row.guest_progress) || 0,
    friendProgress:
      role === "host" ? Number(row.guest_progress) || 0 : Number(row.host_progress) || 0,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    endedAt: row.ended_at,
    winnerId: row.winner_id,
    iWon: row.winner_id === viewerId,
  };
}

/* ------------------------------------------------------------------ */
/* resolution                                                          */
/* ------------------------------------------------------------------ */

function finishQuest(row: QuestRow, winnerId: number, t: number) {
  const tpl = templateFor(row);
  const loserId = winnerId === row.host_id ? row.guest_id : row.host_id;
  const pot = Number(row.stake) * 2;

  // Claim the settlement first: only the sweep that flips `active` → `won`
  // pays out, so a repeated sweep can never credit the pot twice.
  const claim = run(
    `UPDATE friend_quests
     SET status = 'won', winner_id = ?, host_progress = ?, guest_progress = ?, ended_at = ?
     WHERE id = ? AND status = 'active'`,
    winnerId,
    row.host_progress,
    row.guest_progress,
    t,
    row.id
  );
  if (claim.changes !== 1) return;
  row.status = "won";
  row.winner_id = winnerId;
  row.ended_at = t;

  creditsForUser(winnerId, pot, `Friend quest won · ${tpl.title}`);
  notify(
    winnerId,
    "success",
    "Friend quest won",
    `You beat ${userName(loserId)} at "${tpl.title}". +${pot} credits (your ${row.stake} stake plus theirs).`
  );
  notify(
    loserId,
    "danger",
    "Friend quest lost",
    `${userName(winnerId)} completed "${tpl.title}" first. Your ${row.stake}-credit stake is gone.`
  );

  const payload = {
    id: row.id,
    status: "won",
    winnerId,
    winnerName: userName(winnerId),
    title: tpl.title,
    at: t,
  };
  emitToUser(row.host_id, "quest:ended", payload);
  emitToUser(row.guest_id, "quest:ended", payload);
  emitToUser(row.host_id, "quest:update", { at: t });
  emitToUser(row.guest_id, "quest:update", { at: t });
}

function expireQuest(row: QuestRow, t: number) {
  const tpl = templateFor(row);
  const claim = run(
    "UPDATE friend_quests SET status = 'expired', ended_at = ? WHERE id = ? AND status = 'active'",
    t,
    row.id
  );
  if (claim.changes !== 1) return;
  row.status = "expired";
  row.ended_at = t;

  notify(
    row.host_id,
    "warning",
    "Friend quest expired",
    `Neither of you completed "${tpl.title}" in time. Both ${row.stake}-credit stakes were lost.`
  );
  notify(
    row.guest_id,
    "warning",
    "Friend quest expired",
    `Neither of you completed "${tpl.title}" in time. Both ${row.stake}-credit stakes were lost.`
  );

  const payload = { id: row.id, status: "expired", title: tpl.title, at: t };
  emitToUser(row.host_id, "quest:ended", payload);
  emitToUser(row.guest_id, "quest:ended", payload);
  emitToUser(row.host_id, "quest:update", { at: t });
  emitToUser(row.guest_id, "quest:update", { at: t });
}

function expirePending(row: QuestRow, t: number) {
  const tpl = templateFor(row);
  const claim = run(
    "UPDATE friend_quests SET status = 'expired', ended_at = ? WHERE id = ? AND status = 'pending'",
    t,
    row.id
  );
  if (claim.changes !== 1) return;
  row.status = "expired";
  row.ended_at = t;
  notify(
    row.host_id,
    "info",
    "Quest invite expired",
    `Your invite to ${userName(row.guest_id)} for "${tpl.title}" was not accepted in 24 hours. No credits were taken.`
  );
  emitToUser(row.host_id, "quest:update", { at: t });
  emitToUser(row.guest_id, "quest:update", { at: t });
}

/** Refresh both progress counters and settle the quest if it is over. */
function resolveQuest(row: QuestRow, t: number) {
  if (row.status === "pending") {
    if (t - row.created_at >= PENDING_TTL) expirePending(row, t);
    return row;
  }
  if (row.status !== "active") return row;

  const since = row.accepted_at ?? row.created_at;
  row.host_progress = metricValue(
    row.host_id,
    row.metric as QuestMetric,
    since,
    row.host_baseline
  );
  row.guest_progress = metricValue(
    row.guest_id,
    row.metric as QuestMetric,
    since,
    row.guest_baseline
  );
  run(
    "UPDATE friend_quests SET host_progress = ?, guest_progress = ? WHERE id = ?",
    row.host_progress,
    row.guest_progress,
    row.id
  );

  const target = Number(row.target) || 1;
  const hostDone = row.host_progress >= target;
  const guestDone = row.guest_progress >= target;

  if (hostDone || guestDone) {
    let winnerId: number;
    if (hostDone && guestDone) {
      winnerId = row.host_progress >= row.guest_progress ? row.host_id : row.guest_id;
    } else {
      winnerId = hostDone ? row.host_id : row.guest_id;
    }
    finishQuest(row, winnerId, t);
    return row;
  }

  if (row.ends_at && t >= row.ends_at) expireQuest(row, t);
  return row;
}

/**
 * Recompute quest progress. Pass a user id to only touch that learner's quests
 * (used by page loads and API calls); omit it from the background loop to sweep
 * every live quest.
 */
export function sweepQuests(viewerId?: number) {
  const rows = viewerId
    ? all<QuestRow>(
        `SELECT * FROM friend_quests
         WHERE status IN ('pending','active') AND (host_id = ? OR guest_id = ?)`,
        viewerId,
        viewerId
      )
    : all<QuestRow>(
        "SELECT * FROM friend_quests WHERE status IN ('pending','active')"
      );

  const t = now();
  for (const row of rows) {
    try {
      resolveQuest(row, t);
    } catch (err) {
      console.error("[quests] resolve", row.id, err);
    }
  }
}

/* ------------------------------------------------------------------ */
/* reads                                                               */
/* ------------------------------------------------------------------ */

export function getQuestsOverview(viewerId: number): QuestsOverview {
  sweepQuests(viewerId);

  const rows = all<QuestRow>(
    `SELECT * FROM friend_quests
     WHERE host_id = ? OR guest_id = ?
     ORDER BY created_at DESC
     LIMIT 120`,
    viewerId,
    viewerId
  );

  const incoming: QuestCard[] = [];
  const outgoing: QuestCard[] = [];
  const active: QuestCard[] = [];
  const history: QuestCard[] = [];

  for (const row of rows) {
    const card = toCard(row, viewerId);
    if (row.status === "pending") {
      if (row.guest_id === viewerId) incoming.push(card);
      else outgoing.push(card);
    } else if (row.status === "active") {
      active.push(card);
    } else if (history.length < HISTORY_LIMIT) {
      history.push(card);
    }
  }

  history.sort(
    (a, b) => (b.endedAt ?? b.createdAt) - (a.endedAt ?? a.createdAt)
  );

  const credits = one<{ credits: number }>(
    "SELECT credits FROM users WHERE id = ?",
    viewerId
  );

  return {
    incoming,
    outgoing,
    active,
    history,
    badges: { invites: incoming.length, active: active.length },
    friends: getFriends(viewerId).map((f) => ({
      id: f.id,
      name: f.name,
      credits: f.credits,
    })),
    myCredits: Number(credits?.credits ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

type QuestResult =
  | { ok: true; quest: QuestCard }
  | { ok: false; error: string };

export function inviteQuest(
  viewer: Pick<User, "id" | "name" | "credits">,
  friendId: number,
  stake: number
): QuestResult {
  if (friendId === viewer.id) return { ok: false, error: "Choose a friend to challenge." };
  if (!QUEST_STAKES.includes(stake as QuestStake)) {
    return { ok: false, error: "Pick a stake of 10, 25 or 50 credits." };
  }
  if (!areFriends(viewer.id, friendId)) {
    return { ok: false, error: "You can only send quests to accepted friends." };
  }

  const existing = one<{ id: number }>(
    `SELECT id FROM friend_quests
     WHERE status IN ('pending','active')
       AND ((host_id = ? AND guest_id = ?) OR (host_id = ? AND guest_id = ?))
     LIMIT 1`,
    viewer.id,
    friendId,
    friendId,
    viewer.id
  );
  if (existing) {
    return { ok: false, error: "You already have a quest open with this friend." };
  }

  const fresh = one<{ credits: number }>(
    "SELECT credits FROM users WHERE id = ?",
    viewer.id
  );
  const current = Number(fresh?.credits ?? viewer.credits ?? 0);
  if (current < stake) {
    return { ok: false, error: `You need ${stake} credits to stake. Earn more in Learn or Arena.` };
  }

  const tpl = randomTemplate();
  const t = now();
  const inserted = run(
    `INSERT INTO friend_quests
       (host_id, guest_id, stake, status, quest_key, metric, target,
        host_baseline, guest_baseline, host_progress, guest_progress, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, 0, 0, 0, 0, ?)`,
    viewer.id,
    friendId,
    stake,
    tpl.key,
    tpl.metric,
    tpl.target,
    t
  );

  notify(
    friendId,
    "social",
    "New friend quest",
    `${viewer.name} challenged you: "${tpl.title}". Stake ${stake} credits. Open Friends → Quests to accept.`
  );

  const payload = {
    id: inserted.lastId,
    from: { id: viewer.id, name: viewer.name },
    title: tpl.title,
    stake,
    at: t,
  };
  emitToUser(friendId, "quest:invite", payload);
  emitToUser(friendId, "quest:update", { at: t });
  emitToUser(viewer.id, "quest:update", { at: t });

  const row = one<QuestRow>("SELECT * FROM friend_quests WHERE id = ?", inserted.lastId);
  return { ok: true, quest: row ? toCard(row, viewer.id) : ({} as QuestCard) };
}

export function cancelQuest(
  viewer: Pick<User, "id" | "name">,
  questId: number
): QuestResult {
  const row = one<QuestRow>(
    "SELECT * FROM friend_quests WHERE id = ? AND host_id = ? AND status = 'pending'",
    questId,
    viewer.id
  );
  if (!row) return { ok: false, error: "That quest invite is no longer pending." };

  const t = now();
  const tpl = templateFor(row);
  const claim = run(
    "UPDATE friend_quests SET status = 'cancelled', ended_at = ? WHERE id = ? AND status = 'pending'",
    t,
    row.id
  );
  if (claim.changes !== 1) {
    return { ok: false, error: "That quest invite is no longer pending." };
  }
  row.status = "cancelled";
  row.ended_at = t;
  notify(
    row.guest_id,
    "info",
    "Quest invite withdrawn",
    `${viewer.name} cancelled the "${tpl.title}" invite. No credits were taken.`
  );
  emitToUser(row.guest_id, "quest:ended", {
    id: row.id,
    status: "cancelled",
    title: tpl.title,
    at: t,
  });
  emitToUser(row.host_id, "quest:update", { at: t });
  emitToUser(row.guest_id, "quest:update", { at: t });
  return { ok: true, quest: toCard(row, viewer.id) };
}

export function respondQuest(
  viewer: Pick<User, "id" | "name">,
  questId: number,
  accept: boolean
): QuestResult {
  const row = one<QuestRow>(
    "SELECT * FROM friend_quests WHERE id = ? AND guest_id = ? AND status = 'pending'",
    questId,
    viewer.id
  );
  if (!row) return { ok: false, error: "That quest invite is no longer pending." };

  const t = now();
  const tpl = templateFor(row);

  if (!accept) {
    const claim = run(
      "UPDATE friend_quests SET status = 'declined', ended_at = ? WHERE id = ? AND status = 'pending'",
      t,
      row.id
    );
    if (claim.changes !== 1) {
      return { ok: false, error: "That quest invite is no longer pending." };
    }
    row.status = "declined";
    row.ended_at = t;
    notify(
      row.host_id,
      "info",
      "Quest declined",
      `${viewer.name} declined "${tpl.title}". No credits were taken.`
    );
    emitToUser(row.host_id, "quest:ended", {
      id: row.id,
      status: "declined",
      title: tpl.title,
      at: t,
    });
    emitToUser(row.host_id, "quest:update", { at: t });
    emitToUser(row.guest_id, "quest:update", { at: t });
    return { ok: true, quest: toCard(row, viewer.id) };
  }

  const host = one<{ credits: number }>(
    "SELECT credits FROM users WHERE id = ?",
    row.host_id
  );
  const guest = one<{ credits: number }>(
    "SELECT credits FROM users WHERE id = ?",
    row.guest_id
  );
  const stake = Number(row.stake);
  if (Number(host?.credits ?? 0) < stake) {
    const claim = run(
      "UPDATE friend_quests SET status = 'cancelled', ended_at = ? WHERE id = ? AND status = 'pending'",
      t,
      row.id
    );
    if (claim.changes === 1) {
      notify(
        row.host_id,
        "warning",
        "Quest cancelled",
        `You no longer have ${stake} credits to stake, so "${tpl.title}" was cancelled.`
      );
      emitToUser(row.host_id, "quest:update", { at: t });
      emitToUser(row.guest_id, "quest:update", { at: t });
    }
    return { ok: false, error: "Your friend no longer has enough credits for this stake." };
  }
  if (Number(guest?.credits ?? 0) < stake) {
    return { ok: false, error: `You need ${stake} credits to accept this quest.` };
  }

  const hostXp = one<{ xp: number }>("SELECT xp FROM users WHERE id = ?", row.host_id);
  const guestXp = one<{ xp: number }>("SELECT xp FROM users WHERE id = ?", row.guest_id);
  const endsAt = t + MIN_QUEST_MS + Math.random() * (MAX_QUEST_MS - MIN_QUEST_MS);

  // Claim the invite and take both stakes in one transaction, so a double
  // accept can never charge the same quest twice.
  const started = tx(() => {
    const claim = run(
      `UPDATE friend_quests
       SET status = 'active', accepted_at = ?, ends_at = ?,
           host_baseline = ?, guest_baseline = ?
       WHERE id = ? AND status = 'pending'`,
      t,
      endsAt,
      Number(hostXp?.xp ?? 0),
      Number(guestXp?.xp ?? 0),
      row.id
    );
    if (claim.changes !== 1) return false;
    creditsForUser(viewer.id, -stake, `Friend quest stake · ${tpl.title}`);
    creditsForUser(row.host_id, -stake, `Friend quest stake · ${tpl.title}`);
    return true;
  });
  if (!started) return { ok: false, error: "That quest invite is no longer pending." };

  row.status = "active";
  row.accepted_at = t;
  row.ends_at = endsAt;
  row.host_baseline = Number(hostXp?.xp ?? 0);
  row.guest_baseline = Number(guestXp?.xp ?? 0);

  notify(
    row.host_id,
    "social",
    "Quest accepted",
    `${viewer.name} accepted your "${tpl.title}" challenge. First to finish wins ${stake * 2} credits.`
  );
  notify(
    row.guest_id,
    "social",
    "Quest started",
    `Your "${tpl.title}" quest is live. Both stakes are in; first to finish wins ${stake * 2} credits.`
  );

  emitToUser(row.host_id, "quest:update", { at: t });
  emitToUser(row.guest_id, "quest:update", { at: t });

  return { ok: true, quest: toCard(row, viewer.id) };
}
