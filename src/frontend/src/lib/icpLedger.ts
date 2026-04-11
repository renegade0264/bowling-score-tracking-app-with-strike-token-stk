import { Actor, HttpAgent } from "@dfinity/agent";
import type { Identity } from "@dfinity/agent";

// ICP Ledger canister ID (mainnet)
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

// ICP Ledger IDL (legacy transfer interface — NOT ICRC-1)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const icpLedgerIdl = ({ IDL }: any) => {
  const Tokens = IDL.Record({ e8s: IDL.Nat64 });
  const TimeStamp = IDL.Record({ timestamp_nanos: IDL.Nat64 });
  const TransferArgs = IDL.Record({
    to: IDL.Vec(IDL.Nat8),
    fee: Tokens,
    memo: IDL.Nat64,
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(TimeStamp),
    amount: Tokens,
  });
  const TransferError = IDL.Variant({
    TxTooOld: IDL.Record({ allowed_window_nanos: IDL.Nat64 }),
    BadFee: IDL.Record({ expected_fee: Tokens }),
    TxDuplicate: IDL.Record({ duplicate_of: IDL.Nat64 }),
    TxCreatedInFuture: IDL.Null,
    InsufficientFunds: IDL.Record({ balance: Tokens }),
  });
  const TransferResult = IDL.Variant({
    Ok: IDL.Nat64,
    Err: TransferError,
  });
  const AccountBalanceArgs = IDL.Record({ account: IDL.Vec(IDL.Nat8) });
  return IDL.Service({
    transfer: IDL.Func([TransferArgs], [TransferResult], []),
    account_balance: IDL.Func([AccountBalanceArgs], [Tokens], ["query"]),
  });
};

interface IcpLedgerActor {
  transfer: (args: {
    to: number[];
    fee: { e8s: bigint };
    memo: bigint;
    from_subaccount: [] | [number[]];
    created_at_time: [] | [{ timestamp_nanos: bigint }];
    amount: { e8s: bigint };
  }) => Promise<{ Ok: bigint } | { Err: Record<string, unknown> }>;
  account_balance: (args: { account: number[] }) => Promise<{ e8s: bigint }>;
}

/**
 * Create an ICP Ledger actor using the user's authenticated Identity.
 * The identity must be the user's Internet Identity (from useInternetIdentity).
 */
export async function createIcpLedgerActor(
  identity: Identity,
  host: string,
): Promise<IcpLedgerActor> {
  const agent = new HttpAgent({
    identity,
    host,
  });

  // Fetch root key on local/dev environments
  if (host?.includes("localhost") || host?.includes("127.0.0.1")) {
    try {
      await agent.fetchRootKey();
    } catch (_e) {
      console.warn("Could not fetch root key — proceeding anyway");
    }
  }

  return Actor.createActor(icpLedgerIdl, {
    agent,
    canisterId: ICP_LEDGER_CANISTER_ID,
  }) as unknown as IcpLedgerActor;
}

/**
 * Convert a 64-char hex account ID string to a number[] (32 bytes).
 */
export function hexToBytes(hex: string): number[] {
  if (hex.length !== 64)
    throw new Error(
      `Invalid account ID length: expected 64 chars, got ${hex.length}`,
    );
  const bytes: number[] = [];
  for (let i = 0; i < 32; i++) {
    bytes.push(Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16));
  }
  return bytes;
}

/**
 * Transfer ICP on-chain using the user's authenticated Internet Identity.
 *
 * @param identity  The user's Internet Identity (from useInternetIdentity().identity)
 * @param host      The IC host (e.g. "https://ic0.app" or "http://localhost:8080")
 * @param toAccountIdHex  Recipient's 64-char hex ICP Account ID
 * @param amountE8s Amount to send in e8s (bigint), NOT including fee
 * @returns Block height (bigint) on success
 * @throws Human-readable error on failure
 */
export async function sendIcpViaLedger(
  // Accept any identity-like object and cast to @dfinity/agent Identity
  // The @icp-sdk/core/agent Identity is compatible at runtime
  identity: unknown,
  host: string,
  toAccountIdHex: string,
  amountE8s: bigint,
): Promise<bigint> {
  if (!identity) throw new Error("Not authenticated — please sign in first");

  const toBytes = hexToBytes(toAccountIdHex);
  const feeE8s = 10_000n; // 0.0001 ICP

  const ledger = await createIcpLedgerActor(identity as Identity, host);

  const result = await ledger.transfer({
    to: toBytes,
    fee: { e8s: feeE8s },
    memo: 0n,
    from_subaccount: [],
    created_at_time: [],
    amount: { e8s: amountE8s },
  });

  if ("Ok" in result) {
    return result.Ok;
  }

  // Map error variants to human-readable messages
  const err = result.Err;
  if ("InsufficientFunds" in err) {
    const bal =
      (err.InsufficientFunds as { balance: { e8s: bigint } }).balance?.e8s ??
      0n;
    const balIcp = (Number(bal) / 1e8).toFixed(8);
    throw new Error(`Insufficient ICP balance. Available: ${balIcp} ICP`);
  }
  if ("BadFee" in err) {
    throw new Error("Incorrect network fee — please try again");
  }
  if ("TxDuplicate" in err) {
    throw new Error(
      "Duplicate transaction — this transfer was already submitted",
    );
  }
  if ("TxTooOld" in err) {
    throw new Error("Transaction too old — please refresh and try again");
  }
  if ("TxCreatedInFuture" in err) {
    throw new Error("Clock skew error — your device time may be incorrect");
  }
  throw new Error(`ICP transfer failed: ${JSON.stringify(err)}`);
}

/**
 * Get the IC host for the current environment.
 */
export function getIcpHost(): string {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return `http://${window.location.hostname}:${window.location.port || 8080}`;
  }
  return "https://ic0.app";
}
