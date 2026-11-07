import "server-only";
import { all, one, run, now, type User } from "./db";
import { emitToUser } from "./realtime";
import { notify } from "./trading";
import { levelFromXp } from "./finance";
import type {
  DirectMessage,
  FriendArenaStats,
  FriendBadges,
  FriendCard,
  FriendProfile,
  FriendRelation,
  FriendRequestCard,
  FriendSearchResult,
  FriendsOverview,
} from "./friends-types";

type FriendRow = {
  id: number;
  requester: number;
  addressee: number;
  status: string;
  created_at: number;
};

type UserSummaryRow = {
  id: number;
  name: string;
  mode: string;
  region: string;
  arena_region: string | null;
  xp: number;
  streak: number;
  credits: number;
};

type SearchRow = UserSummaryRow & {
  f_requester: number | null;
  f_addressee: number | null;
  f_status: string | null;
};

function relationFrom(
  viewerId: number,
  row: { f_requester: number | null; f_addressee: number | null; f_status: string | null }
): FriendRelation {
  if (!row.f_status) return "none";
  if (row.f_status === "accepted") return "friends";
  return row.f_requester === viewerId ? "outgoing" : "incoming";
}

function levelOf(xp: number) {
  return levelFromXp(Math.max(0, Number(xp) || 0)).level;
}

/** A friend relationship in either direction, if one exists. */
function findRelationship(a: number, b: number) {
  return one<FriendRow>(
    `SELECT * FROM friends
     WHERE (requester = ? AND addressee = ?) OR (requester = ? AND addressee = ?)
     LIMIT 1`,
    a, b, b, a
  );
}

export function areFriends(a: number, b: number) {
  return Boolean(
    one<{ id: number }>(
      `SELECT id FROM friends
       WHERE status = 'accepted'
         AND ((requester = ? AND addressee = ?) OR (requester = ? AND addressee = ?))
       LIMIT 1`,
      a, b, b, a
    )
  );
}

export function getFriendBadges(viewerId: number): FriendBadges {
  const requests = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM friends WHERE addressee = ? AND status = 'pending'",
    viewerId
  );
  const unread = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM direct_messages WHERE recipient_id = ? AND read_at IS NULL",
    viewerId
  );
  return { requests: Number(requests?.n ?? 0), unread: Number(unread?.n ?? 0) };
}

export function getFriends(viewerId: number): FriendCard[] {
  const rows = all<UserSummaryRow & {
    last_body: string | null;
    last_at: number | null;
    unread: number;
  }>(
    `SELECT u.id, u.name, u.mode, u.region, u.arena_region, u.xp, u.streak, u.credits,
       (SELECT dm.body FROM direct_messages dm
          WHERE (dm.sender_id = u.id AND dm.recipient_id = ?)
             OR (dm.sender_id = ? AND dm.recipient_id = u.id)
          ORDER BY dm.created_at DESC, dm.id DESC LIMIT 1) AS last_body,
       (SELECT dm.created_at FROM direct_messages dm
          WHERE (dm.sender_id = u.id AND dm.recipient_id = ?)
             OR (dm.sender_id = ? AND dm.recipient_id = u.id)
          ORDER BY dm.created_at DESC, dm.id DESC LIMIT 1) AS last_at,
       (SELECT COUNT(*) FROM direct_messages dm
          WHERE dm.sender_id = u.id AND dm.recipient_id = ? AND dm.read_at IS NULL) AS unread
     FROM friends f
     JOIN users u ON u.id = CASE WHEN f.requester = ? THEN f.addressee ELSE f.requester END
     WHERE (f.requester = ? OR f.addressee = ?) AND f.status = 'accepted'`,
    viewerId, viewerId, viewerId, viewerId, viewerId, viewerId, viewerId, viewerId
  );

  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      mode: r.mode,
      region: r.region,
      arenaRegion: r.arena_region || (r.region === "US" ? "US" : "IN"),
      xp: Number(r.xp) || 0,
      level: levelOf(r.xp),
      streak: Number(r.streak) || 0,
      credits: Number(r.credits) || 0,
      lastMessage: r.last_body ?? null,
      lastAt: r.last_at ?? null,
      unread: Number(r.unread) || 0,
    }))
    .sort((a, b) => {
      const at = a.lastAt ?? 0;
      const bt = b.lastAt ?? 0;
      if (at !== bt) return bt - at;
      return a.name.localeCompare(b.name);
    });
}

function requestCards(viewerId: number, direction: "incoming" | "outgoing"): FriendRequestCard[] {
  const sql =
    direction === "incoming"
      ? `SELECT u.id, u.name, u.mode, u.region, u.arena_region, u.xp, u.streak, f.created_at
         FROM friends f JOIN users u ON u.id = f.requester
         WHERE f.addressee = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`
      : `SELECT u.id, u.name, u.mode, u.region, u.arena_region, u.xp, u.streak, f.created_at
         FROM friends f JOIN users u ON u.id = f.addressee
         WHERE f.requester = ? AND f.status = 'pending'
         ORDER BY f.created_at DESC`;

  return all<UserSummaryRow & { created_at: number }>(sql, viewerId).map((r) => ({
    id: r.id,
    name: r.name,
    mode: r.mode,
    region: r.region,
    arenaRegion: r.arena_region || (r.region === "US" ? "US" : "IN"),
    xp: Number(r.xp) || 0,
    level: levelOf(r.xp),
    streak: Number(r.streak) || 0,
    createdAt: Number(r.created_at) || 0,
  }));
}

