import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetCallerIcpBalance,
  useGetCallerStkBalanceLive,
  useGetCallerUserProfile,
  useGetCallerWallet,
  useInitializeWallet,
  useSendIcpTokens,
  useSendStkTokens,
} from "@/hooks/useQueries";
import { principalToAccountIdSync } from "@/lib/accountId";
import {
  ArrowLeft,
  CheckCircle,
  Coins,
  Copy,
  Download,
  History,
  Info,
  LogIn,
  QrCode,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Page =
  | "home"
  | "game"
  | "history"
  | "stats"
  | "leaderboard"
  | "profile"
  | "login"
  | "teams"
  | "wallet"
  | "admin"
  | "minting";

interface WalletPageProps {
  onNavigate: (page: Page) => void;
}

export function WalletPage({ onNavigate }: WalletPageProps) {
  const { identity, login, loginStatus } = useInternetIdentity();
  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useGetCallerWallet();
  const {
    data: icpBalance,
    isLoading: icpBalanceLoading,
    refetch: refetchIcpBalance,
  } = useGetCallerIcpBalance();
  const {
    data: stkBalanceLive,
    isLoading: stkBalanceLiveLoading,
    refetch: refetchStkBalanceLive,
  } = useGetCallerStkBalanceLive();
  const { data: profile } = useGetCallerUserProfile();
  const { mutate: initWallet, isPending: isInitializing } =
    useInitializeWallet();
  const { mutate: sendIcp, isPending: isSendingIcp } = useSendIcpTokens();
  const { mutate: sendStk, isPending: isSendingStk } = useSendStkTokens();

  const [activeTab, setActiveTab] = useState<"icp" | "stk">("stk");

  // Dialog open states
  const [isSendIcpDialogOpen, setIsSendIcpDialogOpen] = useState(false);
  const [isSendStkDialogOpen, setIsSendStkDialogOpen] = useState(false);
  const [isReceiveIcpDialogOpen, setIsReceiveIcpDialogOpen] = useState(false);
  const [isReceiveStkDialogOpen, setIsReceiveStkDialogOpen] = useState(false);

  const [sendStkAmount, setSendStkAmount] = useState("");
  const [sendIcpAmount, setSendIcpAmount] = useState("");
  const [icpRecipientAddress, setIcpRecipientAddress] = useState("");
  const [stkRecipientAddress, setStkRecipientAddress] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isAuthenticated = !!identity;

  const handleInitializeWallet = () => {
    if (!identity) return;
    const principal = identity.getPrincipal();
    const icpAccountId = principalToAccountIdSync(principal);
    const stkPrincipalId = principal.toString();
    initWallet(
      { icpAccountId, stkPrincipalId },
      {
        onSuccess: () => {
          toast.success("Wallet initialized successfully!");
          refetchWallet();
        },
        onError: (error) => {
          toast.error(`Failed to initialize wallet: ${error.message}`);
        },
      },
    );
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendIcp = () => {
    if (!sendIcpAmount || !icpRecipientAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!/^[0-9a-f]{64}$/i.test(icpRecipientAddress)) {
      toast.error("Recipient must be a 64-character hex Account ID");
      return;
    }

    const parsedAmount = Number.parseFloat(sendIcpAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    // Convert to e8s using floor to avoid floating-point drift
    const amount = BigInt(Math.floor(parsedAmount * 100_000_000));

    // Minimum: must cover the 0.0001 ICP network fee (10000 e8s)
    if (amount <= BigInt(10000)) {
      toast.error(
        "Amount too small — minimum is 0.0001 ICP to cover network fees",
      );
      return;
    }

    const liveBalance = icpBalance ?? BigInt(0);
    if (amount > liveBalance) {
      toast.error(
        `Insufficient ICP balance. Available: ${(Number(liveBalance) / 100000000).toFixed(8)} ICP`,
      );
      return;
    }
    sendIcp(
      { recipientAccountId: icpRecipientAddress, amount },
      {
        onSuccess: (blockHeight) => {
          setIsSendIcpDialogOpen(false);
          setSendIcpAmount("");
          setIcpRecipientAddress("");
          const heightStr =
            blockHeight != null ? ` Block: ${blockHeight.toString()}` : "";
          toast.success(`ICP sent successfully!${heightStr}`);
          refetchIcpBalance();
          refetchWallet();
        },
        onError: (error) => {
          toast.error(`Failed to send ICP: ${error.message}`);
        },
      },
    );
  };

  const handleSendStk = () => {
    if (!sendStkAmount || !stkRecipientAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    const amount = BigInt(
      Math.floor(Number.parseFloat(sendStkAmount)),
    );
    if (amount <= BigInt(0)) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (wallet && amount > wallet.stkBalance) {
      toast.error("Insufficient STK balance");
      return;
    }
    sendStk(
      { recipient: stkRecipientAddress, amount },
      {
        onSuccess: () => {
          setIsSendStkDialogOpen(false);
          setSendStkAmount("");
          setStkRecipientAddress("");
          toast.success("STK tokens sent successfully!");
          refetchWallet();
        },
        onError: (error) => {
          toast.error(`Failed to send STK: ${error.message}`);
        },
      },
    );
  };

  const formatBalance = (balance: bigint) => {
    return (Number(balance) / 100000000).toFixed(8);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1000000).toLocaleString();
  };

  const icpBalanceICP = Number(icpBalance ?? BigInt(0)) / 100000000;
  // Live ICRC-1 balance in e8s — divide by 1e8 to display as STK units.
  // Falls back to the Map-cached wallet balance when the ledger query hasn't resolved yet.
  const stkBalanceLiveSTK = Number(stkBalanceLive ?? BigInt(0)) / 100_000_000;
  const stkBalance = stkBalanceLive !== undefined
    ? stkBalanceLiveSTK
    : Number(wallet?.stkBalance ?? BigInt(0));
  const currentTransactions =
    activeTab === "icp"
      ? (wallet?.icpTransactions ?? [])
      : (wallet?.stkTransactions ?? []);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Multi-Currency Wallet</h1>
              <p className="text-muted-foreground">
                Manage your ICP and STK tokens with full send/receive
                functionality
              </p>
            </div>
            <Button variant="outline" onClick={() => onNavigate("home")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
          <Card>
            <CardContent className="text-center py-12">
              <LogIn className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Sign In Required</h3>
              <p className="text-muted-foreground mb-6">
                Please sign in with Internet Identity to access your wallet.
              </p>
              <Button
                onClick={login}
                disabled={loginStatus === "logging-in"}
                className="w-full max-w-xs"
                data-ocid="wallet-login-btn"
              >
                {loginStatus === "logging-in" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In with Internet Identity
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (walletLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading wallet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Multi-Currency Wallet</h1>
              <p className="text-muted-foreground">
                Manage your ICP and STK tokens with full send/receive
                functionality
              </p>
            </div>
            <Button variant="outline" onClick={() => onNavigate("home")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
          <Card>
            <CardContent className="text-center py-12">
              <Wallet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                Initialize Your Wallet
              </h3>
              <p className="text-muted-foreground mb-6">
                Set up your multi-currency wallet to start managing ICP and STK
                tokens.
              </p>
              <Button
                onClick={handleInitializeWallet}
                disabled={isInitializing}
                className="w-full max-w-xs"
                data-ocid="wallet-init-btn"
              >
                {isInitializing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Initialize Wallet
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Multi-Currency Wallet</h1>
            <p className="text-muted-foreground">
              Manage your ICP and STK tokens with live on-chain balance
              verification
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchWallet();
                refetchIcpBalance();
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => onNavigate("home")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Wallet Addresses Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span>Wallet Addresses</span>
              </CardTitle>
              <CardDescription>
                Your unique addresses for receiving tokens on the Internet
                Computer blockchain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>ICP:</strong> This is your personal ICP account
                  address. Send ICP to this address from any ICP wallet (NNS,
                  Internet Identity, etc.). Your address is permanently tied to
                  your Internet Identity and never changes. &nbsp;
                  <strong>STK:</strong> Uses your Principal ID.
                </AlertDescription>
              </Alert>
              <Separator />
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center space-x-2">
                    <span>Your ICP Account ID</span>
                    <Badge variant="secondary" className="text-xs">
                      Receive ICP Here
                    </Badge>
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={wallet.icpAccountId}
                      readOnly
                      className="font-mono text-xs"
                      data-ocid="icp-account-id"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(wallet.icpAccountId, "icpAccount")
                      }
                    >
                      {copiedField === "icpAccount" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    64-character hex — your personal ICP ledger address. Send
                    ICP directly to this address from any ICP wallet.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center space-x-2">
                    <span>STK Principal ID</span>
                    <Badge variant="secondary" className="text-xs">
                      For STK (ICRC-1)
                    </Badge>
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={wallet.stkPrincipalId}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(wallet.stkPrincipalId, "stkPrincipal")
                      }
                    >
                      {copiedField === "stkPrincipal" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Principal ID with dashes — for receiving STK tokens
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center space-x-2">
                  <span>Display Name</span>
                  <Badge variant="outline" className="text-xs">
                    Profile
                  </Badge>
                </Label>
                <Input
                  value={profile?.displayName || "Not set"}
                  readOnly
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Balance and Actions Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "icp" | "stk")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="icp" className="flex items-center space-x-2">
                <Coins className="w-4 h-4" />
                <span>ICP Tokens</span>
              </TabsTrigger>
              <TabsTrigger value="stk" className="flex items-center space-x-2">
                <Coins className="w-4 h-4" />
                <span>STK Tokens</span>
              </TabsTrigger>
            </TabsList>

            {/* ICP Tab */}
            <TabsContent value="icp" className="space-y-6">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        ICP Balance (Live)
                      </p>
                      <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                        {icpBalanceLoading ? (
                          <span className="animate-pulse text-2xl">
                            Loading...
                          </span>
                        ) : (
                          `${icpBalanceICP.toFixed(8)} ICP`
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Internet Computer Protocol • Live ledger balance
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {/* Send ICP Dialog */}
                      <Dialog
                        open={isSendIcpDialogOpen}
                        onOpenChange={setIsSendIcpDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full" data-ocid="send-icp-btn">
                            <Send className="w-4 h-4 mr-2" />
                            Send ICP
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send ICP Tokens</DialogTitle>
                            <DialogDescription>
                              Transfer ICP directly from your Internet Identity
                              wallet to another account
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Available:{" "}
                                <strong>{icpBalanceICP.toFixed(8)} ICP</strong>.
                                Your Internet Identity signs this transfer
                                on-chain. A network fee of{" "}
                                <strong>0.0001 ICP</strong> will be deducted in
                                addition to the amount sent.
                              </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                              <Label htmlFor="recipient-icp">
                                Recipient Account ID
                              </Label>
                              <Input
                                id="recipient-icp"
                                data-ocid="icp-recipient-input"
                                placeholder="Enter 64-character hex Account ID..."
                                value={icpRecipientAddress}
                                onChange={(e) =>
                                  setIcpRecipientAddress(e.target.value)
                                }
                                className="font-mono text-xs"
                              />
                              <p className="text-xs text-muted-foreground">
                                64 hex characters — the recipient's ICP Account
                                ID
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="amount-icp">Amount (ICP)</Label>
                              <Input
                                id="amount-icp"
                                data-ocid="icp-amount-input"
                                type="number"
                                step="0.00000001"
                                placeholder="0.00000000"
                                value={sendIcpAmount}
                                onChange={(e) =>
                                  setSendIcpAmount(e.target.value)
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Available: {icpBalanceICP.toFixed(8)} ICP
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsSendIcpDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              data-ocid="icp-send-submit"
                              onClick={handleSendIcp}
                              disabled={
                                isSendingIcp ||
                                !sendIcpAmount ||
                                !icpRecipientAddress
                              }
                            >
                              {isSendingIcp ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send ICP
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Receive ICP Dialog */}
                      <Dialog
                        open={isReceiveIcpDialogOpen}
                        onOpenChange={setIsReceiveIcpDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full"
                            data-ocid="receive-icp-btn"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Receive ICP
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Receive ICP</DialogTitle>
                            <DialogDescription>
                              Share your ICP Account ID to receive ICP from any
                              wallet
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Your ICP Account ID</Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={wallet.icpAccountId}
                                  readOnly
                                  className="font-mono text-xs"
                                  data-ocid="receive-icp-address"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    handleCopy(
                                      wallet.icpAccountId,
                                      "icpAccountReceive",
                                    )
                                  }
                                >
                                  {copiedField === "icpAccountReceive" ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                This is your personal ICP account address. Send
                                ICP directly to this address from NNS, Plug, or
                                any ICP wallet.
                              </p>
                            </div>
                            <Alert>
                              <QrCode className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                Your ICP Account ID is permanently tied to your
                                Internet Identity. It never changes between app
                                versions or deployments. Your balance updates
                                live from the ICP Ledger.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* STK Tab */}
            <TabsContent value="stk" className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        STK Balance
                      </p>
                      <p className="text-4xl font-bold text-primary">
                        {stkBalanceLiveLoading
                          ? "…"
                          : stkBalance.toLocaleString(undefined, { maximumFractionDigits: 8 })} STK
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Strike Tokens • ICRC-1 Ledger
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      {/* Send STK Dialog */}
                      <Dialog
                        open={isSendStkDialogOpen}
                        onOpenChange={setIsSendStkDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full" data-ocid="send-stk-btn">
                            <Send className="w-4 h-4 mr-2" />
                            Send STK
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Send STK Tokens</DialogTitle>
                            <DialogDescription>
                              Transfer STK tokens to another wallet's Principal
                              ID
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="recipient-stk">
                                Recipient Principal ID
                              </Label>
                              <Input
                                id="recipient-stk"
                                data-ocid="stk-recipient-input"
                                placeholder="Enter Principal ID (with dashes)..."
                                value={stkRecipientAddress}
                                onChange={(e) =>
                                  setStkRecipientAddress(e.target.value)
                                }
                                className="font-mono text-xs"
                              />
                              <p className="text-xs text-muted-foreground">
                                Recipient's Principal ID for ICRC-1 token
                                transfer
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="amount-stk">Amount (STK)</Label>
                              <Input
                                id="amount-stk"
                                data-ocid="stk-amount-input"
                                type="number"
                                step="0.00000001"
                                placeholder="0.00000000"
                                value={sendStkAmount}
                                onChange={(e) =>
                                  setSendStkAmount(e.target.value)
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Available: {stkBalance.toLocaleString()} STK
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsSendStkDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              data-ocid="stk-send-submit"
                              onClick={handleSendStk}
                              disabled={
                                isSendingStk ||
                                !sendStkAmount ||
                                !stkRecipientAddress
                              }
                            >
                              {isSendingStk ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Send STK
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Receive STK Dialog */}
                      <Dialog
                        open={isReceiveStkDialogOpen}
                        onOpenChange={setIsReceiveStkDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full"
                            data-ocid="receive-stk-btn"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Receive STK
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Receive STK Tokens</DialogTitle>
                            <DialogDescription>
                              Share your Principal ID to receive STK tokens
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Your STK Principal ID</Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  value={wallet.stkPrincipalId}
                                  readOnly
                                  className="font-mono text-xs"
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    handleCopy(
                                      wallet.stkPrincipalId,
                                      "stkPrincipalReceive",
                                    )
                                  }
                                >
                                  {copiedField === "stkPrincipalReceive" ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Principal ID with dashes for ICRC-1 token
                                transfers
                              </p>
                            </div>
                            <Alert>
                              <QrCode className="h-4 w-4" />
                              <AlertDescription>
                                Share this Principal ID with others to receive
                                STK tokens.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Transaction History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>
                  {activeTab === "icp" ? "ICP" : "STK"} Transaction History
                </span>
              </CardTitle>
              <CardDescription>
                Your recent {activeTab === "icp" ? "ICP" : "STK"} token
                transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {currentTransactions.slice(0, 10).map((tx, index) => (
                    <div
                      key={tx.id?.toString() ?? index}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                      data-ocid="tx-row"
                    >
                      <div className="flex items-center space-x-3">
                        {tx.transactionType === "Send" ? (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {tx.transactionType === "Send"
                              ? "Sent"
                              : tx.transactionType}{" "}
                            {activeTab.toUpperCase()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(tx.timestamp)}
                          </p>
                          {tx.reference && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {tx.reference.length > 32
                                ? `${tx.reference.slice(0, 16)}...${tx.reference.slice(-16)}`
                                : tx.reference}
                            </p>
                          )}
                          {tx.ledgerHeight != null && (
                            <p className="text-xs text-muted-foreground">
                              Ledger height: {tx.ledgerHeight.toString()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Status:{" "}
                            <Badge
                              variant={
                                tx.status === "Completed"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {tx.status}
                            </Badge>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-mono font-medium ${
                            tx.transactionType === "Send"
                              ? "text-red-500"
                              : "text-green-500"
                          }`}
                        >
                          {tx.transactionType === "Send" ? "-" : "+"}
                          {activeTab === "icp"
                            ? formatBalance(tx.amount)
                            : Number(tx.amount).toLocaleString()}{" "}
                          {activeTab.toUpperCase()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {currentTransactions.length > 10 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing 10 most recent transactions
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12" data-ocid="tx-empty-state">
                  <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Transactions Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Your {activeTab === "icp" ? "ICP" : "STK"} transaction
                    history will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your tokens and explore features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button
                  onClick={() => onNavigate("minting")}
                  className="w-full"
                  data-ocid="quick-buy-stk"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  Buy STK Tokens
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("home")}
                  className="w-full"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Play & Earn
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate("profile")}
                  className="w-full"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  View Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    refetchWallet();
                    refetchIcpBalance();
                    refetchStkBalanceLive();
                  }}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Balances
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
