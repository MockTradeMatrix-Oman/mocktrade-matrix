"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Check, Clock, Coins, Flame, Inbox, Loader2, MessageSquare, Search, Send,
  ShieldCheck, Sparkles, Swords, Target, Timer, Trophy, UserCheck, UserPlus, Users, UserX, X, Zap,
} from "lucide-react";
import { Avatar, Badge, Card, EmptyState, Modal, Progress, cn } from "./ui";
import { useToast } from "./toast";
import { useMarket } from "./socket";
import { useLang } from "./language-provider";
import { modeName, timeAgo } from "@/lib/finance";
import type {
  DirectMessage,
  FriendProfile,
  FriendRequestCard,
  FriendSearchResult,
  FriendsOverview,
  QuestCard,
  QuestsOverview,
} from "@/lib/friends-types";

type Tab = "friends" | "requests" | "quests" | "search" | "messages";

const TABS: Array<{ id: Tab; label: string; icon: typeof Users }> = [
  { id: "friends", label: "Friends", icon: Users },
  { id: "requests", label: "Requests", icon: UserPlus },
  { id: "quests", label: "Quests", icon: Swords },
  { id: "search", label: "Search", icon: Search },
  { id: "messages", label: "Messages", icon: MessageSquare },
];

function mergeMessage(list: DirectMessage[], next: DirectMessage) {
  if (list.some((m) => m.id === next.id)) return list;
  return [...list, next].sort((a, b) => a.createdAt - b.createdAt || a.id - b.id);
}

function platformLabel(region: string) {
  return region === "US" ? "United States" : "India";
}

