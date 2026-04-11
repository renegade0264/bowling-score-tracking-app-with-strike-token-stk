import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface ChatMessage {
  'gameId' : bigint,
  'sender' : string,
  'message' : string,
  'timestamp' : bigint,
}
export interface FileReference { 'hash' : string, 'path' : string }
export interface Frame {
  'score' : bigint,
  'roll1' : bigint,
  'roll2' : bigint,
  'roll3' : [] | [bigint],
}
export interface Game {
  'id' : bigint,
  'totalScores' : Array<bigint>,
  'owner' : [] | [Principal],
  'players' : Array<Player>,
  'timestamp' : bigint,
  'frames' : Array<Array<Frame>>,
}
export interface Invitation {
  'invitee' : Principal,
  'inviter' : Principal,
  'timestamp' : bigint,
  'teamId' : bigint,
}
export interface JoinRequest {
  'requester' : Principal,
  'timestamp' : bigint,
  'teamId' : bigint,
}
export interface PaymentTransaction {
  'id' : bigint,
  'status' : string,
  'stkAmount' : bigint,
  'user' : Principal,
  'reference' : [] | [string],
  'exchangeRate' : bigint,
  'timestamp' : bigint,
  'icpAmount' : bigint,
}
export interface Player {
  'gamesPlayed' : bigint,
  'scores' : Array<bigint>,
  'name' : string,
  'highestScore' : bigint,
  'totalSpares' : bigint,
  'totalStrikes' : bigint,
  'totalPoints' : bigint,
  'averageScore' : bigint,
}
export interface PriceFeed {
  'status' : string,
  'source' : string,
  'icpUsd' : bigint,
  'lastUpdated' : bigint,
}
export interface Team {
  'id' : bigint,
  'creator' : Principal,
  'members' : Array<Principal>,
  'name' : string,
  'createdAt' : bigint,
  'description' : string,
  'bestScore' : bigint,
  'totalGames' : bigint,
  'averageScore' : bigint,
}
export interface TokenPool {
  'total' : bigint,
  'name' : string,
  'remaining' : bigint,
}
export interface TokenTransaction {
  'id' : bigint,
  'to' : [] | [Principal],
  'status' : string,
  'transactionType' : string,
  'from' : [] | [Principal],
  'pool' : [] | [string],
  'reference' : [] | [string],
  'timestamp' : bigint,
  'amount' : bigint,
}
export interface TransformationInput {
  'context' : Uint8Array | number[],
  'response' : http_request_result,
}
export interface TransformationOutput {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<http_header>,
}
export interface UserProfile {
  'principal' : Principal,
  'displayName' : string,
  'gamesPlayed' : bigint,
  'highestScore' : bigint,
  'totalSpares' : bigint,
  'achievements' : Array<string>,
  'games' : Array<bigint>,
  'totalStrikes' : bigint,
  'totalPoints' : bigint,
  'profilePicture' : [] | [string],
  'averageScore' : bigint,
}
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface Wallet {
  'stkAccountId' : string,
  'stkAddress' : string,
  'icpBalance' : bigint,
  'icpTransactions' : Array<TokenTransaction>,
  'icpAccountId' : string,
  'stkBalance' : bigint,
  'stkTransactions' : Array<TokenTransaction>,
  'icpAddress' : string,
  'principalId' : string,
}
export interface http_header { 'value' : string, 'name' : string }
export interface http_request_result {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<http_header>,
}
export interface _SERVICE {
  'acceptInvitation' : ActorMethod<[bigint, Principal], undefined>,
  'addIcpTransaction' : ActorMethod<[TokenTransaction], undefined>,
  'addStkTransaction' : ActorMethod<[TokenTransaction], undefined>,
  'adjustPoolAllocation' : ActorMethod<[string, bigint], undefined>,
  'approveJoinRequest' : ActorMethod<[bigint, Principal, Principal], undefined>,
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'createTeam' : ActorMethod<[string, string, Principal], bigint>,
  'declineInvitation' : ActorMethod<[bigint, Principal], undefined>,
  'denyJoinRequest' : ActorMethod<[bigint, Principal, Principal], undefined>,
  'dropFileReference' : ActorMethod<[string], undefined>,
  'fetchIcpPrice' : ActorMethod<[], string>,
  'fetchIcpPriceFromBinance' : ActorMethod<[], string>,
  'fetchIcpPriceFromBitfinex' : ActorMethod<[], string>,
  'fetchIcpPriceFromBitflyer' : ActorMethod<[], string>,
  'fetchIcpPriceFromBitget' : ActorMethod<[], string>,
  'fetchIcpPriceFromBithumb' : ActorMethod<[], string>,
  'fetchIcpPriceFromBitmart' : ActorMethod<[], string>,
  'fetchIcpPriceFromBitstamp' : ActorMethod<[], string>,
  'fetchIcpPriceFromBittrex' : ActorMethod<[], string>,
  'fetchIcpPriceFromBybit' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinMarketCap' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbase' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseAdvanced' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseCard' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseCommerce' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseCustody' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseEarn' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseInstitutional' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseLearn' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbasePrime' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbasePrimeApi' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbasePro' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseProApi' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinbaseWallet' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoincheck' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinlist' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinone' : ActorMethod<[], string>,
  'fetchIcpPriceFromCoinoneUsd' : ActorMethod<[], string>,
  'fetchIcpPriceFromGateIo' : ActorMethod<[], string>,
  'fetchIcpPriceFromGemini' : ActorMethod<[], string>,
  'fetchIcpPriceFromHuobi' : ActorMethod<[], string>,
  'fetchIcpPriceFromKraken' : ActorMethod<[], string>,
  'fetchIcpPriceFromKuCoin' : ActorMethod<[], string>,
  'fetchIcpPriceFromLiquid' : ActorMethod<[], string>,
  'fetchIcpPriceFromMexc' : ActorMethod<[], string>,
  'fetchIcpPriceFromOkx' : ActorMethod<[], string>,
  'fetchIcpPriceFromPhemex' : ActorMethod<[], string>,
  'fetchIcpPriceFromPoloniex' : ActorMethod<[], string>,
  'fetchIcpPriceFromProbit' : ActorMethod<[], string>,
  'fetchIcpPriceFromUpbit' : ActorMethod<[], string>,
  'getAdminAuditTrail' : ActorMethod<[], Array<TokenTransaction>>,
  'getAllGames' : ActorMethod<[], Array<Game>>,
  'getAllMessages' : ActorMethod<[], Array<ChatMessage>>,
  'getAllPlayerStats' : ActorMethod<[], Array<Player>>,
  'getAllTeams' : ActorMethod<[], Array<Team>>,
  'getAllUserProfiles' : ActorMethod<[], Array<UserProfile>>,
  'getCallerAccountIds' : ActorMethod<[], [string, string]>,
  'getCallerAddresses' : ActorMethod<[], [string, string]>,
  'getCallerIcpBalance' : ActorMethod<[], bigint>,
  'getCallerIcpTransactions' : ActorMethod<[], Array<TokenTransaction>>,
  'getCallerPrincipalId' : ActorMethod<[], string>,
  'getCallerStkBalance' : ActorMethod<[], bigint>,
  'getCallerStkTransactions' : ActorMethod<[], Array<TokenTransaction>>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getCallerWallet' : ActorMethod<[], [] | [Wallet]>,
  'getCallerWalletSummary' : ActorMethod<
    [],
    [
      bigint,
      bigint,
      Array<TokenTransaction>,
      Array<TokenTransaction>,
      string,
      string,
      string,
      string,
      string,
    ]
  >,
  'getFileReference' : ActorMethod<[string], FileReference>,
  'getGame' : ActorMethod<[bigint], [] | [Game]>,
  'getInvitations' : ActorMethod<[], Array<Invitation>>,
  'getJoinRequests' : ActorMethod<[], Array<JoinRequest>>,
  'getLeaderboard' : ActorMethod<[], Array<Player>>,
  'getMessages' : ActorMethod<[bigint], Array<ChatMessage>>,
  'getPaymentTransaction' : ActorMethod<[bigint], [] | [PaymentTransaction]>,
  'getPaymentTransactions' : ActorMethod<[], Array<PaymentTransaction>>,
  'getPlayerStats' : ActorMethod<[string], [] | [Player]>,
  'getPoolManagementHistory' : ActorMethod<[], Array<TokenTransaction>>,
  'getPriceFeed' : ActorMethod<[string], [] | [PriceFeed]>,
  'getPriceFeeds' : ActorMethod<[], Array<PriceFeed>>,
  'getRealTimePoolBalances' : ActorMethod<[], Array<TokenPool>>,
  'getTeam' : ActorMethod<[bigint], [] | [Team]>,
  'getTokenPool' : ActorMethod<[string], [] | [TokenPool]>,
  'getTokenPools' : ActorMethod<[], Array<TokenPool>>,
  'getTokenTransaction' : ActorMethod<[bigint], [] | [TokenTransaction]>,
  'getTokenTransactions' : ActorMethod<[], Array<TokenTransaction>>,
  'getTotalSupply' : ActorMethod<[], bigint>,
  'getTotalSupplyStatus' : ActorMethod<[], bigint>,
  'getUserBalance' : ActorMethod<[Principal], bigint>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'getWallet' : ActorMethod<[Principal], [] | [Wallet]>,
  'initializeAccessControl' : ActorMethod<[], undefined>,
  'initializeWallet' : ActorMethod<[string, string, string, string], undefined>,
  'inviteToTeam' : ActorMethod<[bigint, Principal, Principal], undefined>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'leaveTeam' : ActorMethod<[bigint, Principal], undefined>,
  'listFileReferences' : ActorMethod<[], Array<FileReference>>,
  'receiveIcpTokens' : ActorMethod<[bigint], undefined>,
  'receiveStkTokens' : ActorMethod<[bigint], undefined>,
  'recordPaymentTransaction' : ActorMethod<
    [Principal, bigint, bigint, bigint, string, [] | [string]],
    bigint
  >,
  'recordTokenTransaction' : ActorMethod<
    [
      [] | [Principal],
      [] | [Principal],
      bigint,
      string,
      [] | [string],
      string,
      [] | [string],
    ],
    bigint
  >,
  'registerFileReference' : ActorMethod<[string, string], undefined>,
  'requestToJoinTeam' : ActorMethod<[bigint, Principal], undefined>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'saveGame' : ActorMethod<
    [Array<Player>, Array<Array<Frame>>, Array<bigint>, [] | [Principal]],
    bigint
  >,
  'sendIcpTokens' : ActorMethod<[string, bigint], undefined>,
  'sendMessage' : ActorMethod<[string, string, bigint], undefined>,
  'sendStkTokens' : ActorMethod<[string, bigint], undefined>,
  'transferTokensBetweenPools' : ActorMethod<
    [string, string, bigint],
    undefined
  >,
  'transform' : ActorMethod<[TransformationInput], TransformationOutput>,
  'updateAchievements' : ActorMethod<[Principal, Array<string>], undefined>,
  'updateCallerWallet' : ActorMethod<[bigint, bigint], undefined>,
  'updatePlayerStats' : ActorMethod<
    [string, bigint, bigint, bigint, bigint, bigint],
    undefined
  >,
  'updatePriceFeed' : ActorMethod<[string, bigint, string], undefined>,
  'updateProfilePicture' : ActorMethod<[Principal, string], undefined>,
  'updateTeamStats' : ActorMethod<[bigint, bigint, bigint, bigint], undefined>,
  'updateTokenPool' : ActorMethod<[string, bigint], undefined>,
  'updateTotalSupply' : ActorMethod<[bigint], undefined>,
  'updateUserBalance' : ActorMethod<[Principal, bigint], undefined>,
  'updateUserProfileStats' : ActorMethod<
    [Principal, bigint, bigint, bigint, bigint, bigint],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
