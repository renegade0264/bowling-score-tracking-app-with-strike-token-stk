import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import Nat64 "mo:core/Nat64";
import Int "mo:core/Int";
import Debug "mo:core/Debug";
import Iter "mo:core/Iter";
import Nat8 "mo:core/Nat8";
import Error "mo:core/Error";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import MixinObjectStorage "mo:caffeineai-object-storage/Mixin";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Sha224 "Sha224";

persistent actor BowlingScoreTracker {

  // ===== INTERNAL TYPES FOR LEDGER (Nat64 ONLY — never exposed publicly) =====
  type LedgerTokens = { e8s : Nat64 };

  type TransferError = {
    #BadFee : { expected_fee : { e8s : Nat64 } };
    #BadSender;
    #InsufficientFunds : { balance : { e8s : Nat64 } };
    #TxTooOld : { allowed_window_nanos : Nat64 };
    #TxCreatedInFuture;
    #TxDuplicate : { duplicate_of : Nat64 };
    #GenericError : { error_code : Nat64; message : Text };
    #TemporarilyUnavailable;
  };

  type TransferResult = { #ok : Nat64; #err : TransferError };

  type Ledger = actor {
    account_balance : shared { account : Blob } -> async LedgerTokens;
    transfer : shared {
      memo : Nat64;
      amount : { e8s : Nat64 };
      fee : { e8s : Nat64 };
      from_subaccount : ?Blob;
      to : Blob;
      created_at_time : ?{ timestamp_nanos : Nat64 };
    } -> async TransferResult;
  };

  // ===== PUBLIC TYPES =====

  type Player = {
    name : Text;
    scores : [Nat];
    averageScore : Nat;
    totalSpares : Nat;
    totalStrikes : Nat;
    totalPoints : Nat;
    highestScore : Nat;
    gamesPlayed : Nat;
  };

  type Frame = {
    roll1 : Nat;
    roll2 : Nat;
    roll3 : ?Nat;
    score : Nat;
  };

  type Game = {
    id : Nat;
    players : [Player];
    frames : [[Frame]];
    timestamp : Int;
    totalScores : [Nat];
    owner : ?Principal;
  };

  type ChatMessage = {
    sender : Text;
    message : Text;
    timestamp : Int;
    gameId : Nat;
  };

  type UserProfile = {
    principal : Principal;
    displayName : Text;
    games : [Nat];
    achievements : [Text];
    averageScore : Nat;
    totalSpares : Nat;
    totalStrikes : Nat;
    totalPoints : Nat;
    highestScore : Nat;
    gamesPlayed : Nat;
    profilePicture : ?Text;
  };

  type Team = {
    id : Nat;
    name : Text;
    description : Text;
    creator : Principal;
    members : [Principal];
    averageScore : Nat;
    totalGames : Nat;
    bestScore : Nat;
    createdAt : Int;
  };

  type JoinRequest = {
    teamId : Nat;
    requester : Principal;
    timestamp : Int;
  };

  type Invitation = {
    teamId : Nat;
    invitee : Principal;
    inviter : Principal;
    timestamp : Int;
  };

  type TokenPool = {
    name : Text;
    total : Nat;
    remaining : Nat;
  };

  type TokenTransaction = {
    id : Nat;
    from : ?Principal;
    to : ?Principal;
    amount : Nat;
    timestamp : Int;
    transactionType : Text;
    pool : ?Text;
    status : Text;
    reference : ?Text;
    ledgerHeight : ?Nat;
  };

  type PaymentTransaction = {
    id : Nat;
    user : Principal;
    icpAmount : Nat;
    stkAmount : Nat;
    exchangeRate : Nat;
    timestamp : Int;
    status : Text;
    reference : ?Text;
  };

  type PriceFeed = {
    source : Text;
    icpUsd : Nat;
    lastUpdated : Int;
    status : Text;
  };

  type Wallet = {
    stkBalance : Nat;
    icpTransactions : [TokenTransaction];
    stkTransactions : [TokenTransaction];
    icpAccountId : Text;
    stkPrincipalId : Text;
  };

  type FileReference = {
    path : Text;
    hash : Text;
  };

  type RegistryState = {
    var authorizedPrincipals : [Principal];
    var blobsToRemove : Map.Map<Text, Bool>;
    var references : Map.Map<Text, FileReference>;
  };

  // ===== STATE =====
  // All state is directly stable via --default-persistent-actors.
  // Migration from _stable_* shadow vars completed in Deploy 1 postupgrade.
  // No preupgrade/postupgrade hooks needed.

  var nextGameId : Nat = 0;
  var nextTeamId : Nat = 0;
  var nextTransactionId : Nat = 0;
  var nextPaymentId : Nat = 0;
  let games = Map.empty<Nat, Game>();
  let playerStats = Map.empty<Text, Player>();
  var chatMessages : [ChatMessage] = [];
  let userProfiles = Map.empty<Principal, UserProfile>();
  let teams = Map.empty<Nat, Team>();
  var joinRequests : [JoinRequest] = [];
  var invitations : [Invitation] = [];
  let tokenPools = Map.empty<Text, TokenPool>();
  let tokenTransactions = Map.empty<Nat, TokenTransaction>();
  let paymentTransactions = Map.empty<Nat, PaymentTransaction>();
  let priceFeeds = Map.empty<Text, PriceFeed>();
  let userBalances = Map.empty<Principal, Nat>();
  let userWallets = Map.empty<Principal, Wallet>();
  var totalSupply : Nat = 1000000;
  var isInitialized : Bool = false;
  var burnFee : Nat = 1;
  var matchReward : Nat = 2;
  var dailyRewardLimit : Nat = 4;
  var ledgerPrincipal : ?Principal = ?Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai");
  var adminIcpWallet : ?Text = ?"1bc05ddb3a642296fa5f72a31354d40fc47188c781dd227c52d0c9832f79969e";
  let usedMintBlockHeights = Map.empty<Nat, Bool>();
  var rewardEarnerCount : Nat = 0;
  var rewardsPoolStart : Int = 0;
  let gameStartTimes = Map.empty<Principal, Int>();
  let dailyRewardTracking = Map.empty<Principal, { lastEarnTime : Int; earnedToday : Nat }>();
  let rewardEarners = Map.empty<Principal, Bool>();
  let claimedRewardGames = Map.empty<Nat, Bool>();
  var treasuryClaimedIcp : Nat = 0;
  let activeMintCallers = Map.empty<Principal, Bool>(); // C2: CallerGuard for mintStkTokens

  let accessControlState = AccessControl.initState();

  // ===== AUTO-INITIALIZATION HELPERS =====

  // ===== SYSTEM HOOKS =====

  // L1: Reject anonymous ingress messages before they consume cycles.
  // moc 1.3.0: system func inspect takes a record with caller; return true = accept, false = reject.
  system func inspect({ caller : Principal }) : Bool {
    not caller.isAnonymous()
  };


  let registry : RegistryState = {
    var authorizedPrincipals = [];
    var blobsToRemove = Map.empty<Text, Bool>();
    var references = Map.empty<Text, FileReference>();
  };

  // ===== CONVERSION HELPERS (Nat <-> Nat64 at ledger boundary only) =====

  func nat64ToNat(n64 : Nat64) : Nat { n64.toNat() };

  // Max Nat64 value: 2^64 - 1 = 18446744073709551615
  let _nat64Max : Nat = 18446744073709551615;

  func _natToNat64Safe(n : Nat) : { #ok : Nat64; #err : Text } {
    if (n > _nat64Max) { #err("Value cannot be represented as Nat64") }
    else { #ok(Nat64.fromNat(n)) };
  };

  // ===== LEDGER HELPER =====

  func getLedger() : { #ok : Ledger; #err : Text } {
    switch (ledgerPrincipal) {
      case (?p) #ok(actor (p.toText()) : Ledger);
      case null #err("Ledger principal not configured");
    };
  };

  // ===== HEX TO BLOB CONVERSION =====

  func hexToAccountIdBlob(hex : Text) : { #ok : Blob; #err : Text } {
    let chars = hex.toIter() |> _.toArray();
    if (chars.size() != 64) {
      return #err("Invalid hex string length: expected 64 characters");
    };
    let bytes : [var Nat8] = [var
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0
    ];
    var i = 0;
    label conversionLoop while (i < 32) {
      let hiChar = chars[i * 2];
      let loChar = chars[i * 2 + 1];
      let hiVal : Nat = switch (hiChar) {
        case '0' 0; case '1' 1; case '2' 2; case '3' 3; case '4' 4;
        case '5' 5; case '6' 6; case '7' 7; case '8' 8; case '9' 9;
        case 'a' 10; case 'b' 11; case 'c' 12; case 'd' 13; case 'e' 14; case 'f' 15;
        case 'A' 10; case 'B' 11; case 'C' 12; case 'D' 13; case 'E' 14; case 'F' 15;
        case _ { return #err("Invalid hex character") };
      };
      let loVal : Nat = switch (loChar) {
        case '0' 0; case '1' 1; case '2' 2; case '3' 3; case '4' 4;
        case '5' 5; case '6' 6; case '7' 7; case '8' 8; case '9' 9;
        case 'a' 10; case 'b' 11; case 'c' 12; case 'd' 13; case 'e' 14; case 'f' 15;
        case 'A' 10; case 'B' 11; case 'C' 12; case 'D' 13; case 'E' 14; case 'F' 15;
        case _ { return #err("Invalid hex character") };
      };
      bytes[i] := Nat8.fromNat(hiVal * 16 + loVal);
      i += 1;
    };
    #ok(Blob.fromVarArray(bytes));
  };

  // ===== SAFE SUBTRACTION =====

  func safeSub(a : Nat, b : Nat) : Nat {
    if (a < b) 0 else a - b;
  };

  // ===== TOKEN POOL INITIALIZATION =====

  func initializeTokenPools() {
    if (not isInitialized) {
      tokenPools.add("Treasury Reserves", { name = "Treasury Reserves"; total = 400000; remaining = 400000 });
      tokenPools.add("Minting Platform", { name = "Minting Platform"; total = 200000; remaining = 200000 });
      tokenPools.add("In-Game Rewards", { name = "In-Game Rewards"; total = 150000; remaining = 150000 });
      tokenPools.add("Admin Team Wallet", { name = "Admin Team Wallet"; total = 150000; remaining = 150000 });
      tokenPools.add("NFT Staking Rewards", { name = "NFT Staking Rewards"; total = 100000; remaining = 100000 });
      isInitialized := true;
    };
  };

  // ===== ACCESS CONTROL =====

  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
    initializeTokenPools();
  };

  // ===== LOGIN =====
  // H4: Admin role is only granted via initializeAccessControl() (called by deployer).
  // loginUser() only ever grants #user, preventing the first-caller admin race.

  public shared ({ caller }) func loginUser() : async { #ok : (); #err : Text } {
    if (caller.isAnonymous()) {
      return #err("Anonymous callers cannot log in");
    };
    // Block login until admin has been explicitly initialized via initializeAccessControl().
    // This prevents any user from claiming admin by being the first to call loginUser().
    if (not accessControlState.adminAssigned) {
      return #err("System not yet initialized. Please contact the administrator.");
    };
    // New callers receive the user role only; admin role requires explicit assignment.
    if (not AccessControl.hasPermission(accessControlState, caller, #admin) and
        not AccessControl.hasPermission(accessControlState, caller, #user)) {
      accessControlState.userRoles.add(caller, #user);
    };
    #ok(());
  };

  // ===== LEDGER PRINCIPAL MANAGEMENT =====

  public shared ({ caller }) func setLedgerPrincipal(p : Principal) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized");
    };
    ledgerPrincipal := ?p;
    #ok(());
  };

  public query ({ caller }) func getLedgerPrincipal() : async { #ok : Principal; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized");
    };
    switch (ledgerPrincipal) {
      case (?p) #ok(p);
      case null #err("Ledger principal not configured");
    };
  };

  // ===== ADMIN ICP WALLET / TREASURY MANAGEMENT =====
  // The admin treasury is where users send ICP when purchasing STK tokens.
  // The frontend uses the user's agent to transfer ICP directly to this address.

  public shared ({ caller }) func setAdminIcpWallet(address : Text) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can set admin ICP wallet");
    };
    if (address.size() == 0) {
      return #err("Address cannot be empty");
    };
    adminIcpWallet := ?address;
    #ok(());
  };

  // Alias for setAdminIcpWallet — sets the admin treasury account for minting payments.
  public shared ({ caller }) func setAdminTreasuryAccount(accountId : Text) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized");
    };
    if (accountId.size() == 0) {
      return #err("Account ID cannot be empty");
    };
    adminIcpWallet := ?accountId;
    #ok(());
  };

  public query func getAdminIcpWallet() : async ?Text {
    adminIcpWallet;
  };

  // Returns the admin treasury address where users should send ICP for minting.
  public query func getAdminTreasuryAddress() : async ?Text {
    adminIcpWallet;
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    userProfiles.get(caller);
  };

  public query func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    if (profile.displayName.size() > 100) {
      Runtime.trap("Display name too long: maximum is 100 characters");
    };
    userProfiles.add(caller, { profile with principal = caller });
  };

  public query func getAllUserProfiles(offset : Nat, limit : Nat) : async [UserProfile] {
    let all = userProfiles.values() |> _.toArray();
    let total = all.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<UserProfile>(end_ - start, func(i) { all[start + i] });
  };

  public shared ({ caller }) func updateCallerAchievements(achievements : [Text]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update achievements");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        userProfiles.add(caller, { profile with achievements });
      };
      case null {};
    };
  };

  public shared ({ caller }) func updateCallerUserProfileStats(totalSpares : Nat, totalStrikes : Nat, totalPoints : Nat, highestScore : Nat, gamesPlayed : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update profile stats");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        userProfiles.add(caller, { profile with totalSpares; totalStrikes; totalPoints; highestScore; gamesPlayed });
      };
      case null {};
    };
  };

  public shared ({ caller }) func updateCallerProfilePicture(picturePath : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update profile pictures");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        userProfiles.add(caller, { profile with profilePicture = ?picturePath });
      };
      case null {};
    };
  };

  // ===== GAME ENGINE =====

  public shared ({ caller }) func saveGame(players : [Player], frames : [[Frame]], totalScores : [Nat]) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot save games");
    };
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save games");
    };
    if (players.size() > 10) {
      Runtime.trap("Too many players: maximum is 10");
    };
    let owner : ?Principal = ?caller;
    let gameId = nextGameId;
    nextGameId += 1;

    let game : Game = {
      id = gameId;
      players;
      frames;
      timestamp = Time.now();
      totalScores;
      owner;
    };

    games.add(gameId, game);

    for (player in players.values()) {
      let existingPlayer = playerStats.get(player.name);
      let updatedScores = switch (existingPlayer) {
        case (?p) p.scores.concat(player.scores);
        case null player.scores;
      };
      let total = updatedScores.foldLeft(0, func(acc : Nat, score : Nat) : Nat { acc + score });
      let average = if (updatedScores.size() > 0) total / updatedScores.size() else 0;

      let updatedPlayer : Player = {
        name = player.name;
        scores = updatedScores;
        averageScore = average;
        totalSpares = switch (existingPlayer) { case (?p) p.totalSpares; case null 0 };
        totalStrikes = switch (existingPlayer) { case (?p) p.totalStrikes; case null 0 };
        totalPoints = switch (existingPlayer) { case (?p) p.totalPoints; case null 0 };
        highestScore = switch (existingPlayer) { case (?p) p.highestScore; case null 0 };
        gamesPlayed = switch (existingPlayer) { case (?p) p.gamesPlayed; case null 0 };
      };
      playerStats.add(player.name, updatedPlayer);
    };

    switch (owner) {
      case (?principal) {
        let existingProfile = userProfiles.get(principal);
        let updatedGames = switch (existingProfile) {
          case (?profile) profile.games.concat([gameId]);
          case null [gameId];
        };
        let totalScoreSum = totalScores.foldLeft(0, func(acc : Nat, score : Nat) : Nat { acc + score });
        let averageScore = if (totalScores.size() > 0) totalScoreSum / totalScores.size() else 0;

        let updatedProfile : UserProfile = {
          principal;
          displayName = switch (existingProfile) { case (?p) p.displayName; case null principal.toText() };
          games = updatedGames;
          achievements = switch (existingProfile) { case (?p) p.achievements; case null [] };
          averageScore;
          totalSpares = switch (existingProfile) { case (?p) p.totalSpares; case null 0 };
          totalStrikes = switch (existingProfile) { case (?p) p.totalStrikes; case null 0 };
          totalPoints = switch (existingProfile) { case (?p) p.totalPoints; case null 0 };
          highestScore = switch (existingProfile) { case (?p) p.highestScore; case null 0 };
          gamesPlayed = switch (existingProfile) { case (?p) p.gamesPlayed; case null 0 };
          profilePicture = switch (existingProfile) { case (?p) p.profilePicture; case null null };
        };
        userProfiles.add(principal, updatedProfile);
      };
      case null {};
    };

    gameId;
  };

  public query func getGame(gameId : Nat) : async ?Game {
    games.get(gameId);
  };

  public query func getAllGames(offset : Nat, limit : Nat) : async [Game] {
    let all = games.values() |> _.toArray();
    let total = all.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<Game>(end_ - start, func(i) { all[start + i] });
  };

  public query func getPlayerStats(playerName : Text) : async ?Player {
    playerStats.get(playerName);
  };

  public query func getAllPlayerStats(offset : Nat, limit : Nat) : async [Player] {
    let all = playerStats.values() |> _.toArray();
    let total = all.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<Player>(end_ - start, func(i) { all[start + i] });
  };

  public query func getLeaderboard(offset : Nat, limit : Nat) : async [Player] {
    let sorted = playerStats.values() |> _.toArray().sort(
      func(a : Player, b : Player) : { #less; #equal; #greater } {
        if (a.averageScore > b.averageScore) { #less }
        else if (a.averageScore < b.averageScore) { #greater }
        else { #equal };
      }
    );
    let total = sorted.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<Player>(end_ - start, func(i) { sorted[start + i] });
  };

  public shared ({ caller }) func updatePlayerStats(name : Text, totalSpares : Nat, totalStrikes : Nat, totalPoints : Nat, highestScore : Nat, gamesPlayed : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update player stats");
    };
    switch (playerStats.get(name)) {
      case (?player) {
        playerStats.add(name, { player with totalSpares; totalStrikes; totalPoints; highestScore; gamesPlayed });
      };
      case null {};
    };
  };

  // ===== CHAT =====

  public shared ({ caller }) func sendMessage(message : Text, gameId : Nat) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous callers cannot send messages");
    };
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };
    if (message.size() > 500) {
      Runtime.trap("Message too long: maximum is 500 characters");
    };
    let sender : Text = switch (userProfiles.get(caller)) {
      case (?p) p.displayName;
      case null caller.toText();
    };
    let chatMessage : ChatMessage = {
      sender;
      message;
      timestamp = Time.now();
      gameId;
    };
    chatMessages := chatMessages.concat([chatMessage]);
  };

  public query func getMessages(gameId : Nat, offset : Nat, limit : Nat) : async [ChatMessage] {
    let filtered = chatMessages.filter(func(msg : ChatMessage) : Bool { msg.gameId == gameId });
    let total = filtered.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<ChatMessage>(end_ - start, func(i) { filtered[start + i] });
  };

  public query func getAllMessages(offset : Nat, limit : Nat) : async [ChatMessage] {
    let total = chatMessages.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<ChatMessage>(end_ - start, func(i) { chatMessages[start + i] });
  };

  // ===== TEAMS =====

  public shared ({ caller }) func createTeam(name : Text, description : Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create teams");
    };
    if (name.size() == 0 or name.size() > 100) {
      Runtime.trap("Team name must be between 1 and 100 characters");
    };
    if (description.size() > 500) {
      Runtime.trap("Team description too long: maximum is 500 characters");
    };
    let teamId = nextTeamId;
    nextTeamId += 1;

    teams.add(teamId, {
      id = teamId;
      name;
      description;
      creator = caller;
      members = [caller];
      averageScore = 0;
      totalGames = 0;
      bestScore = 0;
      createdAt = Time.now();
    });
    teamId;
  };

  public shared ({ caller }) func requestToJoinTeam(teamId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can request to join teams");
    };
    joinRequests := joinRequests.concat([{ teamId; requester = caller; timestamp = Time.now() }]);
  };

  public shared ({ caller }) func approveJoinRequest(teamId : Nat, requester : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can approve join requests");
    };
    switch (teams.get(teamId)) {
      case (?team) {
        if (team.creator != caller) {
          Runtime.trap("Unauthorized: Only the team creator can approve join requests");
        };
        teams.add(teamId, { team with members = team.members.concat([requester]) });
        joinRequests := joinRequests.filter(func(req : JoinRequest) : Bool {
          not (req.teamId == teamId and req.requester == requester)
        });
      };
      case null {};
    };
  };

  public shared ({ caller }) func denyJoinRequest(teamId : Nat, requester : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can deny join requests");
    };
    switch (teams.get(teamId)) {
      case (?team) {
        if (team.creator != caller) {
          Runtime.trap("Unauthorized: Only the team creator can deny join requests");
        };
        joinRequests := joinRequests.filter(func(req : JoinRequest) : Bool {
          not (req.teamId == teamId and req.requester == requester)
        });
      };
      case null {};
    };
  };

  public shared ({ caller }) func inviteToTeam(teamId : Nat, invitee : Principal) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can invite to teams");
    };
    switch (teams.get(teamId)) {
      case (?team) {
        if (team.creator != caller) {
          Runtime.trap("Unauthorized: Only the team creator can invite members");
        };
        invitations := invitations.concat([{ teamId; invitee; inviter = caller; timestamp = Time.now() }]);
      };
      case null {};
    };
  };

  public shared ({ caller }) func acceptInvitation(teamId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can accept invitations");
    };
    switch (teams.get(teamId)) {
      case (?team) {
        teams.add(teamId, { team with members = team.members.concat([caller]) });
        invitations := invitations.filter(func(inv : Invitation) : Bool {
          not (inv.teamId == teamId and inv.invitee == caller)
        });
      };
      case null {};
    };
  };

  public shared ({ caller }) func declineInvitation(teamId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can decline invitations");
    };
    invitations := invitations.filter(func(inv : Invitation) : Bool {
      not (inv.teamId == teamId and inv.invitee == caller)
    });
  };

  public shared ({ caller }) func leaveTeam(teamId : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can leave teams");
    };
    switch (teams.get(teamId)) {
      case (?team) {
        teams.add(teamId, { team with members = team.members.filter(func(m : Principal) : Bool { m != caller }) });
      };
      case null {};
    };
  };

  public query func getTeam(teamId : Nat) : async ?Team {
    teams.get(teamId);
  };

  public query func getAllTeams(offset : Nat, limit : Nat) : async [Team] {
    let all = teams.values() |> _.toArray();
    let total = all.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<Team>(end_ - start, func(i) { all[start + i] });
  };

  public query func getJoinRequests(offset : Nat, limit : Nat) : async [JoinRequest] {
    let total = joinRequests.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<JoinRequest>(end_ - start, func(i) { joinRequests[start + i] });
  };

  public query func getInvitations(offset : Nat, limit : Nat) : async [Invitation] {
    let total = invitations.size();
    let start = Nat.min(offset, total);
    let end_ = Nat.min(start + limit, total);
    Array.tabulate<Invitation>(end_ - start, func(i) { invitations[start + i] });
  };

  public shared ({ caller }) func updateTeamStats(teamId : Nat, averageScore : Nat, totalGames : Nat, bestScore : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update team stats");
    };
    switch (teams.get(teamId)) {
      case (?team) {
        teams.add(teamId, { team with averageScore; totalGames; bestScore });
      };
      case null {};
    };
  };

  // ===== TOKEN POOLS =====

  // H3: query (not update) — read-only, initialization happens via initializeAccessControl/initializeWallet
  public query func getTokenPools() : async [TokenPool] {
    tokenPools.values() |> _.toArray();
  };

  public query func getTokenPool(name : Text) : async ?TokenPool {
    tokenPools.get(name);
  };

  public shared ({ caller }) func updateTokenPool(name : Text, remaining : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update token pools");
    };
    switch (tokenPools.get(name)) {
      case (?pool) {
        tokenPools.add(name, { pool with remaining });
      };
      case null {};
    };
  };

  // ===== TOKEN TRANSACTIONS =====

  public shared ({ caller }) func recordTokenTransaction(from : ?Principal, to : ?Principal, amount : Nat, transactionType : Text, pool : ?Text, status : Text, reference : ?Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can record token transactions");
    };
    let transactionId = nextTransactionId;
    nextTransactionId += 1;

    let transaction : TokenTransaction = {
      id = transactionId;
      from;
      to;
      amount;
      timestamp = Time.now();
      transactionType;
      pool;
      status;
      reference;
      ledgerHeight = null;
    };

    tokenTransactions.add(transactionId, transaction);
    transactionId;
  };

  public query func getTokenTransactions() : async [TokenTransaction] {
    tokenTransactions.values() |> _.toArray();
  };

  public query func getTokenTransaction(id : Nat) : async ?TokenTransaction {
    tokenTransactions.get(id);
  };

  // ===== PAYMENT TRANSACTIONS =====

  public shared ({ caller }) func recordPaymentTransaction(user : Principal, icpAmount : Nat, exchangeRate : Nat, status : Text, reference : ?Text) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can record payment transactions");
    };
    let paymentId = nextPaymentId;
    nextPaymentId += 1;

    let stkAmount = icpAmount * exchangeRate;

    let payment : PaymentTransaction = {
      id = paymentId;
      user;
      icpAmount;
      stkAmount;
      exchangeRate;
      timestamp = Time.now();
      status;
      reference;
    };

    paymentTransactions.add(paymentId, payment);

    let currentBalance = switch (userBalances.get(user)) {
      case (?balance) balance;
      case null 0;
    };
    userBalances.add(user, currentBalance + stkAmount);

    switch (await creditUserWallet(user, stkAmount)) {
      case (#ok(())) {};
      case (#err(msg)) {
        Debug.print("recordPaymentTransaction: creditUserWallet failed for " # user.toText() # ": " # msg);
      };
    };

    switch (tokenPools.get("Minting Platform")) {
      case (?pool) {
        tokenPools.add("Minting Platform", { pool with remaining = safeSub(pool.remaining, stkAmount) });
      };
      case null {};
    };

    paymentId;
  };

  public query func getPaymentTransactions() : async [PaymentTransaction] {
    paymentTransactions.values() |> _.toArray();
  };

  public query func getPaymentTransaction(id : Nat) : async ?PaymentTransaction {
    paymentTransactions.get(id);
  };

  // M2: returns Result so callers can surface wallet-not-found errors instead of silently no-oping
  func creditUserWallet(user : Principal, stkAmount : Nat) : async { #ok : (); #err : Text } {
    switch (userWallets.get(user)) {
      case (?wallet) {
        userWallets.add(user, { wallet with stkBalance = wallet.stkBalance + stkAmount });
        #ok(());
      };
      case null {
        #err("Wallet not found for principal: " # user.toText());
      };
    };
  };

  // ===== PRICE FEEDS =====

  public func updatePriceFeed(source : Text, icpUsd : Nat, status : Text) : async () {
    priceFeeds.add(source, { source; icpUsd; lastUpdated = Time.now(); status });
  };

  public query func getPriceFeeds() : async [PriceFeed] {
    priceFeeds.values() |> _.toArray();
  };

  public query func getPriceFeed(source : Text) : async ?PriceFeed {
    priceFeeds.get(source);
  };

  // ===== USER BALANCES =====

  public shared ({ caller }) func updateUserBalance(user : Principal, amount : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update user balances");
    };
    userBalances.add(user, amount);
  };

  public query func getUserBalance(user : Principal) : async Nat {
    switch (userBalances.get(user)) {
      case (?balance) balance;
      case null 0;
    };
  };

  public query func getTotalSupply() : async Nat {
    totalSupply;
  };

  public shared ({ caller }) func updateTotalSupply(amount : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update total supply");
    };
    totalSupply := amount;
  };

  // ===== HTTP OUTCALLS (admin-only for security) =====

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func fetchIcpPrice(source : Text) : async Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return "Unauthorized";
    };
    let allowedSources = ["coingecko", "coinmarketcap", "binance", "coinbase", "kraken"];
    var isAllowed = false;
    for (s in allowedSources.values()) {
      if (s == source) { isAllowed := true };
    };
    if (not isAllowed) {
      return "Invalid price source";
    };
    let url = switch (source) {
      case "coingecko" "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd";
      case "coinmarketcap" "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ICP&convert=USD";
      case "binance" "https://api.binance.com/api/v3/ticker/price?symbol=ICPUSDT";
      case "coinbase" "https://api.coinbase.com/v2/prices/ICP-USD/spot";
      case "kraken" "https://api.kraken.com/0/public/Ticker?pair=ICPUSD";
      case _ "https://api.coingecko.com/api/v3/simple/price?ids=internet-computer&vs_currencies=usd";
    };
    try {
      await OutCall.httpGetRequest(url, [], transform);
    } catch (e) {
      Debug.print("fetchIcpPrice error: " # e.message());
      "Internal error fetching price";
    };
  };

  // ===== ADMIN POOL MANAGEMENT =====

  public shared ({ caller }) func transferTokensBetweenPools(sourcePool : Text, destinationPool : Text, amount : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    initializeTokenPools();
    switch (tokenPools.get(sourcePool), tokenPools.get(destinationPool)) {
      case (?src, ?dest) {
        if (src.remaining < amount) {
          return #err("Insufficient balance in source pool");
        };
        tokenPools.add(sourcePool, { src with remaining = safeSub(src.remaining, amount) });
        tokenPools.add(destinationPool, { dest with remaining = dest.remaining + amount });

        let transactionId = nextTransactionId;
        nextTransactionId += 1;
        tokenTransactions.add(transactionId, {
          id = transactionId;
          from = null;
          to = null;
          amount;
          timestamp = Time.now();
          transactionType = "Pool Transfer";
          pool = ?sourcePool;
          status = "Completed";
          reference = ?("Transferred to " # destinationPool);
          ledgerHeight = null;
        });
        #ok(());
      };
      case (null, _) { #err("Source pool not found") };
      case (_, null) { #err("Destination pool not found") };
    };
  };

  public shared ({ caller }) func transferFromPoolToUser(poolName : Text, recipient : Text, amount : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    let recipientPrincipal : Principal = try {
      Principal.fromText(recipient)
    } catch (_) {
      return #err("Invalid recipient principal ID");
    };
    initializeTokenPools();
    switch (tokenPools.get(poolName)) {
      case (?pool) {
        if (pool.remaining < amount) {
          return #err("Insufficient balance in pool");
        };
        let recipientWallet = switch (userWallets.get(recipientPrincipal)) {
          case (?w) w;
          case null { return #err("Recipient does not have a wallet") };
        };
        tokenPools.add(poolName, { pool with remaining = safeSub(pool.remaining, amount) });

        let poolTxId = nextTransactionId;
        nextTransactionId += 1;
        let poolTx : TokenTransaction = {
          id = poolTxId;
          from = null;
          to = ?recipientPrincipal;
          amount;
          timestamp = Time.now();
          transactionType = "Pool to User";
          pool = ?poolName;
          status = "Completed";
          reference = ?("Transferred to " # recipient);
          ledgerHeight = null;
        };
        let userTxId = nextTransactionId;
        nextTransactionId += 1;
        let userTx : TokenTransaction = {
          id = userTxId;
          from = null;
          to = ?recipientPrincipal;
          amount;
          timestamp = Time.now();
          transactionType = "Receive";
          pool = ?poolName;
          status = "Completed";
          reference = ?("Received from pool " # poolName);
          ledgerHeight = null;
        };
        userWallets.add(recipientPrincipal, {
          recipientWallet with
          stkBalance = recipientWallet.stkBalance + amount;
          stkTransactions = recipientWallet.stkTransactions.concat([userTx]);
        });
        tokenTransactions.add(poolTxId, poolTx);
        tokenTransactions.add(userTxId, userTx);
        #ok(());
      };
      case null { #err("Pool not found") };
    };
  };

  public shared ({ caller }) func adjustPoolAllocation(poolName : Text, newTotal : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    initializeTokenPools();
    switch (tokenPools.get(poolName)) {
      case (?pool) {
        let difference = if (newTotal > pool.total) safeSub(newTotal, pool.total) else safeSub(pool.total, newTotal);
        let updatedRemaining = if (newTotal > pool.total) {
          pool.remaining + difference;
        } else {
          safeSub(pool.remaining, difference);
        };
        tokenPools.add(poolName, { pool with total = newTotal; remaining = updatedRemaining });

        let transactionId = nextTransactionId;
        nextTransactionId += 1;
        tokenTransactions.add(transactionId, {
          id = transactionId;
          from = null;
          to = null;
          amount = difference;
          timestamp = Time.now();
          transactionType = "Pool Adjustment";
          pool = ?poolName;
          status = "Completed";
          reference = ?("Adjusted total to " # newTotal.toText());
          ledgerHeight = null;
        });
        #ok(());
      };
      case null { #err("Pool not found") };
    };
  };

  public query ({ caller }) func getAdminAuditTrail() : async { #ok : [TokenTransaction]; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    let txs = tokenTransactions.values() |> _.toArray();
    #ok(txs.sort(func(a : TokenTransaction, b : TokenTransaction) : { #less; #equal; #greater } {
      if (a.timestamp > b.timestamp) { #less }
      else if (a.timestamp < b.timestamp) { #greater }
      else { #equal };
    }));
  };

  public query ({ caller }) func getPoolManagementHistory() : async { #ok : [TokenTransaction]; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    let filtered = tokenTransactions.values() |> _.toArray().filter(func(tx : TokenTransaction) : Bool {
      tx.transactionType == "Pool Transfer" or tx.transactionType == "Pool Adjustment"
    });
    #ok(filtered.sort(func(a : TokenTransaction, b : TokenTransaction) : { #less; #equal; #greater } {
      if (a.timestamp > b.timestamp) { #less }
      else if (a.timestamp < b.timestamp) { #greater }
      else { #equal };
    }));
  };

  public query ({ caller }) func getRealTimePoolBalances() : async { #ok : [TokenPool]; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    initializeTokenPools();
    #ok(tokenPools.values() |> _.toArray());
  };

  public query ({ caller }) func getTotalSupplyStatus() : async { #ok : Nat; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can perform this action");
    };
    #ok(totalSupply);
  };

  // ===== WALLET MANAGEMENT =====

  public shared ({ caller }) func initializeWallet(_icpAccountId : Text, stkPrincipalId : Text) : async { #ok : (); #err : Text } {
    // H4: removed auto-admin-assign — admin role is only granted via initializeAccessControl()
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can initialize wallets");
    };
    // Ensure token pools are initialized on first wallet creation
    if (not isInitialized) {
      initializeTokenPools();
    };
    // Always derive the canonical account ID from the caller's Principal so it
    // is permanently tied to their Internet Identity and never changes between deploys.
    let canonicalAccountId = Sha224.deriveAccountId(caller);
    switch (userWallets.get(caller)) {
      case (?_) { #err("Wallet already exists") };
      case null {
        userWallets.add(caller, {
          stkBalance = 0;
          icpTransactions = [];
          stkTransactions = [];
          icpAccountId = canonicalAccountId;
          stkPrincipalId;
        });
        #ok(());
      };
    };
  };

  public query ({ caller }) func getCallerWallet() : async ?Wallet {
    userWallets.get(caller);
  };

  // Returns the canonical ICP account ID derived from the caller's Principal.
  // This is the stable, permanent address tied to the user's Internet Identity.
  public query ({ caller }) func getCallerDerivedAccountId() : async Text {
    Sha224.deriveAccountId(caller);
  };

  // Re-derives the canonical account ID from the caller's Principal and updates the
  // stored wallet.icpAccountId. Call this if a wallet was initialized with an incorrect
  // account ID from a previous deploy.
  public shared ({ caller }) func recomputeMyAccountId() : async { #ok : Text; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can recompute their account ID");
    };
    let canonicalAccountId = Sha224.deriveAccountId(caller);
    switch (userWallets.get(caller)) {
      case (?wallet) {
        userWallets.add(caller, { wallet with icpAccountId = canonicalAccountId });
        #ok(canonicalAccountId);
      };
      case null { #err("Wallet not found. Please initialize your wallet first.") };
    };
  };

  public query func getWallet(user : Principal) : async ?Wallet {
    userWallets.get(user);
  };

  public shared ({ caller }) func addIcpTransaction(transaction : TokenTransaction) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can add ICP transactions");
    };
    switch (userWallets.get(caller)) {
      case (?wallet) {
        userWallets.add(caller, { wallet with icpTransactions = wallet.icpTransactions.concat([transaction]) });
        #ok(());
      };
      case null { #err("Wallet not found") };
    };
  };

  public shared ({ caller }) func addStkTransaction(transaction : TokenTransaction) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can add STK transactions");
    };
    switch (userWallets.get(caller)) {
      case (?wallet) {
        userWallets.add(caller, { wallet with stkTransactions = wallet.stkTransactions.concat([transaction]) });
        #ok(());
      };
      case null { #err("Wallet not found") };
    };
  };

  // ===== ICP BALANCE (public boundary: Nat, accepts Text hex account ID) =====
  public shared ({ caller }) func getCallerIcpBalance(accountIdText : Text) : async { #ok : Nat; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can check balances");
    };
    switch (hexToAccountIdBlob(accountIdText)) {
      case (#err(_)) { return #err("Invalid account ID format") };
      case (#ok(accountBlob)) {
        switch (getLedger()) {
          case (#err(msg)) { return #err(msg) };
          case (#ok(ledger)) {
            try {
              let balance = await ledger.account_balance({ account = accountBlob });
              #ok(nat64ToNat(balance.e8s));
            } catch (e) {
              Debug.print("account_balance error: " # e.message());
              #err("Internal error fetching ICP balance");
            };
          };
        };
      };
    };
  };

  public query ({ caller }) func getCallerStkBalance() : async Nat {
    switch (userWallets.get(caller)) {
      case (?wallet) wallet.stkBalance;
      case null 0;
    };
  };

  public query ({ caller }) func getCallerIcpTransactions() : async [TokenTransaction] {
    switch (userWallets.get(caller)) {
      case (?wallet) wallet.icpTransactions;
      case null [];
    };
  };

  public query ({ caller }) func getCallerStkTransactions() : async [TokenTransaction] {
    switch (userWallets.get(caller)) {
      case (?wallet) wallet.stkTransactions;
      case null [];
    };
  };

  public query ({ caller }) func getCallerAddresses() : async (Text, Text) {
    switch (userWallets.get(caller)) {
      case (?wallet) (wallet.icpAccountId, wallet.stkPrincipalId);
      case null ("", "");
    };
  };

  public query ({ caller }) func getCallerAccountIds() : async (Text, Text) {
    switch (userWallets.get(caller)) {
      case (?wallet) (wallet.icpAccountId, wallet.stkPrincipalId);
      case null ("", "");
    };
  };

  public query ({ caller }) func getCallerPrincipalId() : async Text {
    caller.toText();
  };

  public query ({ caller }) func getCallerWalletSummary() : async (Nat, [TokenTransaction], [TokenTransaction], Text, Text) {
    switch (userWallets.get(caller)) {
      case (?wallet) {
        (wallet.stkBalance, wallet.icpTransactions, wallet.stkTransactions, wallet.icpAccountId, wallet.stkPrincipalId);
      };
      case null (0, [], [], "", "");
    };
  };

  // ===== RECORD ICP SEND (called by frontend AFTER user's agent has sent ICP on-chain) =====
  // The actual ICP transfer is performed by the frontend using the user's Internet Identity agent
  // calling the ICP ledger directly. This function only records the transaction in the wallet.
  // The canister cannot sign for the user's personal ICP account — only the user can.
  public shared ({ caller }) func recordIcpSend(recipientAccountId : Text, amount : Nat, blockHeight : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can record ICP sends");
    };
    if (amount == 0) {
      return #err("Amount must be greater than 0");
    };
    switch (userWallets.get(caller)) {
      case null { return #err("Wallet not initialized") };
      case (?wallet) {
        let transactionId = nextTransactionId;
        nextTransactionId += 1;
        let tx : TokenTransaction = {
          id = transactionId;
          from = ?caller;
          to = null;
          amount;
          timestamp = Time.now();
          transactionType = "Send";
          pool = null;
          status = "Completed";
          reference = ?recipientAccountId;
          ledgerHeight = ?blockHeight;
        };
        tokenTransactions.add(transactionId, tx);
        userWallets.add(caller, { wallet with icpTransactions = wallet.icpTransactions.concat([tx]) });
        #ok(());
      };
    };
  };

  // ===== STK TOKENS =====

  public shared ({ caller }) func sendStkTokens(recipient : Text, amount : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can send STK tokens");
    };
    let recipientPrincipal : Principal = try {
      Principal.fromText(recipient)
    } catch (_) {
      return #err("Invalid recipient principal ID");
    };
    if (caller == recipientPrincipal) {
      return #err("Cannot send STK tokens to yourself");
    };
    let recipientWallet = switch (userWallets.get(recipientPrincipal)) {
      case (?w) w;
      case null { return #err("Recipient does not have a wallet") };
    };
    switch (userWallets.get(caller)) {
      case (?senderWallet) {
        let totalDeduction = amount + burnFee;
        if (senderWallet.stkBalance < totalDeduction) {
          return #err("Insufficient STK balance to cover amount plus burn fee of " # burnFee.toText());
        };
        let sendTxId = nextTransactionId;
        nextTransactionId += 1;
        let sendTx : TokenTransaction = {
          id = sendTxId;
          from = ?caller;
          to = ?recipientPrincipal;
          amount;
          timestamp = Time.now();
          transactionType = "Send";
          pool = null;
          status = "Completed";
          reference = ?recipient;
          ledgerHeight = null;
        };
        let recvTxId = nextTransactionId;
        nextTransactionId += 1;
        let recvTx : TokenTransaction = {
          id = recvTxId;
          from = ?caller;
          to = ?recipientPrincipal;
          amount;
          timestamp = Time.now();
          transactionType = "Receive";
          pool = null;
          status = "Completed";
          reference = ?recipient;
          ledgerHeight = null;
        };
        let burnTxId = nextTransactionId;
        nextTransactionId += 1;
        let burnTx : TokenTransaction = {
          id = burnTxId;
          from = ?caller;
          to = null;
          amount = burnFee;
          timestamp = Time.now();
          transactionType = "Burn";
          pool = null;
          status = "Completed";
          reference = ?("Fee burn on send to " # recipient);
          ledgerHeight = null;
        };
        userWallets.add(caller, {
          senderWallet with
          stkBalance = safeSub(senderWallet.stkBalance, totalDeduction);
          stkTransactions = senderWallet.stkTransactions.concat([sendTx, burnTx]);
        });
        userWallets.add(recipientPrincipal, {
          recipientWallet with
          stkBalance = recipientWallet.stkBalance + amount;
          stkTransactions = recipientWallet.stkTransactions.concat([recvTx]);
        });
        totalSupply := safeSub(totalSupply, burnFee);
        tokenTransactions.add(sendTxId, sendTx);
        tokenTransactions.add(recvTxId, recvTx);
        tokenTransactions.add(burnTxId, burnTx);
        #ok(());
      };
      case null { #err("Wallet not found") };
    };
  };

  public shared ({ caller }) func setBurnFee(newFee : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can set the burn fee");
    };
    burnFee := newFee;
    #ok(());
  };

  public query func getBurnFee() : async Nat {
    burnFee
  };

  public shared ({ caller }) func setMatchReward(newReward : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can set the match reward");
    };
    matchReward := newReward;
    #ok(());
  };

  public query func getMatchReward() : async Nat {
    matchReward
  };

  public shared ({ caller }) func setDailyRewardLimit(newLimit : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can set the daily reward limit");
    };
    dailyRewardLimit := newLimit;
    #ok(());
  };

  public query func getDailyRewardLimit() : async Nat {
    dailyRewardLimit
  };

  public shared ({ caller }) func receiveStkTokens(amount : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can credit STK tokens");
    };
    switch (userWallets.get(caller)) {
      case (?wallet) {
        let transactionId = nextTransactionId;
        nextTransactionId += 1;
        let tx : TokenTransaction = {
          id = transactionId;
          from = null;
          to = ?caller;
          amount;
          timestamp = Time.now();
          transactionType = "Receive";
          pool = null;
          status = "Completed";
          reference = null;
          ledgerHeight = null;
        };
        userWallets.add(caller, {
          wallet with
          stkBalance = wallet.stkBalance + amount;
          stkTransactions = wallet.stkTransactions.concat([tx]);
        });
        tokenTransactions.add(transactionId, tx);
        #ok(());
      };
      case null { #err("Wallet not found") };
    };
  };

  // ===== VERIFY ICP PAYMENT (public boundary: Nat) =====
  public shared ({ caller }) func verifyIcpPayment(accountIdText : Text) : async { #ok : Nat; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can verify ICP payments");
    };
    switch (hexToAccountIdBlob(accountIdText)) {
      case (#err(_)) { return #err("Invalid account ID format") };
      case (#ok(accountBlob)) {
        switch (getLedger()) {
          case (#err(msg)) { return #err(msg) };
          case (#ok(ledger)) {
            try {
              let bal = await ledger.account_balance({ account = accountBlob });
              #ok(nat64ToNat(bal.e8s));
            } catch (e) {
              Debug.print("verifyIcpPayment error: " # e.message());
              #err("Internal error verifying ICP payment");
            };
          };
        };
      };
    };
  };

  // ===== MINT STK TOKENS (PROOF-BASED — frontend sends ICP, backend verifies and mints) =====
  // ARCHITECTURE:
  // The canister cannot sign for the user's personal ICP account. Only the user can via
  // their Internet Identity agent. The correct flow is:
  //   1. Frontend uses user's agent to call ICP ledger directly and transfer ICP to
  //      the admin treasury account (getAdminTreasuryAddress()).
  //   2. Frontend passes the resulting block height (icpBlockHeight) to this function.
  //   3. This function verifies the admin treasury has received at least icpAmount ICP
  //      by checking its current balance on-chain.
  //   4. ONLY if balance is sufficient does STK get minted.
  //
  // Note: We verify the admin treasury balance (not a specific block) as MVP verification.
  // Admin MUST configure adminIcpWallet via setAdminIcpWallet/setAdminTreasuryAccount.
  public shared ({ caller }) func mintStkTokens(icpAmount : Nat, stkAmount : Nat, exchangeRate : Nat, icpBlockHeight : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can mint STK tokens");
    };
    if (icpAmount == 0 or stkAmount == 0) {
      return #err("Amount must be greater than 0");
    };

    // C2: CallerGuard — reject concurrent minting calls from the same principal.
    // Prevents a second in-flight call from racing through the await window.
    if (activeMintCallers.get(caller) != null) {
      return #err("Minting already in progress for this account. Please wait.");
    };
    activeMintCallers.add(caller, true);

    // Prevent double-minting: reserve block height before any await so that
    // concurrent calls from DIFFERENT principals cannot both pass this check.
    if (usedMintBlockHeights.get(icpBlockHeight) != null) {
      activeMintCallers.remove(caller);
      return #err("This ICP block height has already been used for minting");
    };
    usedMintBlockHeights.add(icpBlockHeight, true);

    // Step 1: Admin treasury MUST be configured
    let adminAddr = switch (adminIcpWallet) {
      case null {
        activeMintCallers.remove(caller);
        return #err("Minting is not available: admin treasury not configured. Contact admin.");
      };
      case (?addr) addr;
    };

    // Step 2: Get ledger
    let ledger = switch (getLedger()) {
      case (#err(msg)) {
        activeMintCallers.remove(caller);
        return #err(msg);
      };
      case (#ok(l)) l;
    };

    // Step 3: Convert admin treasury address to Blob
    let adminTreasuryBlob = switch (hexToAccountIdBlob(adminAddr)) {
      case (#err(_)) {
        activeMintCallers.remove(caller);
        return #err("Admin treasury address is invalid. Contact admin.");
      };
      case (#ok(b)) b;
    };

    // Step 4: Verify admin treasury balance on-chain (confirms ICP was received)
    let treasuryBalance : Nat = try {
      let bal = await ledger.account_balance({ account = adminTreasuryBlob });
      nat64ToNat(bal.e8s);
    } catch (e) {
      // C1: must release both the blockHeight reservation and the CallerGuard on network error
      // so the user can retry once the ledger is reachable again.
      usedMintBlockHeights.remove(icpBlockHeight);
      activeMintCallers.remove(caller);
      Debug.print("mintStkTokens treasury balance check error: " # e.message());
      return #err("Internal error verifying ICP payment");
    };

    if (treasuryBalance < treasuryClaimedIcp + icpAmount) {
      Debug.print("mintStkTokens: treasury balance " # treasuryBalance.toText() # " < claimed " # treasuryClaimedIcp.toText() # " + required " # icpAmount.toText());
      usedMintBlockHeights.remove(icpBlockHeight);
      activeMintCallers.remove(caller);
      return #err("ICP payment not yet confirmed. Please send ICP to the admin treasury address first, then retry.");
    };
    // Reserve this ICP amount against the treasury before any further awaits
    treasuryClaimedIcp += icpAmount;

    // Step 5: Wallet must exist to receive STK
    let wallet = switch (userWallets.get(caller)) {
      case null {
        activeMintCallers.remove(caller);
        return #err("Wallet not initialized");
      };
      case (?w) w;
    };

    // Step 6: Record ICP payment transaction (with proof block height from frontend)
    let icpTxId = nextTransactionId;
    nextTransactionId += 1;
    let icpTx : TokenTransaction = {
      id = icpTxId;
      from = ?caller;
      to = null;
      amount = icpAmount;
      timestamp = Time.now();
      transactionType = "ICP Payment";
      pool = null;
      status = "Completed";
      reference = ?("STK mint: " # stkAmount.toText());
      ledgerHeight = ?icpBlockHeight;
    };
    tokenTransactions.add(icpTxId, icpTx);

    // Step 7: Record STK mint transaction
    let stkTxId = nextTransactionId;
    nextTransactionId += 1;
    let stkTx : TokenTransaction = {
      id = stkTxId;
      from = null;
      to = ?caller;
      amount = stkAmount;
      timestamp = Time.now();
      transactionType = "Mint";
      pool = ?("Minting Platform");
      status = "Completed";
      reference = ?("ICP block height: " # icpBlockHeight.toText());
      ledgerHeight = ?icpBlockHeight;
    };
    tokenTransactions.add(stkTxId, stkTx);

    // Step 8: Update user wallet — append both transactions, credit STK
    userWallets.add(caller, {
      wallet with
      stkBalance = wallet.stkBalance + stkAmount;
      icpTransactions = wallet.icpTransactions.concat([icpTx]);
      stkTransactions = wallet.stkTransactions.concat([stkTx]);
    });

    // Step 9: Record PaymentTransaction for audit
    let paymentId = nextPaymentId;
    nextPaymentId += 1;
    paymentTransactions.add(paymentId, {
      id = paymentId;
      user = caller;
      icpAmount;
      stkAmount;
      exchangeRate;
      timestamp = Time.now();
      status = "Completed";
      reference = ?("ICP block height: " # icpBlockHeight.toText());
    });

    // Step 10: Update user STK balance map
    let currBal = switch (userBalances.get(caller)) { case (?b) b; case null 0 };
    userBalances.add(caller, currBal + stkAmount);

    // H2: increment totalSupply on every mint (was previously never incremented)
    totalSupply += stkAmount;

    // Step 11: Decrement minting platform pool
    switch (tokenPools.get("Minting Platform")) {
      case (?pool) {
        tokenPools.add("Minting Platform", { pool with remaining = safeSub(pool.remaining, stkAmount) });
      };
      case null {};
    };

    activeMintCallers.remove(caller);
    #ok(());
  };

  // ===== FILE REGISTRY (inline replacement for blob-storage/registry) =====

  public shared ({ caller }) func registerFileReference(path : Text, hash : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can register file references");
    };
    registry.references.add(path, { path; hash });
  };

  public query func getFileReference(path : Text) : async ?FileReference {
    registry.references.get(path);
  };

  public query func listFileReferences() : async [FileReference] {
    registry.references.values() |> _.toArray();
  };

  public shared ({ caller }) func dropFileReference(path : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can drop file references");
    };
    registry.references.remove(path);
  };

  // ===== PLAY TO EARN =====

  // Records the start of a game session using a canister-trusted timestamp.
  // Must be called before saveGame(). The frontend cannot spoof this value.
  public shared ({ caller }) func startGame() : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can start games");
    };
    gameStartTimes.add(caller, Time.now());
    #ok(());
  };

  // Returns the configured per-game STK reward, or 0 if the pool is empty.
  func computeRewardPerGame() : Nat {
    let poolRemaining = switch (tokenPools.get("In-Game Rewards")) {
      case (?p) p.remaining;
      case null { return 0 };
    };
    if (poolRemaining == 0) { return 0 };
    matchReward
  };

  // Claims the play-to-earn reward for a completed game.
  // Enforces:
  //   - Caller called startGame() before saveGame()
  //   - At least 20 minutes elapsed between startGame() and game.timestamp
  //   - Max 2 reward-earning games per rolling 24-hour window
  //   - Each game ID can only be claimed once
  public shared ({ caller }) func claimGameReward(gameId : Nat) : async { #ok : Nat; #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return #err("Unauthorized: Only users can claim game rewards");
    };

    let wallet = switch (userWallets.get(caller)) {
      case null { return #err("Wallet not initialized") };
      case (?w) w;
    };

    let game = switch (games.get(gameId)) {
      case null { return #err("Game not found") };
      case (?g) g;
    };
    switch (game.owner) {
      case (?owner) {
        if (owner != caller) { return #err("You are not the owner of this game") };
      };
      case null { return #err("This game has no owner") };
    };

    if (claimedRewardGames.get(gameId) != null) {
      return #err("Reward already claimed for this game");
    };

    // Verify 20-minute minimum using canister-trusted timestamps
    let minDurationNs : Int = 20 * 60 * 1_000_000_000;
    let startTime = switch (gameStartTimes.get(caller)) {
      case null { return #err("No active game session. Call startGame() before playing.") };
      case (?t) t;
    };
    if (game.timestamp - startTime < minDurationNs) {
      return #err("Game must be at least 20 minutes long to earn rewards");
    };

    // Rolling 24-hour daily cap derived from dailyRewardLimit / matchReward
    let dayNs : Int = 24 * 60 * 60 * 1_000_000_000;
    let now = Time.now();
    let tracking = switch (dailyRewardTracking.get(caller)) {
      case (?t) t;
      case null { { lastEarnTime = 0; earnedToday = 0 } };
    };
    let gamesEarnedToday : Nat = if (now - tracking.lastEarnTime >= dayNs) 0
                                  else tracking.earnedToday;
    let rewardPerGame = Nat.max(1, matchReward);
    let maxGamesPerDay = Nat.max(1, dailyRewardLimit / rewardPerGame);
    if (gamesEarnedToday >= maxGamesPerDay) {
      return #err("Daily reward limit reached. You can earn up to " # dailyRewardLimit.toText() # " STK (" # maxGamesPerDay.toText() # " games) per 24-hour period.");
    };

    let reward = computeRewardPerGame();
    if (reward == 0) {
      return #err("In-Game Rewards pool is empty");
    };

    // Record pool start time on the first ever reward distribution
    if (rewardsPoolStart <= 0) {
      rewardsPoolStart := now;
    };

    // Mark game as claimed and clear caller's session start (before any state mutation)
    claimedRewardGames.add(gameId, true);
    gameStartTimes.remove(caller);

    // Build reward transaction
    let txId = nextTransactionId;
    nextTransactionId += 1;
    let tx : TokenTransaction = {
      id = txId;
      from = null;
      to = ?caller;
      amount = reward;
      timestamp = now;
      transactionType = "Play-to-Earn";
      pool = ?"In-Game Rewards";
      status = "Completed";
      reference = ?("Game #" # gameId.toText());
      ledgerHeight = null;
    };
    tokenTransactions.add(txId, tx);

    // Credit STK to wallet and balance map
    userWallets.add(caller, {
      wallet with
      stkBalance = wallet.stkBalance + reward;
      stkTransactions = wallet.stkTransactions.concat([tx]);
    });
    let currBal = switch (userBalances.get(caller)) { case (?b) b; case null 0 };
    userBalances.add(caller, currBal + reward);

    // Update rolling daily tracking
    dailyRewardTracking.add(caller, { lastEarnTime = now; earnedToday = gamesEarnedToday + 1 });

    // Track unique earners for the scaling formula (only increments, never decrements)
    if (rewardEarners.get(caller) == null) {
      rewardEarners.add(caller, true);
      rewardEarnerCount += 1;
    };

    // Decrement the In-Game Rewards pool
    switch (tokenPools.get("In-Game Rewards")) {
      case (?pool) {
        tokenPools.add("In-Game Rewards", { pool with remaining = safeSub(pool.remaining, reward) });
      };
      case null {};
    };

    #ok(reward)
  };

  // Returns the current dynamically computed per-game reward for UI display.
  public query func getCurrentRewardPerGame() : async Nat {
    computeRewardPerGame()
  };

  // Returns the caller's current reward status for the UI.
  public query ({ caller }) func getCallerRewardStatus() : async {
    gamesEarnedToday : Nat;
    dailyCap : Nat;
    rewardPerGame : Nat;
    canClaim : Bool;
  } {
    let dayNs : Int = 24 * 60 * 60 * 1_000_000_000;
    let now = Time.now();
    let tracking = switch (dailyRewardTracking.get(caller)) {
      case (?t) t;
      case null { { lastEarnTime = 0; earnedToday = 0 } };
    };
    let gamesEarnedToday = if (now - tracking.lastEarnTime >= dayNs) 0
                           else tracking.earnedToday;
    let reward = computeRewardPerGame();
    let rewardPerGameVal = Nat.max(1, matchReward);
    let maxGamesPerDayVal = Nat.max(1, dailyRewardLimit / rewardPerGameVal);
    {
      gamesEarnedToday;
      dailyCap = maxGamesPerDayVal;
      rewardPerGame = reward;
      canClaim = gamesEarnedToday < maxGamesPerDayVal and reward > 0;
    }
  };
};