export function FriendsView({
  me,
  initial,
  initialQuests,
}: {
  me: { id: number; name: string };
  initial: FriendsOverview;
  initialQuests: QuestsOverview;
}) {
  const { socket, connected } = useMarket();
  const { push } = useToast();
  const { t } = useLang();

  const [tab, setTab] = useState<Tab>("friends");
  const [overview, setOverview] = useState<FriendsOverview>(initial);
  const [quests, setQuests] = useState<QuestsOverview>(initialQuests);
  const [questFriendId, setQuestFriendId] = useState<number | "">("");
  const [questStake, setQuestStake] = useState(25);
  const [questBusy, setQuestBusy] = useState<string | null>(null);
  const [activeFriendId, setActiveFriendId] = useState<number | null>(null);
  const [thread, setThread] = useState<DirectMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typingFrom, setTypingFrom] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const activeRef = useRef<number | null>(null);
  const tabRef = useRef<Tab>("friends");
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const typingClear = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSend = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activeRef.current = activeFriendId;
  }, [activeFriendId]);

  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  const activeFriend = useMemo(
    () => overview.friends.find((f) => f.id === activeFriendId) ?? null,
    [overview.friends, activeFriendId]
  );

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/friends", { cache: "no-store" });
      if (res.ok) setOverview((await res.json()) as FriendsOverview);
    } catch {
      /* a transient network blip should not break the page */
    }
  }, []);

  const reloadQuests = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/quests", { cache: "no-store" });
      if (res.ok) setQuests((await res.json()) as QuestsOverview);
    } catch {
      /* keep the last snapshot if the network blips */
    }
  }, []);

  const loadThread = useCallback(async (id: number, silent = false) => {
    if (!silent) setThreadLoading(true);
    try {
      const res = await fetch(`/api/friends/messages?userId=${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setThread(data.messages as DirectMessage[]);
      else if (!silent) setThread([]);
    } catch {
      if (!silent) setThread([]);
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, []);

  // Realtime: relationship changes, new messages, read receipts and typing.
  useEffect(() => {
    if (!socket) return;

    const onUpdate = () => {
      void reload();
    };
    const onRequest = () => {
      // The persisted notification already shows a toast through <Shell>.
      void reload();
    };
    const onAccepted = () => {
      void reload();
    };
    const onDeclined = (d: any) => {
      push({
        tone: "info",
        title: "Request declined",
        body: `${d?.by?.name ?? "A learner"} declined your request.`,
      });
      void reload();
    };
    const onQuestInvite = (d: any) => {
      push({
        tone: "info",
        title: "New friend quest",
        body: `${d?.from?.name ?? "A friend"} staked ${d?.stake ?? 0} credits on "${d?.title ?? "a quest"}". Open Quests to accept.`,
      });
      void reloadQuests();
    };
    const onQuestUpdate = () => {
      void reloadQuests();
    };
    const onQuestEnded = (d: any) => {
      if (d?.status === "won") {
        push({
          tone: d.winnerId === me.id ? "success" : "error",
          title: d.winnerId === me.id ? "Quest won" : "Quest lost",
          body:
            d.winnerId === me.id
              ? `You completed "${d.title}" first. The whole pot is yours.`
              : `${d.winnerName} completed "${d.title}" first. Better luck on the next stake.`,
        });
      } else if (d?.status === "expired") {
        push({
          tone: "info",
          title: "Quest expired",
          body: `Neither player finished "${d.title}". Both stakes were lost.`,
        });
      } else if (d?.status === "declined") {
        push({ tone: "info", title: "Quest declined", body: `Your invite for "${d.title}" was declined.` });
      } else if (d?.status === "cancelled") {
        push({ tone: "info", title: "Quest withdrawn", body: `The invite for "${d.title}" was cancelled.` });
      }
      void reloadQuests();
    };
    const onMessage = (d: any) => {
      const message = d?.message as DirectMessage | undefined;
      if (!message) return;
      if (
        tabRef.current === "messages" &&
        activeRef.current &&
        (message.senderId === activeRef.current || message.recipientId === activeRef.current)
      ) {
        void loadThread(activeRef.current, true);
      } else if (message.senderId !== me.id) {
        push({
          tone: "info",
          title: `Message from ${d?.from?.name ?? "a friend"}`,
          body: message.body.length > 120 ? `${message.body.slice(0, 120)}…` : message.body,
        });
      }
      void reload();
    };
    const onRead = (d: any) => {
      if (d?.by !== activeRef.current) return;
      setThread((prev) =>
        prev.map((m) => (m.senderId === me.id && !m.readAt ? { ...m, readAt: d.at } : m))
      );
    };
    const onTyping = (d: any) => {
      if (d?.from !== activeRef.current) return;
      if (typingClear.current) clearTimeout(typingClear.current);
      setTypingFrom(d.typing ? d.from : null);
      if (d.typing) {
        typingClear.current = setTimeout(() => setTypingFrom(null), 2600);
      }
    };

    socket.on("friend:update", onUpdate);
    socket.on("friend:request", onRequest);
    socket.on("friend:accepted", onAccepted);
    socket.on("friend:declined", onDeclined);
    socket.on("quest:invite", onQuestInvite);
    socket.on("quest:update", onQuestUpdate);
    socket.on("quest:ended", onQuestEnded);
    socket.on("dm:message", onMessage);
    socket.on("dm:read", onRead);
    socket.on("dm:typing", onTyping);

    return () => {
      socket.off("friend:update", onUpdate);
      socket.off("friend:request", onRequest);
      socket.off("friend:accepted", onAccepted);
      socket.off("friend:declined", onDeclined);
      socket.off("quest:invite", onQuestInvite);
      socket.off("quest:update", onQuestUpdate);
      socket.off("quest:ended", onQuestEnded);
      socket.off("dm:message", onMessage);
      socket.off("dm:read", onRead);
      socket.off("dm:typing", onTyping);
    };
  }, [socket, push, reload, reloadQuests, loadThread, me.id]);

  // Keep the conversation pinned to the newest message.
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length, typingFrom, activeFriendId, tab]);

  // Quest progress is driven by real platform activity, so refresh while the
  // Quests tab is open even if the socket is reconnecting.
  useEffect(() => {
    if (tab !== "quests") return;
    void reloadQuests();
    const timer = setInterval(() => {
      void reloadQuests();
    }, 20_000);
    return () => clearInterval(timer);
  }, [tab, reloadQuests]);

  // Debounced verified-user search.
  useEffect(() => {
    const q = searchQuery.trim();
    setSearchTouched(false);
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data) setSearchResults(data.results as FriendSearchResult[]);
        else setSearchResults([]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
        setSearchTouched(true);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function postJson(url: string, payload: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error ?? "Something went wrong.");
    return data;
  }

  function setRelationInSearch(id: number, relation: FriendSearchResult["relation"]) {
    setSearchResults((prev) => prev.map((r) => (r.id === id ? { ...r, relation } : r)));
  }

  async function addFriend(id: number, name: string) {
    if (busy) return;
    setBusy(`add:${id}`);
    try {
      await postJson("/api/friends/request", { userId: id });
      push({ tone: "success", title: "Request sent", body: `${name} will see your request in Friends.` });
      setRelationInSearch(id, "outgoing");
      setProfile((p) => (p && p.id === id ? { ...p, relation: "outgoing" } : p));
      await reload();
    } catch (err: any) {
      push({ tone: "error", title: "Could not send request", body: err.message });
    } finally {
      setBusy(null);
    }
  }

  async function respond(id: number, accept: boolean, name: string) {
    if (busy) return;
    setBusy(`req:${id}`);
    try {
      await postJson("/api/friends/respond", { userId: id, accept });
      push({
        tone: accept ? "success" : "info",
        title: accept ? `You are now friends with ${name}` : "Request declined",
        body: accept ? "Open Messages to plan your next strategy together." : `${name} was not added.`,
      });
      setRelationInSearch(id, accept ? "friends" : "none");
      setProfile((p) => (p && p.id === id ? { ...p, relation: accept ? "friends" : "none" } : p));
      await reload();
    } catch (err: any) {
      push({ tone: "error", title: "Could not update request", body: err.message });
    } finally {
      setBusy(null);
    }
  }

  async function unfriend(id: number, name: string) {
    if (busy) return;
    setBusy(`remove:${id}`);
    try {
      await postJson("/api/friends/remove", { userId: id });
      push({ tone: "info", title: "Removed", body: `${name} is no longer in your friends list.` });
      setRelationInSearch(id, "none");
      if (activeFriendId === id) {
        setActiveFriendId(null);
        activeRef.current = null;
        setThread([]);
      }
      setProfile((p) => (p && p.id === id ? { ...p, relation: "none" } : p));
      setConfirmRemove(false);
      await reload();
    } catch (err: any) {
      push({ tone: "error", title: "Could not remove friend", body: err.message });
    } finally {
      setBusy(null);
    }
  }

  async function sendQuest() {
    if (questBusy) return;
    if (!questFriendId) {
      push({ tone: "info", title: "Pick a friend", body: "Choose which friend you want to challenge." });
      return;
    }
    const friend = quests.friends.find((f) => f.id === questFriendId);
    setQuestBusy("invite");
    try {
      await postJson("/api/friends/quests", {
        action: "invite",
        userId: questFriendId,
        stake: questStake,
      });
      push({
        tone: "success",
        title: "Quest invite sent",
        body: `${friend?.name ?? "Your friend"} has 24 hours to accept the ${questStake}-credit stake.`,
      });
      setQuestFriendId("");
      await reloadQuests();
    } catch (err: any) {
      push({ tone: "error", title: "Quest not sent", body: err.message });
    } finally {
      setQuestBusy(null);
    }
  }

  async function respondQuestAction(quest: QuestCard, accept: boolean) {
    if (questBusy) return;
    setQuestBusy(`${accept ? "accept" : "decline"}:${quest.id}`);
    try {
      await postJson("/api/friends/quests", {
        action: accept ? "accept" : "decline",
        questId: quest.id,
      });
      push({
        tone: accept ? "success" : "info",
        title: accept ? "Quest started" : "Quest declined",
        body: accept
          ? `Your ${quest.stake}-credit stake is in. "${t(quest.title)}" is live — first to finish wins ${quest.pot}.`
          : `You declined "${t(quest.title)}". No credits were taken.`,
      });
      await reloadQuests();
      await reload();
    } catch (err: any) {
      push({ tone: "error", title: "Quest not updated", body: err.message });
    } finally {
      setQuestBusy(null);
    }
  }

  async function cancelQuestAction(quest: QuestCard) {
    if (questBusy) return;
    setQuestBusy(`cancel:${quest.id}`);
    try {
      await postJson("/api/friends/quests", { action: "cancel", questId: quest.id });
      push({ tone: "info", title: "Invite withdrawn", body: `"${t(quest.title)}" was cancelled. No credits were taken.` });
      await reloadQuests();
    } catch (err: any) {
      push({ tone: "error", title: "Could not cancel", body: err.message });
    } finally {
      setQuestBusy(null);
    }
  }

  function openThread(id: number) {
    setActiveFriendId(id);
    activeRef.current = id;
    setTab("messages");
    setTypingFrom(null);
    setDraft("");
    void loadThread(id);
    setOverview((prev) => {
      const target = prev.friends.find((f) => f.id === id);
      const removed = target?.unread ?? 0;
      return {
        ...prev,
        friends: prev.friends.map((f) => (f.id === id ? { ...f, unread: 0 } : f)),
        badges: { ...prev.badges, unread: Math.max(0, prev.badges.unread - removed) },
      };
    });
  }

  async function openProfile(id: number) {
    setProfileId(id);
    setProfile(null);
    setConfirmRemove(false);
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/friends/profile?id=${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data) setProfile(data.profile as FriendProfile);
      else setProfile(null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  function onDraftChange(value: string) {
    setDraft(value);
    if (!socket || !activeFriendId) return;
    socket.emit("dm:typing", { to: activeFriendId, typing: true });
    if (typingSend.current) clearTimeout(typingSend.current);
    typingSend.current = setTimeout(() => {
      socket.emit("dm:typing", { to: activeFriendId, typing: false });
    }, 1400);
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body || !activeFriendId || sending) return;
    const friendId = activeFriendId;
    setSending(true);
    if (socket) socket.emit("dm:typing", { to: friendId, typing: false });
    try {
      const data = await postJson("/api/friends/messages", { userId: friendId, body });
      const message = data.message as DirectMessage;
      setThread((prev) => mergeMessage(prev, message));
      setDraft("");
      setOverview((prev) => ({
        ...prev,
        friends: prev.friends.map((f) =>
          f.id === friendId ? { ...f, lastMessage: message.body, lastAt: message.createdAt } : f
        ),
      }));
      await reload();
    } catch (err: any) {
      push({ tone: "error", title: "Message not sent", body: err.message });
    } finally {
      setSending(false);
    }
  }

  const totalUnread = overview.badges.unread;
  const incomingCount = overview.incoming.length;
  const questCount = quests.badges.invites + quests.badges.active;
  const tabCount: Record<Tab, number> = {
    friends: overview.friends.length,
    requests: incomingCount,
    quests: questCount,
    search: 0,
    messages: totalUnread,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8df5d0]">
            <Users size={11} /> Friends
          </div>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight sm:text-[28px]">Train together, not alone</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            Search identity-verified learners, compare levels, streaks and arena ratings, then plan strategies in a
            private real-time chat. Only accepted friends can message you. Stake credits on measurable friend quests —
            first to finish takes the pot.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-muted">
            <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-[#2fe3a0] shadow-[0_0_8px_#2fe3a0]" : "bg-[#ffc061] animate-pulse-soft")} />
            {connected ? "Live chat" : "Reconnecting"}
          </span>
          <button onClick={() => setTab("search")} className="btn btn-primary btn-sm">
            <UserPlus size={13} /> Find learners
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:max-w-2xl sm:grid-cols-4">
        {[
          { label: "Friends", value: overview.friends.length, icon: <Users size={13} />, tone: "text-[#8df5d0]" },
          { label: "Requests", value: incomingCount, icon: <Inbox size={13} />, tone: "text-[#b3a8ff]" },
          { label: "Quests", value: questCount, icon: <Swords size={13} />, tone: "text-[#7fdcff]" },
          { label: "Unread", value: totalUnread, icon: <MessageSquare size={13} />, tone: "text-[#ffd08d]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
            <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              {s.label} <span className={s.tone}>{s.icon}</span>
            </div>
            <div className={cn("num mt-1 text-[18px] font-semibold", s.tone)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
        {TABS.map((t) => {
          const active = tab === t.id;
          const count = tabCount[t.id];
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                active ? "bg-white/[0.08] text-ink shadow-sm" : "text-muted hover:text-ink"
              )}
            >
              <t.icon size={12} />
              {t.label}
              {count > 0 && (
                <span className={cn(
                  "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                  t.id === "requests" ? "bg-[#8b7bff] text-white" : "bg-[#2fe3a0] text-[#04120d]"
                )}>
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "friends" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {overview.friends.length === 0 ? (
            <Card className="sm:col-span-2 xl:col-span-3">
              <EmptyState
                icon={<Users size={18} />}
                title="No friends yet"
                body="Search for a verified learner and send a request. Once they accept, you can chat about strategy in real time."
                action={<button onClick={() => setTab("search")} className="btn btn-primary btn-sm"><Search size={13} /> Search learners</button>}
              />
            </Card>
          ) : (
            overview.friends.map((friend) => (
              <Card key={friend.id} hover className="cursor-pointer p-4" >
                <div className="flex items-start gap-3" onClick={() => void openProfile(friend.id)}>
                  <div className="relative">
                    <Avatar name={friend.name} size={42} />
                    {friend.unread > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2fe3a0] px-1 text-[9px] font-bold text-[#04120d]">
                        {friend.unread > 9 ? "9+" : friend.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-[13px] font-semibold">{friend.name}</div>
                      <Badge tone="green" className="!px-1.5 !py-0 !text-[8.5px]">Lv {friend.level}</Badge>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                      <span className="flex items-center gap-1"><Flame size={10} className="text-[#ffd08d]" /> {friend.streak}d streak</span>
                      <span>{modeName(friend.mode)}</span>
                    </div>
                    <div className="mt-2 line-clamp-1 text-[10.5px] text-muted/80">
                      {friend.lastMessage ?? "No messages yet — say hello."}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => openThread(friend.id)}
                    className="btn btn-ghost btn-sm flex-1 justify-center"
                  >
                    <MessageSquare size={12} /> {friend.unread > 0 ? `Chat · ${friend.unread} new` : "Chat"}
                  </button>
                  <button
                    onClick={() => void openProfile(friend.id)}
                    className="btn btn-ghost btn-sm justify-center"
                    title="View profile"
                  >
                    Profile
                  </button>
                </div>
                {friend.lastAt && (
                  <div className="mt-2 text-right text-[9px] text-muted/50">{timeAgo(friend.lastAt)}</div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="text-[12px] font-semibold">Incoming</div>
              <Badge tone="violet">{incomingCount}</Badge>
            </div>
            {overview.incoming.length === 0 ? (
              <EmptyState icon={<Inbox size={17} />} title="No pending requests" body="When someone asks to connect, it shows up here." />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {overview.incoming.map((req) => (
                  <RequestRow
                    key={req.id}
                    request={req}
                    busy={busy === `req:${req.id}`}
                    onProfile={() => void openProfile(req.id)}
                    onAccept={() => void respond(req.id, true, req.name)}
                    onDecline={() => void respond(req.id, false, req.name)}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="text-[12px] font-semibold">Sent requests</div>
              <Badge>{overview.outgoing.length}</Badge>
            </div>
            {overview.outgoing.length === 0 ? (
              <EmptyState icon={<UserPlus size={17} />} title="Nothing pending" body="Requests you send appear here until they are accepted." />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {overview.outgoing.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                    <button onClick={() => void openProfile(req.id)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <Avatar name={req.name} size={32} />
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold">{req.name}</div>
                          <div className="text-[9.5px] text-muted">Lv {req.level} · {req.streak}d streak · {timeAgo(req.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => void unfriend(req.id, req.name)}
                      disabled={busy === `remove:${req.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      {busy === `remove:${req.id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "quests" && (
        <div className="space-y-3">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
              <div>
                <div className="text-[12px] font-semibold">Challenge a friend</div>
                <div className="mt-0.5 max-w-xl text-[10px] leading-relaxed text-muted">
                  Pick a friend and a stake. The server rolls a random, measurable quest. First to finish takes both
                  stakes. If the deadline passes, both stakes are lost.
                </div>
              </div>
              <Badge tone="cyan"><Coins size={10} /> {quests.myCredits.toLocaleString("en-US")} credits</Badge>
            </div>
            {quests.friends.length === 0 ? (
              <EmptyState
                icon={<Swords size={17} />}
                title="Add a friend first"
                body="Friend quests only run between accepted friends. Send a request, then come back to stake credits."
                action={<button onClick={() => setTab("search")} className="btn btn-primary btn-sm"><Search size={13} /> Find learners</button>}
              />
            ) : (
              <div className="flex flex-wrap items-end gap-3 p-4">
                <label className="min-w-0">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">Friend</span>
                  <select
                    value={questFriendId}
                    onChange={(e) => setQuestFriendId(e.target.value ? Number(e.target.value) : "")}
                    className="input mt-1 block min-w-[210px]"
                  >
                    <option value="">Choose a friend</option>
                    {quests.friends.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} · {f.credits.toLocaleString("en-US")} credits
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">Stake</span>
                  <div className="mt-1 flex items-center gap-1 rounded-lg border border-white/[0.07] bg-black/20 p-1">
                    {[10, 25, 50].map((stake) => (
                      <button
                        key={stake}
                        onClick={() => setQuestStake(stake)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
                          questStake === stake ? "bg-white/[0.1] text-ink" : "text-muted hover:text-ink"
                        )}
                      >
                        {stake}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => void sendQuest()}
                  disabled={!questFriendId || questBusy === "invite"}
                  className="btn btn-primary btn-sm"
                >
                  {questBusy === "invite" ? <Loader2 size={13} className="animate-spin" /> : <Swords size={13} />} Send quest invite
                </button>
                <span className="text-[9.5px] text-muted/60">Winner takes {questStake * 2} credits.</span>
              </div>
            )}
          </Card>

          {quests.incoming.length > 0 && (
            <Card className="overflow-hidden border-[rgba(127,220,255,.2)]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="text-[12px] font-semibold">Incoming quest invites</div>
                <Badge tone="cyan">{quests.incoming.length}</Badge>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {quests.incoming.map((quest) => (
                  <div key={quest.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                    <Avatar name={quest.friendName} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold">
                        {quest.friendName} challenged you
                      </div>
                      <div className="mt-0.5 text-[11px] text-ink/85">{t(quest.title)}</div>
                      <div className="text-[10px] text-muted">{t(quest.description)}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone="cyan"><Coins size={9} /> {quest.stake} to accept</Badge>
                        <Badge tone="green"><Trophy size={9} /> Winner takes {quest.pot}</Badge>
                        <span className="text-[9.5px] text-muted/60">{timeAgo(quest.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => void respondQuestAction(quest, true)}
                        disabled={Boolean(questBusy)}
                        className="btn btn-primary btn-sm"
                      >
                        {questBusy === `accept:${quest.id}` ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Accept
                      </button>
                      <button
                        onClick={() => void respondQuestAction(quest, false)}
                        disabled={Boolean(questBusy)}
                        className="btn btn-ghost btn-sm"
                      >
                        <X size={12} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="text-[12px] font-semibold">Active quests</div>
              <Badge tone="green">{quests.active.length}</Badge>
            </div>
            {quests.active.length === 0 ? (
              <EmptyState
                icon={<Target size={17} />}
                title="No live quests"
                body="Start one above. Progress is measured from real trades, lessons, quizzes, arena wins and XP — never invented."
              />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {quests.active.map((quest) => (
                  <ActiveQuestRow key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </Card>

          {quests.outgoing.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="text-[12px] font-semibold">Waiting for a friend</div>
                <Badge tone="amber">{quests.outgoing.length}</Badge>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {quests.outgoing.map((quest) => (
                  <div key={quest.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar name={quest.friendName} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-semibold">{t(quest.title)}</div>
                      <div className="text-[9.5px] text-muted">
                        Sent to {quest.friendName} · {quest.stake} credits at stake · {timeAgo(quest.createdAt)}
                      </div>
                    </div>
                    <Badge tone="amber"><Clock size={9} /> Pending</Badge>
                    <button
                      onClick={() => void cancelQuestAction(quest)}
                      disabled={Boolean(questBusy)}
                      className="btn btn-ghost btn-sm"
                    >
                      {questBusy === `cancel:${quest.id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Cancel
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="text-[12px] font-semibold">Quest history</div>
              <Badge>{quests.history.length}</Badge>
            </div>
            {quests.history.length === 0 ? (
              <EmptyState icon={<Clock size={17} />} title="No finished quests yet" body="Wins, losses, declines and expired stakes all land here." />
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {quests.history.map((quest) => (
                  <QuestHistoryRow key={quest.id} quest={quest} />
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "search" && (
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.06] p-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search verified learners by name or email"
                className="input pl-9"
                autoFocus
              />
              {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
              <ShieldCheck size={11} className="text-[#5beeb9]" />
              Only identity-verified learners appear. Admins and unverified accounts are hidden.
            </div>
          </div>

          {!searchQuery.trim() ? (
            <EmptyState
              icon={<Search size={18} />}
              title="Find your study partner"
              body="Type a name or the email they signed up with. Results include their level, streak and region, never their private documents."
            />
          ) : searching && searchResults.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted"><Loader2 size={15} className="animate-spin" /> Searching verified learners…</div>
          ) : searchResults.length === 0 && searchTouched ? (
            <EmptyState icon={<UserX size={18} />} title="No learners found" body="Try a different spelling or the email address they used to register." />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {searchResults.map((result) => (
                <div key={result.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button onClick={() => void openProfile(result.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar name={result.name} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[12.5px] font-semibold">{result.name}</div>
                        <Badge tone="green" className="!px-1.5 !py-0 !text-[8.5px]">Lv {result.level}</Badge>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[9.5px] text-muted">
                        <span>{modeName(result.mode)}</span>
                        <span>·</span>
                        <span>{platformLabel(result.region)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Flame size={9} className="text-[#ffd08d]" /> {result.streak}d</span>
                      </div>
                    </div>
                  </button>
                  <RelationAction
                    relation={result.relation}
                    busy={busy === `add:${result.id}` || busy === `req:${result.id}`}
                    name={result.name}
                    onAdd={() => void addFriend(result.id, result.name)}
                    onAccept={() => void respond(result.id, true, result.name)}
                    onMessage={() => openThread(result.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "messages" && (
        <Card className="overflow-hidden">
          <div className="grid min-h-[540px] md:grid-cols-[290px_1fr]">
            <div className={cn("border-r border-white/[0.06]", activeFriend && "hidden md:block")}>
              <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] font-semibold">Conversations</div>
              {overview.friends.length === 0 ? (
                <EmptyState icon={<MessageSquare size={17} />} title="No conversations yet" body="Add a friend first, then plan strategies here." />
              ) : (
                <div className="divide-y divide-white/[0.04]">
                  {overview.friends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => openThread(friend.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]",
                        activeFriendId === friend.id && "bg-white/[0.04]"
                      )}
                    >
                      <Avatar name={friend.name} size={34} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[12px] font-semibold">{friend.name}</span>
                          <span className="ml-auto shrink-0 text-[9px] text-muted/60">{friend.lastAt ? timeAgo(friend.lastAt) : ""}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="line-clamp-1 flex-1 text-[10px] text-muted">
                            {friend.lastMessage ?? "Say hello"}
                          </span>
                          {friend.unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#2fe3a0] px-1 text-[9px] font-bold text-[#04120d]">
                              {friend.unread > 9 ? "9+" : friend.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={cn("flex min-h-[540px] flex-col", !activeFriend && "hidden md:flex")}>
              {!activeFriend ? (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyState
                    icon={<MessageSquare size={18} />}
                    title="Pick a conversation"
                    body="Your chat is private to you and the friend you accepted. Messages arrive instantly and are kept even if you later unfriend."
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5">
                    <button onClick={() => { setActiveFriendId(null); activeRef.current = null; }} className="rounded-lg p-1.5 text-muted hover:bg-white/5 md:hidden" aria-label="Back">
                      <ArrowLeft size={15} />
                    </button>
                    <button onClick={() => void openProfile(activeFriend.id)} className="flex min-w-0 items-center gap-2.5 text-left">
                      <Avatar name={activeFriend.name} size={32} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-semibold">{activeFriend.name}</span>
                          <Badge tone="green" className="!px-1.5 !py-0 !text-[8.5px]">Lv {activeFriend.level}</Badge>
                        </div>
                        <div className="text-[9.5px] text-muted">
                          {typingFrom === activeFriend.id ? (
                            <span className="text-[#8df5d0]">typing…</span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <span className="flex items-center gap-0.5"><Flame size={9} className="text-[#ffd08d]" /> {activeFriend.streak}d streak</span>
                              <span>·</span>
                              <span>{modeName(activeFriend.mode)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    <button onClick={() => void openProfile(activeFriend.id)} className="btn btn-ghost btn-sm ml-auto">
                      Profile
                    </button>
                  </div>

                  <div className="flex-1 space-y-2.5 overflow-y-auto bg-black/10 px-3 py-4">
                    {threadLoading ? (
                      <div className="flex h-full items-center justify-center gap-2 text-[12px] text-muted">
                        <Loader2 size={15} className="animate-spin" /> Loading conversation…
                      </div>
                    ) : thread.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <EmptyState
                          icon={<Sparkles size={17} />}
                          title="Start planning"
                          body={`Tell ${activeFriend.name} what you are studying, share a strategy, or compare arena tactics.`}
                        />
                      </div>
                    ) : (
                      thread.map((message) => {
                        const mine = message.senderId === me.id;
                        return (
                          <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                            <div className="max-w-[82%]">
                              <div
                                className={cn(
                                  "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[12px] leading-relaxed",
                                  mine
                                    ? "rounded-br-md bg-[rgba(47,227,160,.14)] text-[#eafff7] shadow-[inset_0_0_0_1px_rgba(47,227,160,.16)]"
                                    : "rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-ink"
                                )}
                              >
                                {message.body}
                              </div>
                              <div className={cn("mt-1 flex items-center gap-1.5 text-[9px] text-muted/60", mine ? "justify-end" : "justify-start")}>
                                <span>{new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                                {mine && <span>{message.readAt ? "· Read" : "· Sent"}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    {typingFrom === activeFriend.id && (
                      <div className="flex justify-start">
                        <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[11px] text-muted">
                          <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8df5d0]" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8df5d0]" style={{ animationDelay: "120ms" }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8df5d0]" style={{ animationDelay: "240ms" }} />
                          </span>
                        </div>
                      </div>
                    )}
                    <div ref={threadEndRef} />
                  </div>

                  <div className="border-t border-white/[0.06] p-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage();
                          }
                        }}
                        rows={1}
                        maxLength={2000}
                        placeholder={`Message ${activeFriend.name}…`}
                        className="input max-h-32 min-h-[40px] resize-none py-2.5"
                      />
                      <button
                        onClick={() => void sendMessage()}
                        disabled={!draft.trim() || sending}
                        className="btn btn-primary h-10 w-10 shrink-0 justify-center px-0"
                        aria-label="Send message"
                      >
                        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      </button>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted/50">
                      <span>Enter to send · Shift+Enter for a new line</span>
                      <span>{draft.length}/2000</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={profileId !== null}
        onClose={() => { setProfileId(null); setProfile(null); setConfirmRemove(false); }}
        title="Learner profile"
        subtitle="Verified learner card — no private documents or email addresses are shown."
        width={560}
      >
        {profileLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-muted">
            <Loader2 size={16} className="animate-spin" /> Loading profile…
          </div>
        ) : !profile ? (
          <EmptyState icon={<UserX size={18} />} title="Profile unavailable" body="This learner is not verified, is an admin, or no longer exists." />
        ) : (
          <div className="p-5">
            <div className="flex items-start gap-4">
              <Avatar name={profile.name} size={58} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[18px] font-semibold tracking-tight">{profile.name}</div>
                  <Badge tone="green">Level {profile.level}</Badge>
                  {profile.relation === "friends" && <Badge tone="violet"><UserCheck size={10} /> Friend</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-muted">
                  <span>{modeName(profile.mode)}</span>
                  <span>·</span>
                  <span>{platformLabel(profile.region)}</span>
                  <span>·</span>
                  <span>Joined {new Date(profile.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[9.5px] text-muted">
                    <span>{profile.xp.toLocaleString("en-US")} XP</span>
                    <span>Level {profile.level} → {profile.level + 1}</span>
                  </div>
                  <Progress value={profile.levelProgress * 100} tone="green" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: "Streak", value: `${profile.streak}d`, icon: <Flame size={12} />, tone: "text-[#ffd08d]" },
                { label: "Rating", value: profile.arena.rating, icon: <Target size={12} />, tone: "text-[#b3a8ff]" },
                { label: "Arena wins", value: profile.arena.wins, icon: <Trophy size={12} />, tone: "text-[#5beeb9]" },
                { label: "Matches", value: profile.arena.matches, icon: <Swords size={12} />, tone: "text-[#7fdcff]" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                    {s.label} <span className={s.tone}>{s.icon}</span>
                  </div>
                  <div className={cn("num mt-1 text-[16px] font-semibold", s.tone)}>{s.value}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted">
              <Badge tone="cyan"><Zap size={10} /> {profile.credits.toLocaleString("en-US")} credits</Badge>
              <Badge><Clock size={10} /> Best arena streak {profile.arena.bestStreak}</Badge>
              <Badge><ShieldCheck size={10} /> Identity verified</Badge>
            </div>

            {profile.id !== me.id && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                {profile.relation === "friends" ? (
                  <>
                    <button onClick={() => { openThread(profile.id); setProfileId(null); }} className="btn btn-primary btn-sm">
                      <MessageSquare size={13} /> Open chat
                    </button>
                    {confirmRemove ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void unfriend(profile.id, profile.name)}
                          disabled={busy === `remove:${profile.id}`}
                          className="btn btn-sm border border-[rgba(255,93,122,.3)] bg-[rgba(255,93,122,.1)] text-[#ff8fa3]"
                        >
                          {busy === `remove:${profile.id}` ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />} Yes, remove
                        </button>
                        <button onClick={() => setConfirmRemove(false)} className="btn btn-ghost btn-sm">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmRemove(true)} className="btn btn-ghost btn-sm text-[#ff8fa3]">
                        <UserX size={12} /> Remove friend
                      </button>
                    )}
                  </>
                ) : profile.relation === "incoming" ? (
                  <>
                    <button
                      onClick={() => void respond(profile.id, true, profile.name)}
                      disabled={busy === `req:${profile.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      {busy === `req:${profile.id}` ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />} Accept request
                    </button>
                    <button onClick={() => void respond(profile.id, false, profile.name)} className="btn btn-ghost btn-sm">
                      <X size={13} /> Decline
                    </button>
                  </>
                ) : profile.relation === "outgoing" ? (
                  <button disabled className="btn btn-ghost btn-sm opacity-70">
                    <Clock size={13} /> Request pending
                  </button>
                ) : (
                  <button
                    onClick={() => void addFriend(profile.id, profile.name)}
                    disabled={busy === `add:${profile.id}`}
                    className="btn btn-primary btn-sm"
                  >
                    {busy === `add:${profile.id}` ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={13} />} Add friend
                  </button>
                )}
                <span className="text-[9.5px] text-muted/60">
                  Messages are private and only possible between accepted friends.
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function RelationAction({
  relation,
  busy,
  name,
  onAdd,
  onAccept,
  onMessage,
}: {
  relation: FriendSearchResult["relation"];
  busy: boolean;
  name: string;
  onAdd: () => void;
  onAccept: () => void;
  onMessage: () => void;
}) {
  if (relation === "friends") {
    return <button onClick={onMessage} className="btn btn-ghost btn-sm"><MessageSquare size={12} /> Message</button>;
  }
  if (relation === "outgoing") {
    return <button disabled className="btn btn-ghost btn-sm opacity-70"><Clock size={12} /> Request sent</button>;
  }
  if (relation === "incoming") {
    return (
      <button onClick={onAccept} disabled={busy} className="btn btn-primary btn-sm">
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Accept {name.split(" ")[0]}
      </button>
    );
  }
  return (
    <button onClick={onAdd} disabled={busy} className="btn btn-primary btn-sm">
      {busy ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />} Add friend
    </button>
  );
}

function timeLeft(endsAt: number | null) {
  if (!endsAt) return "No deadline";
  const ms = endsAt - Date.now();
  if (ms <= 0) return "Ending now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m left`;
}

function ActiveQuestRow({ quest }: { quest: QuestCard }) {
  const { t } = useLang();
  const pct = (value: number) => Math.min(100, (value / Math.max(1, quest.target)) * 100);
  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold">{t(quest.title)}</span>
            <Badge tone="green"><Coins size={9} /> {quest.stake} staked</Badge>
            <Badge tone="cyan"><Trophy size={9} /> Pot {quest.pot}</Badge>
          </div>
          <div className="mt-0.5 text-[10.5px] text-muted">{t(quest.description)}</div>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-[#ffd08d]">
          <Timer size={11} /> {timeLeft(quest.endsAt)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-[#8df5d0]">You</span>
            <span className="num text-muted">{Math.min(quest.myProgress, quest.target)} / {quest.target}</span>
          </div>
          <Progress value={pct(quest.myProgress)} tone="green" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px]">
            <span className="truncate font-semibold text-[#b3a8ff]">{quest.friendName}</span>
            <span className="num text-muted">{Math.min(quest.friendProgress, quest.target)} / {quest.target}</span>
          </div>
          <Progress value={pct(quest.friendProgress)} tone="violet" />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[9.5px] text-muted/60">
        <span className="flex items-center gap-1"><Swords size={9} /> vs {quest.friendName}</span>
        <span>·</span>
        <span>Started {timeAgo(quest.acceptedAt ?? quest.createdAt)}</span>
        <span>·</span>
        <span>First to finish takes the whole pot.</span>
      </div>
    </div>
  );
}

function QuestHistoryRow({ quest }: { quest: QuestCard }) {
  const { t } = useLang();
  const won = quest.status === "won" && quest.iWon;
  const lost = quest.status === "won" && !quest.iWon;
  const tone = won ? "green" : lost ? "red" : quest.status === "expired" ? "amber" : "neutral";
  const label = won
    ? `${t("Won")} +${quest.pot}`
    : lost
      ? `${t("Lost")} ${quest.stake}`
      : quest.status === "expired"
        ? `${t("Stake lost")} ${quest.stake}`
        : quest.status === "declined"
          ? t("Declined")
          : t("Cancelled");

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar name={quest.friendName} size={32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-semibold">{t(quest.title)}</div>
        <div className="text-[9.5px] text-muted">
          {quest.role === "host" ? "You challenged" : "Challenged by"} {quest.friendName} · {quest.stake} stake
          {quest.endedAt ? ` · ${timeAgo(quest.endedAt)}` : ""}
        </div>
      </div>
      <Badge tone={tone as "green" | "red" | "amber" | "neutral"}>{tone === "green" ? <Trophy size={9} /> : tone === "red" ? <X size={9} /> : <Clock size={9} />} {label}</Badge>
    </div>
  );
}

function RequestRow({
  request,
  busy,
  onProfile,
  onAccept,
  onDecline,
}: {
  request: FriendRequestCard;
  busy: boolean;
  onProfile: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <button onClick={onProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar name={request.name} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-[12.5px] font-semibold">{request.name}</div>
            <Badge tone="violet" className="!px-1.5 !py-0 !text-[8.5px]">Lv {request.level}</Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[9.5px] text-muted">
            <span>{modeName(request.mode)}</span>
            <span>·</span>
            <span>{platformLabel(request.region)}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5"><Flame size={9} className="text-[#ffd08d]" /> {request.streak}d</span>
            <span>·</span>
            <span>{timeAgo(request.createdAt)}</span>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-1.5">
        <button onClick={onAccept} disabled={busy} className="btn btn-primary btn-sm">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Accept
        </button>
        <button onClick={onDecline} disabled={busy} className="btn btn-ghost btn-sm">
          <X size={12} /> Decline
        </button>
      </div>
    </div>
  );
}
