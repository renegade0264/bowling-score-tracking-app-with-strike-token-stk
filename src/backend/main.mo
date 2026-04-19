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

  // ===== ICRC-1 STK LEDGER TYPES =====

  let STK_LEDGER_ID : Text = "5h55w-zaaaa-aaaal-qwzjq-cai";
  let STK_E8S : Nat = 100_000_000; // 1 STK unit = 100_000_000 base units
  let STK_TRANSFER_FEE : Nat = 100_000; // 0.001 STK per transfer — matches ledger fee (cached; retried on BadFee)
  let STK_PER_ICP : Nat = 50_000; // 50,000 STK per 1 ICP (500M supply tokenomics)

  // Treasury subaccount [1]: 31 zero bytes followed by 0x01.
  // Holds 499,999,987 STK on the ICRC-1 ledger; all pool distributions pull from here.
  //
  // ⚠️  ICRC-2 SAFETY: NEVER use from_subaccount = null when calling icrc2_approve.
  //     null subaccount = the minting account (a6p2m-...[null]). The ICRC-1 spec
  //     forbids the minting account from calling icrc2_approve — it will fail silently.
  //     Always pass from_subaccount = ?TREASURY_SUBACCOUNT for all approve calls.
  let TREASURY_SUBACCOUNT : Blob = "\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01";

  type Icrc1Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  type Icrc1TransferArg = {
    from_subaccount : ?Blob;
    to : Icrc1Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  type Icrc1TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  type StkLedger = actor {
    icrc1_balance_of : shared query (Icrc1Account) -> async Nat;
    icrc1_transfer : shared (Icrc1TransferArg) -> async { #Ok : Nat; #Err : Icrc1TransferError };
  };

  func getStkLedger() : StkLedger {
    actor (STK_LEDGER_ID) : StkLedger
  };

  // Transfers `e8sAmount` from the treasury subaccount [01] to `to` on the ICRC-1 ledger.
  // Handles three cases uniformly across all three call sites:
  //   #Ok        → success, returns true
  //   #Duplicate → idempotent success (transfer already committed), returns true
  //   #BadFee    → retries ONCE with the ledger's expected_fee; same created_at_time
  //                ensures deduplication if first attempt was somehow committed
  //   anything else → logs, returns false (Map write already committed — best-effort)
  // On success, increments burnedFeeE8s by the fee that was burned.
  func stkTreasuryTransfer(to : Principal, e8sAmount : Nat, ts : Nat64, ctx : Text) : async Bool {
    let stkLedger = getStkLedger();
    func doTransfer(feeUsed : Nat) : async { #ok; #badFee : Nat; #fail } {
      try {
        let r = await stkLedger.icrc1_transfer({
          from_subaccount = ?TREASURY_SUBACCOUNT;
          to = { owner = to; subaccount = null };
          amount = e8sAmount;
          fee = ?feeUsed;
          memo = null;
          created_at_time = ?ts;
        });
        switch (r) {
          case (#Ok(blk)) {
            Debug.print(ctx # " ICRC-1 OK block=" # Nat.toText(blk));
            #ok;
          };
          case (#Err(#Duplicate { duplicate_of })) {
            // Transaction already on-chain — idempotent success.
            Debug.print(ctx # " ICRC-1 deduped (block=" # Nat.toText(duplicate_of) # ") — success");
            #ok;
          };
          case (#Err(#BadFee { expected_fee })) {
            #badFee(expected_fee);
          };
          case (#Err(e)) {
            let msg = switch (e) {
              case (#InsufficientFunds { balance }) "InsufficientFunds bal=" # Nat.toText(balance);
              case (#GenericError { message }) "GenericError: " # message;
              case (#TooOld) "TooOld";
              case (#CreatedInFuture _) "CreatedInFuture";
              case (#TemporarilyUnavailable) "TemporarilyUnavailable";
              case (#BadBurn _) "BadBurn";
              case (#BadFee _) "BadFee"; // already handled above
              case (#Duplicate _) "Duplicate"; // already handled above
            };
            Debug.print(ctx # " ICRC-1 FAILED (Map OK): " # msg);
            #fail;
          };
        };
      } catch (ex) {
        Debug.print(ctx # " ICRC-1 exception (Map OK): " # ex.message());
        #fail;
      };
    };
    // First attempt with cached fee.
    let r1 = await doTransfer(STK_TRANSFER_FEE);
    switch (r1) {
      case (#ok) { burnedFeeE8s += STK_TRANSFER_FEE; true };
      case (#fail) false;
      case (#badFee(correctFee)) {
        // Ledger fee changed — retry once with the correct fee.
        // Same created_at_time keeps deduplication intact.
        Debug.print(ctx # " BadFee: retrying with fee=" # Nat.toText(correctFee));
        let r2 = await doTransfer(correctFee);
        switch (r2) {
          case (#ok) { burnedFeeE8s += correctFee; true };
          case _ false;
        };
      };
    };
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
  var totalSupply : Nat = 500_000_000;
  var isInitialized : Bool = false;
  var burnFee : Nat = 0; // 0.001 STK ledger fee (100_000 e8s) is the effective cost; Map balances are whole-STK integers
  var matchReward : Nat = 50;
  var dailyRewardLimit : Nat = 2_500;
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
  // Accumulated ICRC-1 transfer fees burned (in e8s). Fee_collector = null means all fees
  // are burned, reducing on-chain total_supply. Tracked here for accounting accuracy.
  var burnedFeeE8s : Nat = 0;
  // Rolling 24-hour cap on admin STK distributions via transferFromPoolToUser (P2-D).
  let MAX_ADMIN_DISTRIBUTION_PER_DAY : Nat = 500_000; // whole STK
  var adminDistributedToday : Nat = 0;
  var adminDistributionDayStart : Int = 0;
  // One-time flag: set to true after the double-spend correction runs in postupgrade.
  var doubleSpendCorrectionApplied : Bool = false;
  // One-time flag: set to true after totalSupply is reset to 1_000_000 in postupgrade.
  var totalSupplyCorrectionApplied : Bool = false;
  // One-time flag: set to true after 500M tokenomics upgrade (totalSupply, matchReward, dailyRewardLimit).
  var tokenomics500MApplied : Bool = false;
  // One-time flag: set to true after burnFee is zeroed to align with 0.001 STK ledger fee.
  var burnFeeZeroApplied : Bool = false;
  // One-time flag: set to true after xai2m-... balance is scaled to 7,000 STK for 500M supply.
  var mintedTokensScaledApplied : Bool = false;
  // One-time flag: set to true after circulatingSupply is confirmed at 7,000 for 500M supply.
  var circulatingSupply500MApplied : Bool = false;
  // One-time flag: set to true after totalMinted is confirmed at 7,000 for 500M supply.
  var totalMinted500MApplied : Bool = false;
  // One-time flag: set to true after initializeAccessControl is called (prevents re-initialization).
  var accessControlInitialized : Bool = false;
  // One-time flag: set to true after totalSupply is reconciled with actual ledger state (500,006,930).
  var ledgerSupplyReconciled : Bool = false;
  // One-time flag: set to true after Minting Platform pool remaining is reduced by 7,000 to
  // reflect the tokens already distributed via the mintedTokensScaledApplied postupgrade.
  var mintingPlatformBaselineApplied : Bool = false;
  // Circulating supply: STK tokens currently held in user wallets.
  // Initialised at 7_000 to match the scaled balance of xai2m-... at 500M supply.
  var circulatingSupply : Nat = 7_000;
  // Total STK ever minted/distributed to users (cumulative, never decremented).
  // Initialised at 7_000 to account for all tokens credited before this var was introduced.
  var totalMinted : Nat = 7_000;

  let accessControlState = AccessControl.initState();

  // ===== AUTO-INITIALIZATION HELPERS =====

  // ===== SYSTEM HOOKS =====

  // L1: Reject anonymous ingress messages before they consume cycles.
  // moc 1.3.0: system func inspect takes a record with caller; return true = accept, false = reject.
  system func inspect({ caller : Principal }) : Bool {
    not caller.isAnonymous()
  };

  // One-time double-spend correction: subtracts 2 STK that were minted via the
  // pre-audit treasury-balance race (block heights 35693427 and 35701273 reused
  // the same treasury balance as 35693419 and 35701254 respectively).
  // Guarded by doubleSpendCorrectionApplied so it only ever runs once.
  system func postupgrade() {
    if (not doubleSpendCorrectionApplied) {
      let victim = Principal.fromText("xai2m-ngxnm-xmdef-p75bs-rnfux-cwlos-47xke-rrxst-bmjx7-gqfnb-fae");
      let correction : Nat = 2;
      switch (userWallets.get(victim)) {
        case (?wallet) {
          if (wallet.stkBalance >= correction) {
            userWallets.add(victim, { wallet with stkBalance = wallet.stkBalance - correction });
          };
        };
        case null {};
      };
      let currBal = switch (userBalances.get(victim)) { case (?b) b; case null 0 };
      userBalances.add(victim, safeSub(currBal, correction));
      doubleSpendCorrectionApplied := true;
    };
    // One-time totalSupply reset to 500_000_000 (500M token tokenomics upgrade).
    // Previous correction set it to 1_000_000; this upgrades to the new cap.
    if (not totalSupplyCorrectionApplied) {
      totalSupply := 500_000_000;
      totalSupplyCorrectionApplied := true;
    };
    // 500M tokenomics upgrade: set totalSupply, matchReward, dailyRewardLimit to new values.
    // Needed because these persistent vars were set before this upgrade was deployed.
    if (not tokenomics500MApplied) {
      totalSupply := 500_000_000;
      matchReward := 50;
      dailyRewardLimit := 2_500;
      tokenomics500MApplied := true;
    };
    // Zero out burnFee to align with the 0.001 STK ledger fee (100_000 e8s).
    // Map balances are whole-STK integers so 0 is the correct representation of < 1 STK.
    if (not burnFeeZeroApplied) {
      burnFee := 0;
      burnFeeZeroApplied := true;
    };
    // Scale xai2m-... balance from 14 STK (at 1M supply) to 7,000 STK (at 500M supply).
    // Proportional: 14 / 1_000_000 * 500_000_000 = 7_000 STK.
    // Also resets circulatingSupply and totalMinted to the correct scaled baseline.
    if (not mintedTokensScaledApplied) {
      let scaledUser = Principal.fromText("xai2m-ngxnm-xmdef-p75bs-rnfux-cwlos-47xke-rrxst-bmjx7-gqfnb-fae");
      switch (userWallets.get(scaledUser)) {
        case (?wallet) {
          userWallets.add(scaledUser, { wallet with stkBalance = 7_000 });
        };
        case null {};
      };
      userBalances.add(scaledUser, 7_000);
      circulatingSupply := 7_000;
      totalMinted := 7_000;
      mintedTokensScaledApplied := true;
    };
    // Confirm circulatingSupply is set to 7,000 to reflect 500M supply baseline.
    if (not circulatingSupply500MApplied) {
      circulatingSupply := 7_000;
      circulatingSupply500MApplied := true;
    };
    // Confirm totalMinted is set to 7,000 to reflect 500M supply baseline.
    if (not totalMinted500MApplied) {
      totalMinted := 7_000;
      totalMinted500MApplied := true;
    };
    // Reconcile totalSupply with actual ICRC-1 ledger state: 500,006,930 STK on-chain
    // (6,930 STK more than 500,000,000 due to test mints before the 500M upgrade).
    if (not ledgerSupplyReconciled) {
      totalSupply := 500_006_930;
      ledgerSupplyReconciled := true;
    };
    // Deduct 7,000 from Minting Platform pool remaining to reflect the tokens already
    // distributed via mintedTokensScaledApplied (credited directly to wallet, bypassing pool).
    // Fixes all frontend "distributed" displays which derive from pool.total - pool.remaining.
    if (not mintingPlatformBaselineApplied) {
      switch (tokenPools.get("Minting Platform")) {
        case (?pool) {
          tokenPools.add("Minting Platform", { pool with remaining = safeSub(pool.remaining, 7_000) });
        };
        case null {};
      };
      mintingPlatformBaselineApplied := true;
    };
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
      tokenPools.add("RPG and NFT Ecosystem",      { name = "RPG and NFT Ecosystem";      total = 125_000_000; remaining = 125_000_000 });
      tokenPools.add("SNS Decentralization Swap",   { name = "SNS Decentralization Swap";   total = 125_000_000; remaining = 125_000_000 });
      tokenPools.add("Minting Platform",             { name = "Minting Platform";             total =  75_000_000; remaining =  75_000_000 });
      tokenPools.add("Play-to-Earn Rewards",         { name = "Play-to-Earn Rewards";         total =  75_000_000; remaining =  75_000_000 });
      tokenPools.add("Ecosystem Treasury",           { name = "Ecosystem Treasury";           total =  25_000_000; remaining =  25_000_000 });
      tokenPools.add("DEX Liquidity",                { name = "DEX Liquidity";                total =  25_000_000; remaining =  25_000_000 });
      tokenPools.add("Team and Development",         { name = "Team and Development";         total =  25_000_000; remaining =  25_000_000 });
      tokenPools.add("The Forge Reserve",            { name = "The Forge Reserve";            total =  12_500_000; remaining =  12_500_000 });
      tokenPools.add("Marketing and Partnerships",   { name = "Marketing and Partnerships";   total =  12_500_000; remaining =  12_500_000 });
      isInitialized := true;
    };
  };

  // Admin-only: wipes ALL pool entries (old and new names) and reinitializes
  // the canonical 9-pool 500M tokenomics from scratch.
  // Accepts app admin (via AccessControl) or canister controller.
  let CANISTER_CONTROLLER : Principal = Principal.fromText("cmanb-aejth-shdoi-krt5o-ijy5p-tineu-7lrav-guzka-k4qxk-2f55o-3qe");
  public shared ({ caller }) func resetTokenPools() : async { #ok : (); #err : Text } {
    let isAppAdmin = AccessControl.hasPermission(accessControlState, caller, #admin);
    let isController = caller == CANISTER_CONTROLLER;
    if (not isAppAdmin and not isController) {
      return #err("Unauthorized: Only admins or the canister controller can reset token pools");
    };
    // Remove every pool name that has ever existed (remove is a no-op if absent).
    // Legacy names:
    tokenPools.remove("Treasury Reserves");
    tokenPools.remove("In-Game Rewards");
    tokenPools.remove("Admin Team Wallet");
    tokenPools.remove("NFT Staking Rewards");
    tokenPools.remove("Exchange Liquidity");
    tokenPools.remove("Community Airdrop");
    tokenPools.remove("Partnerships and Collabs");
    // Previous 500M-era names that are being replaced or reallocated:
    tokenPools.remove("RPG and NFT Ecosystem");
    tokenPools.remove("SNS Decentralization Swap");
    tokenPools.remove("Minting Platform");
    tokenPools.remove("Play-to-Earn Rewards");
    tokenPools.remove("Ecosystem Treasury");
    tokenPools.remove("DEX Liquidity");
    tokenPools.remove("Team and Development");
    tokenPools.remove("The Forge Reserve");
    tokenPools.remove("Marketing and Partnerships");
    // Reinitialize with the canonical 9 pools.
    isInitialized := false;
    initializeTokenPools();
    #ok(());
  };

  // ===== ACCESS CONTROL =====

  include MixinAuthorization(accessControlState);
  include MixinObjectStorage();

  public shared ({ caller }) func initializeAccessControl() : async () {
    // FIX 2: Guard against re-initialization — only the first caller becomes admin.
    if (accessControlInitialized) {
      return;
    };
    AccessControl.initialize(accessControlState, caller);
    initializeTokenPools();
    accessControlInitialized := true;
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
      case (#ok(())) {
        // FIX 4: Track supply for admin-initiated payments (was missing before).
        circulatingSupply += stkAmount;
        totalMinted += stkAmount;
      };
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

  // FIX 1 (P0): Added admin-only guard. Previously `public func` with no caller — any
  // canister or user could inject arbitrary price data. Changed to public shared so we
  // have a caller and can enforce AccessControl.
  public shared ({ caller }) func updatePriceFeed(source : Text, icpUsd : Nat, status : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update price feeds");
    };
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

  public query func getCirculatingSupply() : async Nat {
    circulatingSupply;
  };

  public query func getTotalMinted() : async Nat {
    totalMinted;
  };

  // Accumulated ICRC-1 transfer fees that have been burned (fee_collector = null).
  // Each successful treasury transfer burns STK_TRANSFER_FEE (0.01 STK = 1_000_000 e8s).
  // This tracks the total reduction in on-chain total_supply caused by fee burns.
  public query func getBurnedFees() : async Nat {
    burnedFeeE8s;
  };

  // Admin distribution tracking: how many STK have been distributed today and the
  // remaining allowance before the 10,000 STK/day rolling cap is hit.
  public query ({ caller }) func getAdminDistributionStatus() : async { distributedToday : Nat; remainingToday : Nat; dailyCap : Nat } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return { distributedToday = 0; remainingToday = 0; dailyCap = 0 };
    };
    let remaining = safeSub(MAX_ADMIN_DISTRIBUTION_PER_DAY, adminDistributedToday);
    { distributedToday = adminDistributedToday; remainingToday = remaining; dailyCap = MAX_ADMIN_DISTRIBUTION_PER_DAY };
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

    // P2-D: Rolling 24-hour cap on admin distributions to limit treasury drain risk.
    let now = Time.now();
    let dayNs : Int = 24 * 60 * 60 * 1_000_000_000;
    if (now - adminDistributionDayStart >= dayNs) {
      adminDistributedToday := 0;
      adminDistributionDayStart := now;
    };
    if (adminDistributedToday + amount > MAX_ADMIN_DISTRIBUTION_PER_DAY) {
      return #err("Daily admin distribution limit reached (" # MAX_ADMIN_DISTRIBUTION_PER_DAY.toText() # " STK/day). Distributed today: " # adminDistributedToday.toText() # " STK.");
    };
    adminDistributedToday += amount;

    initializeTokenPools();
    switch (tokenPools.get(poolName)) {
      case (?pool) {
        if (pool.remaining < amount) {
          adminDistributedToday := safeSub(adminDistributedToday, amount); // undo reservation on early exit
          return #err("Insufficient balance in pool");
        };
        let recipientWallet = switch (userWallets.get(recipientPrincipal)) {
          case (?w) w;
          case null {
            adminDistributedToday := safeSub(adminDistributedToday, amount);
            return #err("Recipient does not have a wallet");
          };
        };
        tokenPools.add(poolName, { pool with remaining = safeSub(pool.remaining, amount) });

        let ts = Nat64.fromNat(Int.abs(now));
        let poolTxId = nextTransactionId;
        nextTransactionId += 1;
        let poolTx : TokenTransaction = {
          id = poolTxId;
          from = null;
          to = ?recipientPrincipal;
          amount;
          timestamp = now;
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
          timestamp = now;
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
        totalMinted += amount;
        circulatingSupply += amount; // FIX 3: was missing — admin pool distributions also enter circulation

        // Dual-write: move from treasury subaccount [01] to recipient's ICRC-1 account.
        // Best-effort — Map updates above are authoritative.
        // BadFee retried once; #Duplicate treated as idempotent success.
        ignore await stkTreasuryTransfer(recipientPrincipal, amount * STK_E8S, ts, "pool->user");

        #ok(());
      };
      case null {
        adminDistributedToday := safeSub(adminDistributedToday, amount);
        #err("Pool not found");
      };
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

  // Queries the ICRC-1 STK ledger as the authoritative source, falls back to the
  // Map cache if the ledger is unreachable. Returns base units (e8s): 1 STK = 100_000_000.
  public shared ({ caller }) func getCallerStkBalanceLive() : async Nat {
    try {
      let stkLedger = getStkLedger();
      await stkLedger.icrc1_balance_of({ owner = caller; subaccount = null });
    } catch (_) {
      // Map fallback — convert whole STK units to e8s for a consistent return type
      switch (userWallets.get(caller)) {
        case (?wallet) wallet.stkBalance * STK_E8S;
        case null 0;
      };
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
    if (amount == 0) { // FIX 7: reject zero-value sends
      return #err("Amount must be greater than 0");
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
        circulatingSupply := safeSub(circulatingSupply, burnFee);
        tokenTransactions.add(sendTxId, sendTx);
        tokenTransactions.add(recvTxId, recvTx);
        tokenTransactions.add(burnTxId, burnTx);
        #ok(());
      };
      case null { #err("Wallet not found") };
    };
  };

  // Admin-only correction tool: burns an exact amount from a user's wallet and
  // totalSupply to reverse double-minted tokens without applying the normal burn fee.
  public shared ({ caller }) func adminBurnTokens(user : Principal, amount : Nat) : async { #ok : (); #err : Text } {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      return #err("Unauthorized: Only admins can burn tokens");
    };
    switch (userWallets.get(user)) {
      case null { return #err("Wallet not found for principal: " # user.toText()) };
      case (?wallet) {
        if (wallet.stkBalance < amount) {
          return #err("Insufficient balance: wallet has " # wallet.stkBalance.toText() # " STK, cannot burn " # amount.toText());
        };
        userWallets.add(user, { wallet with stkBalance = wallet.stkBalance - amount });
      };
    };
    let currBal = switch (userBalances.get(user)) { case (?b) b; case null 0 };
    userBalances.add(user, safeSub(currBal, amount));
    circulatingSupply := safeSub(circulatingSupply, amount);
    #ok(());
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
    if (amount == 0) {
      return #err("Amount must be greater than 0");
    };
    // FIX 5: Enforce pool accounting — deduct from Minting Platform and track supply.
    switch (tokenPools.get("Minting Platform")) {
      case (?pool) {
        if (pool.remaining < amount) {
          return #err("Minting Platform pool has insufficient remaining balance");
        };
        tokenPools.add("Minting Platform", { pool with remaining = safeSub(pool.remaining, amount) });
      };
      case null { return #err("Minting Platform pool not initialized") };
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
          pool = ?"Minting Platform";
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
        circulatingSupply += amount;
        totalMinted += amount;
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

    // Validate exchange rate: stkAmount must equal icpAmount * STK_PER_ICP / 100_000_000 (ICP e8s).
    // This enforces the 50,000 STK per 1 ICP rate on the canister side.
    let expectedStk = icpAmount * STK_PER_ICP / 100_000_000;
    if (stkAmount != expectedStk) {
      return #err("Invalid exchange rate: expected " # expectedStk.toText() # " STK for given ICP amount at " # STK_PER_ICP.toText() # " STK/ICP");
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
    circulatingSupply += stkAmount;
    totalMinted += stkAmount;

    // Step 11: Decrement Minting Platform pool
    switch (tokenPools.get("Minting Platform")) {
      case (?pool) {
        tokenPools.add("Minting Platform", { pool with remaining = safeSub(pool.remaining, stkAmount) });
      };
      case null {};
    };

    // Step 12: Dual-write — move STK from treasury subaccount [01] to caller's ICRC-1 account.
    // Using the treasury (not the minting account) keeps total supply fixed at 500,006,930 STK.
    // Best-effort: Map is authoritative; ICRC-1 failure does not revert the mint.
    // BadFee retried once; #Duplicate treated as idempotent success.
    //
    // P1-A: CallerGuard (activeMintCallers) is intentionally kept active through this await.
    // Releasing it before the await would open a reentrancy window where a concurrent call
    // with a different block height could race through the ICP balance check while this
    // ICRC-1 transfer is still in flight, allowing a double-debit of the treasury.
    let now64 = Nat64.fromNat(Int.abs(Time.now()));
    ignore await stkTreasuryTransfer(caller, stkAmount * STK_E8S, now64, "mintStkTokens");

    activeMintCallers.remove(caller); // released AFTER ICRC-1 await (P1-A fix)
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
    let poolRemaining = switch (tokenPools.get("Play-to-Earn Rewards")) {
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
      return #err("Play-to-Earn Rewards pool is empty");
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
      pool = ?"Play-to-Earn Rewards";
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
    totalMinted += reward;
    circulatingSupply += reward;

    // Update rolling daily tracking
    dailyRewardTracking.add(caller, { lastEarnTime = now; earnedToday = gamesEarnedToday + 1 });

    // Track unique earners for the scaling formula (only increments, never decrements)
    if (rewardEarners.get(caller) == null) {
      rewardEarners.add(caller, true);
      rewardEarnerCount += 1;
    };

    // Decrement the Play-to-Earn Rewards pool
    switch (tokenPools.get("Play-to-Earn Rewards")) {
      case (?pool) {
        tokenPools.add("Play-to-Earn Rewards", { pool with remaining = safeSub(pool.remaining, reward) });
      };
      case null {};
    };

    // Dual-write: move reward from treasury subaccount [01] to caller's ICRC-1 account.
    // Best-effort — wallet and pool updates above are authoritative.
    // BadFee retried once; #Duplicate treated as idempotent success.
    let rewardTs = Nat64.fromNat(Int.abs(now));
    ignore await stkTreasuryTransfer(caller, reward * STK_E8S, rewardTs, "claimGameReward");

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
