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
