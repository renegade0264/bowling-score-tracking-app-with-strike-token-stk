import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Player {
    gamesPlayed: bigint;
    scores: Array<bigint>;
    name: string;
    highestScore: bigint;
    totalSpares: bigint;
    totalStrikes: bigint;
    totalPoints: bigint;
    averageScore: bigint;
}
export interface JoinRequest {
    requester: Principal;
    timestamp: bigint;
    teamId: bigint;
}
export interface Game {
    id: bigint;
    totalScores: Array<bigint>;
    owner?: Principal;
    players: Array<Player>;
    timestamp: bigint;
    frames: Array<Array<Frame>>;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TokenTransaction {
    id: bigint;
    to?: Principal;
    status: string;
    transactionType: string;
    from?: Principal;
    pool?: string;
    reference?: string;
    timestamp: bigint;
    amount: bigint;
    ledgerHeight?: bigint;
}
export interface Invitation {
    invitee: Principal;
    inviter: Principal;
    timestamp: bigint;
    teamId: bigint;
}
export interface TokenPool {
    total: bigint;
    name: string;
    remaining: bigint;
}
export interface PaymentTransaction {
    id: bigint;
    status: string;
    stkAmount: bigint;
    user: Principal;
    reference?: string;
    exchangeRate: bigint;
    timestamp: bigint;
    icpAmount: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Frame {
    score: bigint;
    roll1: bigint;
    roll2: bigint;
    roll3?: bigint;
}
export interface Wallet {
    stkPrincipalId: string;
    icpTransactions: Array<TokenTransaction>;
    icpAccountId: string;
    stkBalance: bigint;
    stkTransactions: Array<TokenTransaction>;
}
export interface PriceFeed {
    status: string;
    source: string;
    icpUsd: bigint;
    lastUpdated: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface ChatMessage {
    gameId: bigint;
    sender: string;
    message: string;
    timestamp: bigint;
}
export interface FileReference {
    hash: string;
    path: string;
}
export interface UserProfile {
    principal: Principal;
    displayName: string;
    gamesPlayed: bigint;
    highestScore: bigint;
    totalSpares: bigint;
    achievements: Array<string>;
    games: Array<bigint>;
    totalStrikes: bigint;
    totalPoints: bigint;
    profilePicture?: string;
    averageScore: bigint;
}
export interface Team {
    id: bigint;
    creator: Principal;
    members: Array<Principal>;
    name: string;
    createdAt: bigint;
    description: string;
    bestScore: bigint;
    totalGames: bigint;
    averageScore: bigint;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptInvitation(teamId: bigint): Promise<void>;
    addIcpTransaction(transaction: TokenTransaction): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    addStkTransaction(transaction: TokenTransaction): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    adjustPoolAllocation(poolName: string, newTotal: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    approveJoinRequest(teamId: bigint, requester: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createTeam(name: string, description: string): Promise<bigint>;
    creditUserWallet(user: Principal, stkAmount: bigint): Promise<void>;
    declineInvitation(teamId: bigint): Promise<void>;
    denyJoinRequest(teamId: bigint, requester: Principal): Promise<void>;
    dropFileReference(path: string): Promise<void>;
    fetchIcpPrice(source: string): Promise<string>;
    getAdminAuditTrail(): Promise<{
        __kind__: "ok";
        ok: Array<TokenTransaction>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getAdminIcpWallet(): Promise<string | null>;
    getAdminTreasuryAddress(): Promise<string | null>;
    getAllGames(): Promise<Array<Game>>;
    getAllMessages(): Promise<Array<ChatMessage>>;
    getAllPlayerStats(): Promise<Array<Player>>;
    getAllTeams(): Promise<Array<Team>>;
    getAllUserProfiles(): Promise<Array<UserProfile>>;
    getCallerAccountIds(): Promise<[string, string]>;
    getCallerAddresses(): Promise<[string, string]>;
    getCallerDerivedAccountId(): Promise<string>;
    getCallerIcpBalance(accountIdText: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getCallerIcpTransactions(): Promise<Array<TokenTransaction>>;
    getCallerPrincipalId(): Promise<string>;
    getCallerStkBalance(): Promise<bigint>;
    getCallerStkTransactions(): Promise<Array<TokenTransaction>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCallerWallet(): Promise<Wallet | null>;
    getCallerWalletSummary(): Promise<[bigint, Array<TokenTransaction>, Array<TokenTransaction>, string, string]>;
    getFileReference(path: string): Promise<FileReference | null>;
    getGame(gameId: bigint): Promise<Game | null>;
    getInvitations(): Promise<Array<Invitation>>;
    getJoinRequests(): Promise<Array<JoinRequest>>;
    getLeaderboard(): Promise<Array<Player>>;
    getLedgerPrincipal(): Promise<{
        __kind__: "ok";
        ok: Principal;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getMessages(gameId: bigint): Promise<Array<ChatMessage>>;
    getPaymentTransaction(id: bigint): Promise<PaymentTransaction | null>;
    getPaymentTransactions(): Promise<Array<PaymentTransaction>>;
    getPlayerStats(playerName: string): Promise<Player | null>;
    getPoolManagementHistory(): Promise<{
        __kind__: "ok";
        ok: Array<TokenTransaction>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getPriceFeed(source: string): Promise<PriceFeed | null>;
    getPriceFeeds(): Promise<Array<PriceFeed>>;
    getRealTimePoolBalances(): Promise<{
        __kind__: "ok";
        ok: Array<TokenPool>;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getTeam(teamId: bigint): Promise<Team | null>;
    getTokenPool(name: string): Promise<TokenPool | null>;
    getTokenPools(): Promise<Array<TokenPool>>;
    getTokenTransaction(id: bigint): Promise<TokenTransaction | null>;
    getTokenTransactions(): Promise<Array<TokenTransaction>>;
    getCirculatingSupply(): Promise<bigint>;
    getTotalSupply(): Promise<bigint>;
    getTotalSupplyStatus(): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getUserBalance(user: Principal): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWallet(user: Principal): Promise<Wallet | null>;
    initializeAccessControl(): Promise<void>;
    initializeWallet(_icpAccountId: string, stkPrincipalId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    inviteToTeam(teamId: bigint, invitee: Principal): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    leaveTeam(teamId: bigint): Promise<void>;
    listFileReferences(): Promise<Array<FileReference>>;
    loginUser(): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    mintStkTokens(icpAmount: bigint, stkAmount: bigint, exchangeRate: bigint, icpBlockHeight: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    receiveStkTokens(amount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recomputeMyAccountId(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordIcpSend(recipientAccountId: string, amount: bigint, blockHeight: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordPaymentTransaction(user: Principal, icpAmount: bigint, exchangeRate: bigint, status: string, reference: string | null): Promise<bigint>;
    recordTokenTransaction(from: Principal | null, to: Principal | null, amount: bigint, transactionType: string, pool: string | null, status: string, reference: string | null): Promise<bigint>;
    registerFileReference(path: string, hash: string): Promise<void>;
    requestToJoinTeam(teamId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveGame(players: Array<Player>, frames: Array<Array<Frame>>, totalScores: Array<bigint>, owner: Principal | null): Promise<bigint>;
    sendMessage(sender: string, message: string, gameId: bigint): Promise<void>;
    sendStkTokens(recipient: string, amount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setAdminIcpWallet(address: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setAdminTreasuryAccount(accountId: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    setLedgerPrincipal(p: Principal): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    transferFromPoolToUser(poolName: string, recipient: string, amount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    transferTokensBetweenPools(sourcePool: string, destinationPool: string, amount: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCallerAchievements(achievements: Array<string>): Promise<void>;
    updateCallerProfilePicture(picturePath: string): Promise<void>;
    updateCallerUserProfileStats(totalSpares: bigint, totalStrikes: bigint, totalPoints: bigint, highestScore: bigint, gamesPlayed: bigint): Promise<void>;
    updatePlayerStats(name: string, totalSpares: bigint, totalStrikes: bigint, totalPoints: bigint, highestScore: bigint, gamesPlayed: bigint): Promise<void>;
    updatePriceFeed(source: string, icpUsd: bigint, status: string): Promise<void>;
    updateTeamStats(teamId: bigint, averageScore: bigint, totalGames: bigint, bestScore: bigint): Promise<void>;
    updateTokenPool(name: string, remaining: bigint): Promise<void>;
    updateTotalSupply(amount: bigint): Promise<void>;
    updateUserBalance(user: Principal, amount: bigint): Promise<void>;
    verifyIcpPayment(accountIdText: string): Promise<{
        __kind__: "ok";
        ok: bigint;
    } | {
        __kind__: "err";
        err: string;
    }>;
}
