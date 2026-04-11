import type { Principal } from "@icp-sdk/core/principal";

// ─── Domain Types ──────────────────────────────────────────────────────────────

export interface Frame {
  roll1: bigint;
  roll2: bigint;
  roll3?: bigint;
}

export interface Player {
  name: string;
  totalStrikes: bigint;
  totalSpares: bigint;
  totalPoints: bigint;
  highestScore: bigint;
  gamesPlayed: bigint;
  averageScore?: bigint;
  scores?: bigint[];
}

export interface Game {
  id: bigint;
  players: Player[];
  frames: Frame[][];
  totalScores: bigint[];
  owner?: Principal | null;
  timestamp: bigint;
}

export interface ChatMessage {
  id: bigint;
  sender: string;
  message: string;
  gameId: bigint;
  timestamp: bigint;
}

export interface UserProfile {
  principal: Principal;
  displayName: string;
  profilePicture: string | undefined;
  totalStrikes: bigint;
  totalSpares: bigint;
  totalPoints: bigint;
  highestScore: bigint;
  averageScore: bigint;
  games: bigint[];
  achievements: string[];
  gamesPlayed: bigint;
}

export interface Team {
  id: bigint;
  name: string;
  description: string;
  owner: Principal;
  creator: Principal;
  members: Principal[];
  createdAt: bigint;
  averageScore?: bigint;
  bestScore?: bigint;
  totalGames?: bigint;
}

export interface JoinRequest {
  teamId: bigint;
  requester: Principal;
  timestamp: bigint;
}

export interface Invitation {
  teamId: bigint;
  invitee: Principal;
  inviter?: Principal;
  timestamp: bigint;
}

export interface TokenTransaction {
  id: bigint;
  from?: Principal | null;
  to?: Principal | null;
  amount: bigint;
  timestamp: bigint;
  transactionType: string;
  pool?: string | null;
  status: string;
  reference?: string | null;
  ledgerHeight?: bigint | null;
}

export interface PaymentTransaction {
  id: bigint;
  user: Principal;
  icpAmount: bigint;
  stkAmount: bigint;
  exchangeRate: bigint;
  timestamp: bigint;
  status: string;
  reference?: string | null;
}

export interface PriceFeed {
  source: string;
  /** ICP price in USD cents (e.g. 1000 = $10.00). Matches backend field icpUsd. */
  icpUsd: bigint;
  lastUpdated: bigint;
  status: string;
}

export interface TokenPool {
  name: string;
  total: bigint;
  remaining: bigint;
  /** Optional — not always returned by backend but used in admin UI calculations */
  allocated?: bigint;
  distributed?: bigint;
  description?: string;
}

export interface Wallet {
  stkBalance: bigint;
  icpTransactions: TokenTransaction[];
  stkTransactions: TokenTransaction[];
  icpAccountId: string;
  stkPrincipalId: string;
}

export interface FileReference {
  path: string;
  hash: string;
}

export enum UserRole {
  admin = "admin",
  user = "user",
  guest = "guest",
}
