import type { Principal } from "@icp-sdk/core/principal";
import type {
  ChatMessage,
  FileReference,
  Frame,
  Game,
  Invitation,
  JoinRequest,
  PaymentTransaction,
  Player,
  PriceFeed,
  Team,
  TokenPool,
  TokenTransaction,
  UserProfile,
  UserRole,
  Wallet,
} from "./index";

/**
 * Full backend interface with all methods exposed by the backend canister.
 * Used to type-cast the actor returned by useActor().
 */
export interface backendInterface {
  // Games
  getAllGames(offset: bigint, limit: bigint): Promise<Game[]>;
  getGame(gameId: bigint): Promise<Game | null>;
  saveGame(
    players: Player[],
    frames: Frame[][],
    totalScores: bigint[],
  ): Promise<bigint>;
  // Player stats
  getAllPlayerStats(offset: bigint, limit: bigint): Promise<Player[]>;
  getPlayerStats(playerName: string): Promise<Player | null>;
  getLeaderboard(offset: bigint, limit: bigint): Promise<Player[]>;
  // User profiles
  getCallerUserProfile(): Promise<UserProfile | null>;
  getUserProfile(principal: Principal): Promise<UserProfile | null>;
  getAllUserProfiles(offset: bigint, limit: bigint): Promise<UserProfile[]>;
  saveCallerUserProfile(profile: UserProfile): Promise<void>;
  updateCallerUserProfileStats(
    totalSpares: bigint,
    totalStrikes: bigint,
    totalPoints: bigint,
    highestScore: bigint,
    gamesPlayed: bigint,
  ): Promise<void>;
  updateCallerAchievements(achievements: string[]): Promise<void>;
  updateCallerProfilePicture(picturePath: string): Promise<void>;
  // Chat
  getMessages(gameId: bigint, offset: bigint, limit: bigint): Promise<ChatMessage[]>;
  sendMessage(message: string, gameId: bigint): Promise<void>;
  // Teams
  getAllTeams(offset: bigint, limit: bigint): Promise<Team[]>;
  getTeam(teamId: bigint): Promise<Team | null>;
  createTeam(name: string, description: string): Promise<bigint>;
  leaveTeam(teamId: bigint): Promise<void>;
  requestToJoinTeam(teamId: bigint): Promise<void>;
  approveJoinRequest(teamId: bigint, requester: Principal): Promise<void>;
  denyJoinRequest(teamId: bigint, requester: Principal): Promise<void>;
  getJoinRequests(offset: bigint, limit: bigint): Promise<JoinRequest[]>;
  inviteToTeam(teamId: bigint, invitee: Principal): Promise<void>;
  acceptInvitation(teamId: bigint): Promise<void>;
  declineInvitation(teamId: bigint): Promise<void>;
  getInvitations(offset: bigint, limit: bigint): Promise<Invitation[]>;
  // Access control
  initializeAccessControl(): Promise<void>;
  /**
   * Called after Internet Identity login. First caller becomes admin;
   * subsequent callers receive the user role.
   */
  loginUser(): Promise<{ ok: null } | { err: string }>;
  isCallerAdmin(): Promise<boolean>;
  getCallerUserRole(): Promise<UserRole>;
  assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
  // Token system
  getUserBalance(principal: Principal): Promise<bigint>;
  getTokenTransactions(): Promise<TokenTransaction[]>;
  getTokenPools(): Promise<TokenPool[]>;
  transferFromPoolToUser(
    poolName: string,
    recipient: string,
    amount: bigint,
  ): Promise<{ ok: null } | { err: string }>;
  transferTokensBetweenPools(
    sourcePool: string,
    destinationPool: string,
    amount: bigint,
  ): Promise<{ ok: null } | { err: string }>;
  adjustPoolAllocation(
    poolName: string,
    newTotal: bigint,
  ): Promise<{ ok: null } | { err: string }>;
  getPoolManagementHistory(): Promise<
    { ok: TokenTransaction[] } | { err: string }
  >;
  // Price feeds
  fetchIcpPrice(source: string): Promise<string>;
  updatePriceFeed(source: string, price: bigint, status: string): Promise<void>;
  getPriceFeeds(): Promise<PriceFeed[]>;
  // Payment & minting
  getPaymentTransactions(): Promise<PaymentTransaction[]>;
  verifyIcpPayment(
    accountId: string,
  ): Promise<{ ok: bigint } | { err: string }>;
  mintStkTokens(
    icpAmount: bigint,
    stkAmount: bigint,
    exchangeRate: bigint,
    icpBlockHeight: bigint,
  ): Promise<{ ok: null } | { err: string }>;
  recordIcpSend(
    recipientAccountId: string,
    amount: bigint,
    blockHeight: bigint,
  ): Promise<{ ok: null } | { err: string }>;
  // Wallet
  getCallerWallet(): Promise<Wallet | null>;
  getCallerDerivedAccountId(): Promise<string>;
  getCallerIcpBalance(
    accountId: string,
  ): Promise<{ ok: bigint } | { err: string }>;
  initializeWallet(
    icpAccountId: string,
    stkPrincipalId: string,
  ): Promise<{ ok: null } | { err: string }>;
  sendIcpTokens(
    recipient: string,
    amount: bigint,
    toAccountId: string,
  ): Promise<{ ok: bigint } | { err: string }>;
  sendStkTokens(
    recipient: string,
    amount: bigint,
  ): Promise<{ ok: null } | { err: string }>;
  // Ledger configuration
  setLedgerPrincipal(p: Principal): Promise<{ ok: null } | { err: string }>;
  // Admin ICP wallet (minting payment destination)
  getAdminIcpWallet(): Promise<string | null>;
  setAdminIcpWallet(address: string): Promise<{ ok: null } | { err: string }>;
  // Object storage
  registerFileReference(path: string, hash: string): Promise<void>;
  listFileReferences(): Promise<FileReference[]>;
  getFileReference(path: string): Promise<FileReference>;
  dropFileReference(path: string): Promise<void>;
  // Token supply
  getTotalSupply(): Promise<bigint>;
  getCirculatingSupply(): Promise<bigint>;
}
