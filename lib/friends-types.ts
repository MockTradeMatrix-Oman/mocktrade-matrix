/**
 * Shared shapes for the friends + direct-message feature.
 *
 * Kept in its own module so client components can import the types without
 * pulling in the server-only database code.
 */

export type FriendRelation = "none" | "friends" | "incoming" | "outgoing";

export type FriendCard = {
  /** User id of the friend (not the friends table row). */
  id: number;
  name: string;
  mode: string;
  region: string;
  arenaRegion: string;
  xp: number;
  level: number;
  streak: number;
  credits: number;
  lastMessage: string | null;
  lastAt: number | null;
  unread: number;
};

export type FriendRequestCard = {
  id: number;
  name: string;
  mode: string;
  region: string;
  arenaRegion: string;
  xp: number;
  level: number;
  streak: number;
  createdAt: number;
};

export type FriendBadges = {
  /** Incoming pending requests. */
  requests: number;
  /** Unread direct messages. */
  unread: number;
};

export type FriendArenaStats = {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  rating: number;
  bestStreak: number;
};

export type FriendProfile = {
  id: number;
  name: string;
  mode: string;
  region: string;
  arenaRegion: string;
  xp: number;
  level: number;
  levelFloor: number;
  levelCeil: number;
  levelProgress: number;
  streak: number;
  credits: number;
  joinedAt: number;
  relation: FriendRelation;
  arena: FriendArenaStats;
};

export type FriendSearchResult = {
  id: number;
  name: string;
  mode: string;
  region: string;
  arenaRegion: string;
  xp: number;
  level: number;
  streak: number;
  relation: FriendRelation;
};

export type DirectMessage = {
  id: number;
  senderId: number;
  recipientId: number;
  body: string;
  readAt: number | null;
  createdAt: number;
};

export type FriendsOverview = {
  friends: FriendCard[];
  incoming: FriendRequestCard[];
  outgoing: FriendRequestCard[];
  badges: FriendBadges;
};

/* ------------------------------------------------------------------ */
/* friend quests                                                       */
/* ------------------------------------------------------------------ */

export type QuestMetric = "trades" | "lessons" | "quiz" | "arena_wins" | "xp";

export type QuestStatus =
  | "pending"
  | "active"
  | "won"
  | "expired"
  | "declined"
  | "cancelled";

export type QuestCard = {
  id: number;
  role: "host" | "guest";
  friendId: number;
  friendName: string;
  stake: number;
  /** Winner's payout: both stakes combined. */
  pot: number;
  status: QuestStatus;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  myProgress: number;
  friendProgress: number;
  endsAt: number | null;
  createdAt: number;
  acceptedAt: number | null;
  endedAt: number | null;
  winnerId: number | null;
  /** True when the viewer won a finished quest. */
  iWon: boolean;
};

export type QuestBadges = {
  /** Pending invites waiting for the viewer to accept. */
  invites: number;
  /** Quests the viewer is currently competing in. */
  active: number;
};

export type QuestsOverview = {
  incoming: QuestCard[];
  outgoing: QuestCard[];
  active: QuestCard[];
  history: QuestCard[];
  badges: QuestBadges;
  friends: Array<{ id: number; name: string; credits: number }>;
  myCredits: number;
};