export function getFriendsOverview(viewerId: number): FriendsOverview {
  return {
    friends: getFriends(viewerId),
    incoming: requestCards(viewerId, "incoming"),
    outgoing: requestCards(viewerId, "outgoing"),
    badges: getFriendBadges(viewerId),
  };
}

/**
 * Search verified learners only. Admins and unverified accounts are never
 * listed, and the viewer never sees their own card.
 */
export function searchLearners(viewerId: number, query: string): FriendSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

  const rows = all<SearchRow>(
    `SELECT u.id, u.name, u.mode, u.region, u.arena_region, u.xp, u.streak, u.credits,
       f.requester AS f_requester, f.addressee AS f_addressee, f.status AS f_status
     FROM users u
     LEFT JOIN friends f
       ON (f.requester = u.id AND f.addressee = ?)
       OR (f.addressee = u.id AND f.requester = ?)
     WHERE u.id <> ?
       AND u.role <> 'admin'
       AND u.id_verified = 1
       AND (lower(u.name) LIKE ? ESCAPE '\\' OR lower(u.email) LIKE ? ESCAPE '\\')
     ORDER BY u.name COLLATE NOCASE
     LIMIT 24`,
    viewerId, viewerId, viewerId, like, like
  );

  const seen = new Set<number>();
  const results: FriendSearchResult[] = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    results.push({
      id: r.id,
      name: r.name,
      mode: r.mode,
      region: r.region,
      arenaRegion: r.arena_region || (r.region === "US" ? "US" : "IN"),
      xp: Number(r.xp) || 0,
      level: levelOf(r.xp),
      streak: Number(r.streak) || 0,
      relation: relationFrom(viewerId, r),
    });
  }
  return results;
}

export function getFriendProfile(viewerId: number, targetId: number): FriendProfile | null {
  const target = one<{
    id: number; name: string; mode: string; region: string; arena_region: string | null;
    xp: number; streak: number; credits: number; created_at: number; id_verified: number; role: string;
  }>(
    `SELECT id,name,mode,region,arena_region,xp,streak,credits,created_at,id_verified,role
     FROM users WHERE id = ?`,
    targetId
  );
  if (!target || target.role === "admin" || !target.id_verified) return null;

  const level = levelFromXp(Math.max(0, Number(target.xp) || 0));
  const stats = one<{
    matches: number; wins: number; losses: number; draws: number;
    rating: number; best_streak: number;
  }>(
    `SELECT matches,wins,losses,draws,rating,best_streak FROM arena_stats WHERE user_id = ?`,
    targetId
  );

  const arena: FriendArenaStats = {
    matches: Number(stats?.matches ?? 0),
    wins: Number(stats?.wins ?? 0),
    losses: Number(stats?.losses ?? 0),
    draws: Number(stats?.draws ?? 0),
    rating: Number(stats?.rating ?? 1000),
    bestStreak: Number(stats?.best_streak ?? 0),
  };

  const rel = targetId === viewerId
    ? { f_status: "accepted" as string, f_requester: viewerId, f_addressee: viewerId }
    : (() => {
        const row = findRelationship(viewerId, targetId);
        return {
          f_status: row?.status ?? null,
          f_requester: row?.requester ?? null,
          f_addressee: row?.addressee ?? null,
        };
      })();

  return {
    id: target.id,
    name: target.name,
    mode: target.mode,
    region: target.region,
    arenaRegion: target.arena_region || (target.region === "US" ? "US" : "IN"),
    xp: Number(target.xp) || 0,
    level: level.level,
    levelFloor: level.floor,
    levelCeil: level.ceil,
    levelProgress: level.progress,
    streak: Number(target.streak) || 0,
    credits: Number(target.credits) || 0,
    joinedAt: Number(target.created_at) || 0,
    relation: targetId === viewerId ? "none" : relationFrom(viewerId, rel),
    arena,
  };
}

export type FriendActionResult =
  | { ok: true; status: "pending" | "accepted" | "removed" | "declined" }
  | { ok: false; error: string };

