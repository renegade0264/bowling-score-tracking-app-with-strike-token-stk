import { Principal } from "@dfinity/principal";

const SUB_ACCOUNT_ZERO = new Uint8Array(32);

/**
 * CRC32 implementation for Account ID checksum
 */
function getCrc32(buf: Uint8Array): Uint8Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  crc = crc ^ 0xffffffff;

  const result = new Uint8Array(4);
  result[0] = (crc >> 24) & 0xff;
  result[1] = (crc >> 16) & 0xff;
  result[2] = (crc >> 8) & 0xff;
  result[3] = crc & 0xff;

  return result;
}

/**
 * Pure-JS SHA-224 implementation.
 * SHA-224 is SHA-256 with different initial hash values, truncated to 28 bytes.
 * https://csrc.nist.gov/publications/detail/fips/180/4/final
 */
function sha224(data: Uint8Array): Uint8Array {
  // SHA-224 initial hash values (fractional parts of cube roots of 9th–16th primes)
  let h0 = 0xc1059ed8;
  let h1 = 0x367cd507;
  let h2 = 0x3070dd17;
  let h3 = 0xf70e5939;
  let h4 = 0xffc00b31;
  let h5 = 0x68581511;
  let h6 = 0x64f98fa7;
  let h7 = 0xbefa4fa4;

  // SHA-256 round constants
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  // Pre-processing: padding
  const bitLen = data.length * 8;
  // Pad to 512-bit (64-byte) blocks: message + 0x80 + zeros + 64-bit big-endian length
  const padLen =
    data.length % 64 < 56 ? 56 - (data.length % 64) : 120 - (data.length % 64);
  const padded = new Uint8Array(data.length + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  // Append 64-bit big-endian bit length (we only handle lengths < 2^32 bits)
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, bitLen >>> 0, false);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000), false);

  // Process each 512-bit block
  const W = new Uint32Array(64);

  function rotr32(x: number, n: number): number {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  for (let offset = 0; offset < padded.length; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      W[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 =
        rotr32(W[i - 15], 7) ^ rotr32(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 =
        rotr32(W[i - 2], 17) ^ rotr32(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let hh = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + K[i] + W[i]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + hh) >>> 0;
  }

  // Produce 28-byte digest (SHA-224 truncates SHA-256's 8 words to 7)
  const digest = new Uint8Array(28);
  const dv = new DataView(digest.buffer);
  dv.setUint32(0, h0, false);
  dv.setUint32(4, h1, false);
  dv.setUint32(8, h2, false);
  dv.setUint32(12, h3, false);
  dv.setUint32(16, h4, false);
  dv.setUint32(20, h5, false);
  dv.setUint32(24, h6, false);

  return digest;
}

/**
 * Generates an ICP Account ID from a Principal and optional subaccount.
 * Uses the standard ICP account ID derivation:
 *   SHA-224(0x0A || "account-id" || principalBytes || subaccountBytes)
 * then prepends a 4-byte CRC32 checksum of the digest.
 * Returns a 64-char hex string (32 bytes).
 */
export function principalToAccountIdSync(
  principal: Principal,
  subAccount?: Uint8Array,
): string {
  const subAccountBytes = subAccount || SUB_ACCOUNT_ZERO;
  const principalBytes = principal.toUint8Array();

  // Domain separator: 0x0A (length of "account-id") followed by ASCII "account-id"
  const domainSeparator = new Uint8Array([
    0x0a, 97, 99, 99, 111, 117, 110, 116, 45, 105, 100,
  ]);

  // Concatenate: domainSeparator || principalBytes || subAccountBytes
  const hashInput = new Uint8Array(
    domainSeparator.length + principalBytes.length + subAccountBytes.length,
  );
  hashInput.set(domainSeparator, 0);
  hashInput.set(principalBytes, domainSeparator.length);
  hashInput.set(
    subAccountBytes,
    domainSeparator.length + principalBytes.length,
  );

  // SHA-224 digest -> 28 bytes
  const digest = sha224(hashInput);

  // CRC32 checksum of digest -> 4 bytes big-endian
  const checksum = getCrc32(digest);

  // Account ID = checksum (4 bytes) || digest (28 bytes) = 32 bytes
  const accountId = new Uint8Array(32);
  accountId.set(checksum, 0);
  accountId.set(digest, 4);

  // Return as 64-char hex string
  return Array.from(accountId)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Formats a Principal ID for display (keeps dashes)
 */
export function formatPrincipalId(principal: Principal): string {
  return principal.toString();
}

/**
 * Formats an Account ID for display (adds dashes for readability)
 */
export function formatAccountId(accountId: string): string {
  // Account IDs are typically displayed without dashes, but we can add them for readability
  // Format: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
  if (accountId.length !== 64) return accountId;

  const parts: string[] = [];
  for (let i = 0; i < accountId.length; i += 4) {
    parts.push(accountId.slice(i, i + 4));
  }
  return parts.join("-");
}

/**
 * Validates if a string is a valid Account ID (64 hex characters)
 */
export function isValidAccountId(accountId: string): boolean {
  return /^[0-9a-f]{64}$/i.test(accountId);
}

/**
 * Validates if a string is a valid Principal ID
 */
export function isValidPrincipalId(principalId: string): boolean {
  try {
    Principal.fromText(principalId);
    return true;
  } catch {
    return false;
  }
}
