export const idlFactory = ({ IDL }) => {
  const _ImmutableObjectStorageCreateCertificateResult = IDL.Record({
    'method' : IDL.Text,
    'blob_hash' : IDL.Text,
  });
  const _ImmutableObjectStorageRefillInformation = IDL.Record({
    'proposed_top_up_amount' : IDL.Opt(IDL.Nat),
  });
  const _ImmutableObjectStorageRefillResult = IDL.Record({
    'success' : IDL.Opt(IDL.Bool),
    'topped_up_amount' : IDL.Opt(IDL.Nat),
  });
  const TokenTransaction = IDL.Record({
    'id' : IDL.Nat,
    'to' : IDL.Opt(IDL.Principal),
    'status' : IDL.Text,
    'transactionType' : IDL.Text,
    'from' : IDL.Opt(IDL.Principal),
    'pool' : IDL.Opt(IDL.Text),
    'reference' : IDL.Opt(IDL.Text),
    'timestamp' : IDL.Int,
    'amount' : IDL.Nat,
    'ledgerHeight' : IDL.Opt(IDL.Nat),
  });
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const Player = IDL.Record({
    'gamesPlayed' : IDL.Nat,
    'scores' : IDL.Vec(IDL.Nat),
    'name' : IDL.Text,
    'highestScore' : IDL.Nat,
    'totalSpares' : IDL.Nat,
    'totalStrikes' : IDL.Nat,
    'totalPoints' : IDL.Nat,
    'averageScore' : IDL.Nat,
  });
  const Frame = IDL.Record({
    'score' : IDL.Nat,
    'roll1' : IDL.Nat,
    'roll2' : IDL.Nat,
    'roll3' : IDL.Opt(IDL.Nat),
  });
  const Game = IDL.Record({
    'id' : IDL.Nat,
    'totalScores' : IDL.Vec(IDL.Nat),
    'owner' : IDL.Opt(IDL.Principal),
    'players' : IDL.Vec(Player),
    'timestamp' : IDL.Int,
    'frames' : IDL.Vec(IDL.Vec(Frame)),
  });
  const ChatMessage = IDL.Record({
    'gameId' : IDL.Nat,
    'sender' : IDL.Text,
    'message' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  const Team = IDL.Record({
    'id' : IDL.Nat,
    'creator' : IDL.Principal,
    'members' : IDL.Vec(IDL.Principal),
    'name' : IDL.Text,
    'createdAt' : IDL.Int,
    'description' : IDL.Text,
    'bestScore' : IDL.Nat,
    'totalGames' : IDL.Nat,
    'averageScore' : IDL.Nat,
  });
  const UserProfile = IDL.Record({
    'principal' : IDL.Principal,
    'displayName' : IDL.Text,
    'gamesPlayed' : IDL.Nat,
    'highestScore' : IDL.Nat,
    'totalSpares' : IDL.Nat,
    'achievements' : IDL.Vec(IDL.Text),
    'games' : IDL.Vec(IDL.Nat),
    'totalStrikes' : IDL.Nat,
    'totalPoints' : IDL.Nat,
    'profilePicture' : IDL.Opt(IDL.Text),
    'averageScore' : IDL.Nat,
  });
  const Wallet = IDL.Record({
    'stkPrincipalId' : IDL.Text,
    'icpTransactions' : IDL.Vec(TokenTransaction),
    'icpAccountId' : IDL.Text,
    'stkBalance' : IDL.Nat,
    'stkTransactions' : IDL.Vec(TokenTransaction),
  });
  const FileReference = IDL.Record({ 'hash' : IDL.Text, 'path' : IDL.Text });
  const Invitation = IDL.Record({
    'invitee' : IDL.Principal,
    'inviter' : IDL.Principal,
    'timestamp' : IDL.Int,
    'teamId' : IDL.Nat,
  });
  const JoinRequest = IDL.Record({
    'requester' : IDL.Principal,
    'timestamp' : IDL.Int,
    'teamId' : IDL.Nat,
  });
  const PaymentTransaction = IDL.Record({
    'id' : IDL.Nat,
    'status' : IDL.Text,
    'stkAmount' : IDL.Nat,
    'user' : IDL.Principal,
    'reference' : IDL.Opt(IDL.Text),
    'exchangeRate' : IDL.Nat,
    'timestamp' : IDL.Int,
    'icpAmount' : IDL.Nat,
  });
  const PriceFeed = IDL.Record({
    'status' : IDL.Text,
    'source' : IDL.Text,
    'icpUsd' : IDL.Nat,
    'lastUpdated' : IDL.Int,
  });
  const TokenPool = IDL.Record({
    'total' : IDL.Nat,
    'name' : IDL.Text,
    'remaining' : IDL.Nat,
  });
  const header = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const http_request_result = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(header),
  });
  const TransformationInput = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : http_request_result,
  });
  const TransformationOutput = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(header),
  });
  return IDL.Service({
    '_immutableObjectStorageBlobsAreLive' : IDL.Func(
        [IDL.Vec(IDL.Vec(IDL.Nat8))],
        [IDL.Vec(IDL.Bool)],
        ['query'],
      ),
    '_immutableObjectStorageBlobsToDelete' : IDL.Func(
        [],
        [IDL.Vec(IDL.Vec(IDL.Nat8))],
        ['query'],
      ),
    '_immutableObjectStorageConfirmBlobDeletion' : IDL.Func(
        [IDL.Vec(IDL.Vec(IDL.Nat8))],
        [],
        [],
      ),
    '_immutableObjectStorageCreateCertificate' : IDL.Func(
        [IDL.Text],
        [_ImmutableObjectStorageCreateCertificateResult],
        [],
      ),
    '_immutableObjectStorageRefillCashier' : IDL.Func(
        [IDL.Opt(_ImmutableObjectStorageRefillInformation)],
        [_ImmutableObjectStorageRefillResult],
        [],
      ),
    '_immutableObjectStorageUpdateGatewayPrincipals' : IDL.Func([], [], []),
    '_initializeAccessControl' : IDL.Func([], [], []),
    'acceptInvitation' : IDL.Func([IDL.Nat], [], []),
    'addIcpTransaction' : IDL.Func(
        [TokenTransaction],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'addStkTransaction' : IDL.Func(
        [TokenTransaction],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'adjustPoolAllocation' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'adminBurnTokens' : IDL.Func(
        [IDL.Principal, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'approveJoinRequest' : IDL.Func([IDL.Nat, IDL.Principal], [], []),
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'claimGameReward' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text })],
        [],
      ),
    'createTeam' : IDL.Func([IDL.Text, IDL.Text], [IDL.Nat], []),
    'declineInvitation' : IDL.Func([IDL.Nat], [], []),
    'denyJoinRequest' : IDL.Func([IDL.Nat, IDL.Principal], [], []),
    'dropFileReference' : IDL.Func([IDL.Text], [], []),
    'fetchIcpPrice' : IDL.Func([IDL.Text], [IDL.Text], []),
    'getAdminAuditTrail' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Vec(TokenTransaction), 'err' : IDL.Text })],
        ['query'],
      ),
    'getAdminIcpWallet' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'getAdminTreasuryAddress' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'getAllGames' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(Game)], ['query']),
    'getAllMessages' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(ChatMessage)],
        ['query'],
      ),
    'getAllPlayerStats' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(Player)],
        ['query'],
      ),
    'getAllTeams' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Vec(Team)], ['query']),
    'getAllUserProfiles' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(UserProfile)],
        ['query'],
      ),
    'getBurnFee' : IDL.Func([], [IDL.Nat], ['query']),
    'getCallerAccountIds' : IDL.Func([], [IDL.Text, IDL.Text], ['query']),
    'getCallerAddresses' : IDL.Func([], [IDL.Text, IDL.Text], ['query']),
    'getCallerDerivedAccountId' : IDL.Func([], [IDL.Text], ['query']),
    'getCallerIcpBalance' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text })],
        [],
      ),
    'getCallerIcpTransactions' : IDL.Func(
        [],
        [IDL.Vec(TokenTransaction)],
        ['query'],
      ),
    'getCallerPrincipalId' : IDL.Func([], [IDL.Text], ['query']),
    'getCallerRewardStatus' : IDL.Func(
        [],
        [
          IDL.Record({
            'rewardPerGame' : IDL.Nat,
            'dailyCap' : IDL.Nat,
            'gamesEarnedToday' : IDL.Nat,
            'canClaim' : IDL.Bool,
          }),
        ],
        ['query'],
      ),
    'getCallerStkBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'getCallerStkBalanceLive' : IDL.Func([], [IDL.Nat], []),
    'getCallerStkTransactions' : IDL.Func(
        [],
        [IDL.Vec(TokenTransaction)],
        ['query'],
      ),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCallerWallet' : IDL.Func([], [IDL.Opt(Wallet)], ['query']),
    'getCallerWalletSummary' : IDL.Func(
        [],
        [
          IDL.Nat,
          IDL.Vec(TokenTransaction),
          IDL.Vec(TokenTransaction),
          IDL.Text,
          IDL.Text,
        ],
        ['query'],
      ),
    'getCirculatingSupply' : IDL.Func([], [IDL.Nat], ['query']),
    'getCurrentRewardPerGame' : IDL.Func([], [IDL.Nat], ['query']),
    'getDailyRewardLimit' : IDL.Func([], [IDL.Nat], ['query']),
    'getFileReference' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(FileReference)],
        ['query'],
      ),
    'getGame' : IDL.Func([IDL.Nat], [IDL.Opt(Game)], ['query']),
    'getInvitations' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(Invitation)],
        ['query'],
      ),
    'getJoinRequests' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(JoinRequest)],
        ['query'],
      ),
    'getLeaderboard' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(Player)],
        ['query'],
      ),
    'getLedgerPrincipal' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Principal, 'err' : IDL.Text })],
        ['query'],
      ),
    'getMatchReward' : IDL.Func([], [IDL.Nat], ['query']),
    'getMessages' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat],
        [IDL.Vec(ChatMessage)],
        ['query'],
      ),
    'getPaymentTransaction' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(PaymentTransaction)],
        ['query'],
      ),
    'getPaymentTransactions' : IDL.Func(
        [],
        [IDL.Vec(PaymentTransaction)],
        ['query'],
      ),
    'getPlayerStats' : IDL.Func([IDL.Text], [IDL.Opt(Player)], ['query']),
    'getPoolManagementHistory' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Vec(TokenTransaction), 'err' : IDL.Text })],
        ['query'],
      ),
    'getPriceFeed' : IDL.Func([IDL.Text], [IDL.Opt(PriceFeed)], ['query']),
    'getPriceFeeds' : IDL.Func([], [IDL.Vec(PriceFeed)], ['query']),
    'getRealTimePoolBalances' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Vec(TokenPool), 'err' : IDL.Text })],
        ['query'],
      ),
    'getTeam' : IDL.Func([IDL.Nat], [IDL.Opt(Team)], ['query']),
    'getTokenPool' : IDL.Func([IDL.Text], [IDL.Opt(TokenPool)], ['query']),
    'getTokenPools' : IDL.Func([], [IDL.Vec(TokenPool)], ['query']),
    'getTokenTransaction' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(TokenTransaction)],
        ['query'],
      ),
    'getTokenTransactions' : IDL.Func(
        [],
        [IDL.Vec(TokenTransaction)],
        ['query'],
      ),
    'getTotalSupply' : IDL.Func([], [IDL.Nat], ['query']),
    'getTotalSupplyStatus' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text })],
        ['query'],
      ),
    'getUserBalance' : IDL.Func([IDL.Principal], [IDL.Nat], ['query']),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'getWallet' : IDL.Func([IDL.Principal], [IDL.Opt(Wallet)], ['query']),
    'initializeAccessControl' : IDL.Func([], [], []),
    'initializeWallet' : IDL.Func(
        [IDL.Text, IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'inviteToTeam' : IDL.Func([IDL.Nat, IDL.Principal], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'leaveTeam' : IDL.Func([IDL.Nat], [], []),
    'listFileReferences' : IDL.Func([], [IDL.Vec(FileReference)], ['query']),
    'loginUser' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'mintStkTokens' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'receiveStkTokens' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'recomputeMyAccountId' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text })],
        [],
      ),
    'recordIcpSend' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'recordPaymentTransaction' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat, IDL.Text, IDL.Opt(IDL.Text)],
        [IDL.Nat],
        [],
      ),
    'recordTokenTransaction' : IDL.Func(
        [
          IDL.Opt(IDL.Principal),
          IDL.Opt(IDL.Principal),
          IDL.Nat,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Text,
          IDL.Opt(IDL.Text),
        ],
        [IDL.Nat],
        [],
      ),
    'registerFileReference' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'requestToJoinTeam' : IDL.Func([IDL.Nat], [], []),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'saveGame' : IDL.Func(
        [IDL.Vec(Player), IDL.Vec(IDL.Vec(Frame)), IDL.Vec(IDL.Nat)],
        [IDL.Nat],
        [],
      ),
    'sendMessage' : IDL.Func([IDL.Text, IDL.Nat], [], []),
    'sendStkTokens' : IDL.Func(
        [IDL.Text, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'setAdminIcpWallet' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'setAdminTreasuryAccount' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'setBurnFee' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'setDailyRewardLimit' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'setLedgerPrincipal' : IDL.Func(
        [IDL.Principal],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'setMatchReward' : IDL.Func(
        [IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'startGame' : IDL.Func(
        [],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'transferFromPoolToUser' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'transferTokensBetweenPools' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat],
        [IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text })],
        [],
      ),
    'transform' : IDL.Func(
        [TransformationInput],
        [TransformationOutput],
        ['query'],
      ),
    'updateCallerAchievements' : IDL.Func([IDL.Vec(IDL.Text)], [], []),
    'updateCallerProfilePicture' : IDL.Func([IDL.Text], [], []),
    'updateCallerUserProfileStats' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat],
        [],
        [],
      ),
    'updatePlayerStats' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat],
        [],
        [],
      ),
    'updatePriceFeed' : IDL.Func([IDL.Text, IDL.Nat, IDL.Text], [], []),
    'updateTeamStats' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat], [], []),
    'updateTokenPool' : IDL.Func([IDL.Text, IDL.Nat], [], []),
    'updateUserBalance' : IDL.Func([IDL.Principal, IDL.Nat], [], []),
    'verifyIcpPayment' : IDL.Func(
        [IDL.Text],
        [IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