export function sendFriendRequest(
  viewer: Pick<User, "id" | "name">,
  targetId: number
): FriendActionResult {
  if (targetId === viewer.id) return { ok: false, error: "You cannot add yourself." };

  const target = one<{ id: number; name: string; id_verified: number; role: string }>(
    "SELECT id,name,id_verified,role FROM users WHERE id = ?",
    targetId
  );
  if (!target) return { ok: false, error: "That learner no longer exists." };
  if (target.role === "admin") return { ok: false, error: "That account cannot receive requests." };
  if (!target.id_verified) {
    return { ok: false, error: "Only identity-verified learners can receive friend requests." };
  }

  const existing = findRelationship(viewer.id, targetId);
  if (existing) {
    if (existing.status === "accepted") return { ok: false, error: "You are already friends." };
    if (existing.requester === viewer.id) return { ok: false, error: "Request already sent." };
    return {
      ok: false,
      error: "This learner already sent you a request. Accept it from the Requests tab.",
    };
  }

  const ts = now();
  run(
    "INSERT INTO friends (requester, addressee, status, created_at) VALUES (?, ?, 'pending', ?)",
    viewer.id, targetId, ts
  );

  notify(
    targetId,
    "social",
    "New friend request",
    `${viewer.name} wants to connect. Open Friends to accept or decline.`
  );
  emitToUser(targetId, "friend:request", { from: { id: viewer.id, name: viewer.name }, at: ts });
  emitToUser(targetId, "friend:update", { at: ts });
  emitToUser(viewer.id, "friend:update", { at: ts });

  return { ok: true, status: "pending" };
}

export function respondFriendRequest(
  viewer: Pick<User, "id" | "name">,
  requesterId: number,
  accept: boolean
): FriendActionResult {
  const row = one<FriendRow>(
    `SELECT * FROM friends WHERE requester = ? AND addressee = ? AND status = 'pending' LIMIT 1`,
    requesterId, viewer.id
  );
  if (!row) return { ok: false, error: "That request is no longer pending." };

  const ts = now();
  if (accept) {
    run("UPDATE friends SET status = 'accepted' WHERE id = ?", row.id);
    notify(
      requesterId,
      "social",
      "Friend request accepted",
      `${viewer.name} accepted your request. You can plan strategies together now.`
    );
    emitToUser(requesterId, "friend:accepted", { by: { id: viewer.id, name: viewer.name }, at: ts });
  } else {
    run("DELETE FROM friends WHERE id = ?", row.id);
    emitToUser(requesterId, "friend:declined", { by: { id: viewer.id, name: viewer.name }, at: ts });
  }

  emitToUser(requesterId, "friend:update", { at: ts });
  emitToUser(viewer.id, "friend:update", { at: ts });
  return { ok: true, status: accept ? "accepted" : "declined" };
}

export function removeFriend(viewerId: number, otherId: number): FriendActionResult {
  const row = findRelationship(viewerId, otherId);
  if (!row) return { ok: false, error: "You are not connected to that learner." };
  run("DELETE FROM friends WHERE id = ?", row.id);
  const ts = now();
  emitToUser(otherId, "friend:update", { at: ts });
  emitToUser(viewerId, "friend:update", { at: ts });
  return { ok: true, status: "removed" };
}

export function getThread(viewerId: number, otherId: number): DirectMessage[] | null {
  if (!areFriends(viewerId, otherId)) return null;

  const ts = now();
  const marked = run(
    "UPDATE direct_messages SET read_at = ? WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL",
    ts, otherId, viewerId
  );
  if (marked.changes > 0) {
    emitToUser(otherId, "dm:read", { by: viewerId, at: ts });
    emitToUser(viewerId, "friend:update", { at: ts });
    emitToUser(otherId, "friend:update", { at: ts });
  }

  return all<{
    id: number; sender_id: number; recipient_id: number; body: string;
    read_at: number | null; created_at: number;
  }>(
    `SELECT * FROM (
       SELECT id, sender_id, recipient_id, body, read_at, created_at
       FROM direct_messages
       WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at DESC, id DESC
       LIMIT 300
     ) ORDER BY created_at ASC, id ASC`,
    viewerId, otherId, otherId, viewerId
  ).map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    body: m.body,
    readAt: m.read_at,
    createdAt: m.created_at,
  }));
}

export function sendDirectMessage(
  viewer: Pick<User, "id" | "name">,
  recipientId: number,
  rawBody: string
): { ok: true; message: DirectMessage } | { ok: false; error: string } {
  if (!areFriends(viewer.id, recipientId)) {
    return { ok: false, error: "You can only message accepted friends." };
  }

  const body = rawBody.replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "Write a message first." };
  if (body.length > 2000) return { ok: false, error: "Keep messages under 2,000 characters." };

  const ts = now();
  const inserted = run(
    "INSERT INTO direct_messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)",
    viewer.id, recipientId, body, ts
  );

  const message: DirectMessage = {
    id: inserted.lastId,
    senderId: viewer.id,
    recipientId,
    body,
    readAt: null,
    createdAt: ts,
  };

  const payload = { message, from: { id: viewer.id, name: viewer.name }, at: ts };
  // Deliver to both sides so the sender's other tabs stay in sync too.
  emitToUser(recipientId, "dm:message", payload);
  emitToUser(viewer.id, "dm:message", payload);
  emitToUser(recipientId, "friend:update", { at: ts });

  return { ok: true, message };
}
