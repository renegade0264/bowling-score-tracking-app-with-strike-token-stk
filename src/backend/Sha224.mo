// AccountId.mo — ICP account ID derivation helper
// Uses Principal.toLedgerAccount() from mo:core/Principal which implements
// the official SHA-224 + CRC32 algorithm.
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";

module {

  // Derive the ICP account ID as a 64-char lowercase hex string from a Principal.
  // Uses the default sub-account (all zeros). The result is stable and permanent
  // as long as the principal doesn't change.
  public func deriveAccountId(p : Principal) : Text {
    let accountBlob = p.toLedgerAccount(null);
    blobToHex(accountBlob);
  };

  // Convert a Blob to a lowercase hex string
  public func blobToHex(b : Blob) : Text {
    let hexChars = ["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"];
    var result = "";
    for (byte in b.toArray().values()) {
      let hi = byte.toNat() / 16;
      let lo = byte.toNat() % 16;
      result #= hexChars[hi] # hexChars[lo];
    };
    result;
  };

};
