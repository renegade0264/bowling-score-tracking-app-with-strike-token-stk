#!/usr/bin/env node
// Encodes the ICRC-1 ledger init arg as raw Candid binary.
// Usage: node encode_init_arg.js | xxd    — or pipe to dfx via --argument-type raw
//
// Workaround: dfx --argument-file with --argument-type idl mishandles subaccount
// blobs in initial_balances.  Encoding via @dfinity/candid and passing raw binary
// with --argument-type raw is reliable.

const { IDL } = require(
  '../node_modules/.pnpm/@dfinity+candid@3.3.1_@dfinity+principal@3.3.1/node_modules/@dfinity/candid/lib/cjs/index.js'
);
const { Principal } = require(
  '../node_modules/.pnpm/@dfinity+principal@3.3.1/node_modules/@dfinity/principal/lib/cjs/index.js'
);

// ── IDL type definitions ────────────────────────────────────────────────────

const Account = IDL.Record({
  owner: IDL.Principal,
  subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
});

const ArchiveOptions = IDL.Record({
  trigger_threshold: IDL.Nat64,
  num_blocks_to_archive: IDL.Nat64,
  controller_id: IDL.Principal,
  cycles_for_archive_creation: IDL.Opt(IDL.Nat64),
  max_message_size_bytes: IDL.Opt(IDL.Nat64),
  node_max_memory_size_bytes: IDL.Opt(IDL.Nat64),
});

const FeatureFlags = IDL.Record({ icrc2: IDL.Bool });

const Value = IDL.Variant({
  Nat: IDL.Nat,
  Int: IDL.Int,
  Text: IDL.Text,
  Blob: IDL.Vec(IDL.Nat8),
});

const InitArgs = IDL.Record({
  token_name: IDL.Text,
  token_symbol: IDL.Text,
  decimals: IDL.Opt(IDL.Nat8),
  transfer_fee: IDL.Nat,
  minting_account: Account,
  fee_collector_account: IDL.Opt(Account),
  initial_balances: IDL.Vec(IDL.Tuple(Account, IDL.Nat)),
  maximum_number_of_accounts: IDL.Opt(IDL.Nat64),
  accounts_overflow_trim_quantity: IDL.Opt(IDL.Nat64),
  archive_options: ArchiveOptions,
  metadata: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
  feature_flags: IDL.Opt(FeatureFlags),
  max_memo_length: IDL.Opt(IDL.Nat32),
});

const LedgerArg = IDL.Variant({ Init: InitArgs });

// ── Init values ─────────────────────────────────────────────────────────────

// Treasury subaccount [01]: 31 zero bytes followed by 0x01
const TREASURY_SUBACCOUNT = new Uint8Array(32);
TREASURY_SUBACCOUNT[31] = 1;

const initArg = {
  Init: {
    token_name: 'Strike Token',
    token_symbol: 'STK',
    decimals: [8],
    transfer_fee: BigInt('100000'),       // 0.001 STK (100_000 e8s)
    minting_account: {
      owner: Principal.fromText('a6p2m-tiaaa-aaaal-qwxba-cai'),
      subaccount: [],                     // null subaccount = minting account
    },
    fee_collector_account: [],            // null
    initial_balances: [
      [
        {
          owner: Principal.fromText('xai2m-ngxnm-xmdef-p75bs-rnfux-cwlos-47xke-rrxst-bmjx7-gqfnb-fae'),
          subaccount: [],                 // null subaccount
        },
        BigInt('1300000000'),             // 1_300_000_000 e8s = 13 STK
      ],
      [
        {
          owner: Principal.fromText('a6p2m-tiaaa-aaaal-qwxba-cai'),
          subaccount: [Array.from(TREASURY_SUBACCOUNT)], // subaccount [01]
        },
        BigInt('49999998700000000'),       // 49_999_998_700_000_000 e8s = 499,999,987 STK
      ],
    ],
    maximum_number_of_accounts: [],       // null
    accounts_overflow_trim_quantity: [],  // null
    archive_options: {
      trigger_threshold: BigInt(2000),
      num_blocks_to_archive: BigInt(1000),
      controller_id: Principal.fromText('cmanb-aejth-shdoi-krt5o-ijy5p-tineu-7lrav-guzka-k4qxk-2f55o-3qe'),
      cycles_for_archive_creation: [],
      max_message_size_bytes: [],
      node_max_memory_size_bytes: [],
    },
    metadata: [],
    feature_flags: [{ icrc2: true }],
    max_memo_length: [],
  },
};

// ── Encode and write to stdout ──────────────────────────────────────────────

const encoded = IDL.encode([LedgerArg], [initArg]);
process.stdout.write(Buffer.from(encoded));
