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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetAdminTreasuryAddress,
  useGetCallerIcpBalance,
  useGetCallerWallet,
  useGetCirculatingSupply,
  useGetICPPrice,
  useGetMarketDataStatus,
  useGetPriceFeeds,
  useGetPurchaseHistory,
  useGetTokenBalance,
  useMintStkTokens,
} from "@/hooks/useQueries";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle,
  Clock,
  Coins,
  Database,
  DollarSign,
  FileText,
  History,
  Info,
  LogIn,
  RefreshCw,
  Server,
  Shield,
  Signal,
  Terminal,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
  Zap,
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

interface MintingPageProps {
  onNavigate: (page: Page) => void;
}

interface DiagnosticLog {
  timestamp: string;
  level: "info" | "warning" | "error";
  operation: string;
  message: string;
  details?: unknown;
}

export function MintingPage({ onNavigate }: MintingPageProps) {
  const { identity, login, loginStatus } = useInternetIdentity();
  const { data: tokenBalance, refetch: refetchBalance } = useGetTokenBalance();
  const {
    data: icpPriceData,
    isLoading: priceLoading,
    error: priceError,
    refetch: refetchPrice,
  } = useGetICPPrice();
  const { data: marketStatus } = useGetMarketDataStatus();
  const { data: priceFeeds } = useGetPriceFeeds();
  const { data: purchaseHistory = [], isLoading: historyLoading } =
    useGetPurchaseHistory();
  const {
    data: icpBalance,
    isLoading: icpBalanceLoading,
    refetch: refetchIcpBalance,
  } = useGetCallerIcpBalance();
  const { refetch: refetchWallet } = useGetCallerWallet();
  const { data: adminTreasuryAddress, isLoading: treasuryLoading } =
    useGetAdminTreasuryAddress();
  const { data: circulatingSupply } = useGetCirculatingSupply();

  const { mutateAsync: mintTokens, isPending: isMinting } = useMintStkTokens();

  const [purchaseMode, setPurchaseMode] = useState<"icp" | "stk">("icp");
  const [icpAmount, setIcpAmount] = useState("");
  const [stkAmount, setStkAmount] = useState("");
  const [exchangeRate] = useState(50000); // 1 ICP = 50,000 STK
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLog[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [lastMintingError, setLastMintingError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [mintStep, setMintStep] = useState<null | 1 | 2>(null);

  const currentICPPrice = icpPriceData?.price;
  const priceChange24h = icpPriceData?.change24h || 0;
  const priceStatus = icpPriceData?.status || "error";
  const priceSource = icpPriceData?.source || "Unknown";
  const lastPriceUpdate = icpPriceData?.lastUpdated || Date.now();

  const isAuthenticated = !!identity;
  const hasPurchaseHistory = purchaseHistory.length > 0;
  const hasBackendPriceFeeds = (priceFeeds?.length || 0) > 0;
  const isPriceAvailable = !!currentICPPrice && currentICPPrice > 0;

  const icpBalanceICP = Number(icpBalance ?? BigInt(0)) / 100_000_000;
  const requiredICP = icpAmount ? Number.parseFloat(icpAmount) : 0;
  // Include the 0.0001 ICP network fee in the required balance check
  const requiredICPWithFee = requiredICP + 0.0001;
  const hasEnoughBalance =
    icpBalanceICP >= requiredICPWithFee && requiredICP > 0;

  const isTreasuryConfigured =
    !!adminTreasuryAddress && /^[0-9a-f]{64}$/i.test(adminTreasuryAddress);

  const addDiagnosticLog = (
    level: "info" | "warning" | "error",
    operation: string,
    message: string,
    details?: unknown,
  ) => {
    const log: DiagnosticLog = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      details,
    };
    setDiagnosticLogs((prev) => [log, ...prev].slice(0, 50));
  };

  // Sync ICP <-> STK amount based on which field the user is editing
  const handleIcpChange = (val: string) => {
    setIcpAmount(val);
    setPurchaseMode("icp");
    setMintSuccess(false);
    const icp = Number.parseFloat(val);
    if (!Number.isNaN(icp) && isPriceAvailable) {
      setStkAmount((icp * exchangeRate).toString());
    } else if (!val) {
      setStkAmount("");
    }
  };

  const handleStkChange = (val: string) => {
    setStkAmount(val);
    setPurchaseMode("stk");
    setMintSuccess(false);
    const stk = Number.parseFloat(val);
    if (!Number.isNaN(stk) && isPriceAvailable) {
      setIcpAmount((stk / exchangeRate).toFixed(4));
    } else if (!val) {
      setIcpAmount("");
    }
  };

  const handleMintTokens = async () => {
    if (!icpAmount || !stkAmount || !currentICPPrice) {
      toast.error("Missing required information for minting", {
        description:
          "Please ensure amounts are filled and live ICP price is available",
      });
      return;
    }

    if (!isTreasuryConfigured) {
      toast.error("Minting unavailable", {
        description: "Admin treasury not configured. Please contact the admin.",
      });
      return;
    }

    if (!hasEnoughBalance) {
      const needed = (requiredICPWithFee - icpBalanceICP).toFixed(8);
      toast.error("Insufficient ICP balance", {
        description: `You need ${needed} more ICP (including network fee) to mint.`,
      });
      addDiagnosticLog("error", "Token Minting", "Insufficient ICP balance", {
        icpBalanceICP,
        requiredICPWithFee,
        shortfall: needed,
      });
      return;
    }

    addDiagnosticLog(
      "info",
      "Token Minting",
      "Starting STK mint — sending ICP to treasury",
      { icpAmount, stkAmount, currentICPPrice, adminTreasuryAddress },
    );

    try {
      await refetchPrice();
      const freshPrice = icpPriceData?.price;

      if (!freshPrice || freshPrice <= 0) {
        toast.error("Unable to fetch live ICP price for minting", {
          description:
            "Live pricing is mandatory for minting. Please try again.",
        });
        return;
      }

      const icpE8s = BigInt(
        Math.floor(Number.parseFloat(icpAmount) * 100_000_000),
      );
      const stkTokens = BigInt(Math.floor(Number.parseFloat(stkAmount)));
      const exchangeRateE8s = BigInt(Math.floor(freshPrice * 100));

      addDiagnosticLog(
        "info",
        "Token Minting",
        "Sending ICP to admin treasury on-chain",
        {
          icpE8s: icpE8s.toString(),
          stkTokens: stkTokens.toString(),
          exchangeRateE8s: exchangeRateE8s.toString(),
          treasury: adminTreasuryAddress,
        },
      );

      const result = await mintTokens({
        icpAmount: icpE8s,
        stkAmount: stkTokens,
        exchangeRate: exchangeRateE8s,
        adminTreasuryAddress: adminTreasuryAddress!,
        onProgress: (step) => setMintStep(step),
      });

      setMintStep(null);
      setLastMintingError(null);
      setMintSuccess(true);

      addDiagnosticLog(
        "info",
        "Token Minting",
        "Successfully minted STK tokens",
        { icpAmount, stkAmount, blockHeight: result.blockHeight?.toString() },
      );

      toast.success("STK tokens minted!", {
        description: `${stkAmount} STK added to your wallet. Block: ${result.blockHeight?.toString()}`,
      });

      setIcpAmount("");
      setStkAmount("");
      refetchBalance();
      refetchIcpBalance();
      refetchWallet();

      setTimeout(() => setMintSuccess(false), 8000);
    } catch (error: unknown) {
      setMintStep(null);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error during minting";
      setLastMintingError(errorMessage);
      setMintSuccess(false);

      addDiagnosticLog("error", "Token Minting", "Failed to mint STK tokens", {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      // Show a more helpful toast for ICP-sent-but-STK-failed scenario
      if (
        errorMessage.includes("block") &&
        errorMessage.includes("STK crediting")
      ) {
        toast.error("Partial minting failure — action required", {
          description: errorMessage,
          duration: 15000,
        });
      } else {
        toast.error("Minting failed", { description: errorMessage });
      }
    }
  };

  const calculateUSDValue = (amount: number) => {
    if (!isPriceAvailable) return "N/A";
    return (amount * (currentICPPrice ?? 0)).toFixed(2);
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleString();
  };

  const getPriceStatusIcon = () => {
    switch (priceStatus) {
      case "live":
        return <Wifi className="w-4 h-4 text-green-600" />;
      case "cached":
        return <Signal className="w-4 h-4 text-orange-600" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-600" />;
    }
  };

  const getPriceStatusText = () => {
    switch (priceStatus) {
      case "live":
        return "Live Market Data";
      case "cached":
        return "Cached Data";
      default:
        return "Offline Mode";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const getLevelColor = (level: "info" | "warning" | "error") => {
    switch (level) {
      case "info":
        return "text-blue-600 dark:text-blue-400";
      case "warning":
        return "text-orange-600 dark:text-orange-400";
      case "error":
        return "text-red-600 dark:text-red-400";
    }
  };

  const getLevelBadgeVariant = (level: "info" | "warning" | "error") => {
    switch (level) {
      case "info":
        return "default" as const;
      case "warning":
        return "secondary" as const;
      case "error":
        return "destructive" as const;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to access the STK token minting platform.
                All transactions require verified ICP payments with live market
                pricing.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Button
                onClick={login}
                disabled={loginStatus === "logging-in"}
                className="w-full"
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
              <Button
                onClick={() => onNavigate("home")}
                variant="outline"
                className="w-full"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (priceError || !isPriceAvailable) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold">STK Token Minting Platform</h1>
            </div>
          </div>

          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <strong>Unable to Fetch Live ICP Price:</strong> Live pricing is
              mandatory for all STK token minting operations to ensure fair
              exchange rates.
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={() => refetchPrice()}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Price Fetch
                </Button>
                <Button
                  onClick={() => onNavigate("home")}
                  variant="outline"
                  size="sm"
                >
                  Return to Home
                </Button>
              </div>
              {priceError && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 rounded text-sm">
                  <strong>Error:</strong> {(priceError as Error).message}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const mintButtonLabel = () => {
    if (isMinting) {
      if (mintStep === 1) return "Step 1/2: Sending ICP to treasury...";
      if (mintStep === 2) return "Step 2/2: Crediting STK tokens...";
      return "Minting STK Tokens...";
    }
    if (!icpAmount || !stkAmount) return "Enter Amount to Mint";
    if (!isTreasuryConfigured) return "Treasury Not Configured";
    if (!hasEnoughBalance) {
      const needed = Math.max(0, requiredICPWithFee - icpBalanceICP).toFixed(4);
      return `Need ${needed} more ICP`;
    }
    return `Mint ${stkAmount} STK Tokens`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">STK Token Minting Platform</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Purchase Strike Tokens (STK) with ICP. Your Internet Identity wallet
            sends ICP directly to the treasury — STK is only issued after the
            transfer is confirmed on-chain.
          </p>
        </div>

        {/* Diagnostics Toggle */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <Bug className="w-4 h-4 mr-2" />
            {showDiagnostics ? "Hide" : "Show"} Diagnostics
          </Button>
        </div>

        {/* Diagnostics Panel */}
        {showDiagnostics && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                Diagnostic Logs
              </CardTitle>
              <CardDescription>
                Real-time logging of ICP transfers and minting operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastMintingError && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription>
                    <strong>Last Minting Error:</strong> {lastMintingError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground">
                    ICP Balance
                  </div>
                  <div className="font-mono text-xs">
                    {icpBalanceLoading
                      ? "Loading..."
                      : `${icpBalanceICP.toFixed(8)} ICP`}
                  </div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground">ICP Price</div>
                  <div className="font-mono text-xs">
                    ${(currentICPPrice ?? 0).toFixed(2)} ({priceSource})
                  </div>
                </div>
                <div className="p-3 bg-background rounded-lg">
                  <div className="text-xs text-muted-foreground">
                    STK Balance
                  </div>
                  <div className="font-mono text-xs">
                    {Number(tokenBalance || 0).toLocaleString()} STK
                  </div>
                </div>
                <div className="p-3 bg-background rounded-lg col-span-2 md:col-span-3">
                  <div className="text-xs text-muted-foreground">
                    Admin Treasury
                  </div>
                  <div className="font-mono text-xs break-all">
                    {treasuryLoading
                      ? "Loading..."
                      : adminTreasuryAddress || "Not configured"}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">
                    Operation Logs ({diagnosticLogs.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDiagnosticLogs([])}
                  >
                    Clear Logs
                  </Button>
                </div>
                <ScrollArea className="h-[300px] w-full rounded-md border bg-background p-4">
                  {diagnosticLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No diagnostic logs yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {diagnosticLogs.map((log, index) => (
                        <div
                          key={`diag-${log.timestamp}-${index}`}
                          className="border-l-2 border-muted pl-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={getLevelBadgeVariant(log.level)}
                                className="text-xs"
                              >
                                {log.level.toUpperCase()}
                              </Badge>
                              <span className="font-medium text-sm">
                                {log.operation}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className={`text-sm ${getLevelColor(log.level)}`}>
                            {log.message}
                          </p>
                          {log.details !== undefined && (
                            <details className="mt-2">
                              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                View Details
                              </summary>
                              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                {JSON.stringify(
                                  log.details as Record<string, unknown>,
                                  null,
                                  2,
                                )}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Status Alert */}
        {isTreasuryConfigured ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>Secure On-Chain Minting Active:</strong> Your Internet
              Identity wallet sends ICP directly to the admin treasury on-chain.
              STK is only issued after the transfer is confirmed. Live ICP
              price: ${(currentICPPrice ?? 0).toFixed(2)} from {priceSource}.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Admin Treasury Not Configured:</strong> Minting is
              unavailable until an admin sets the treasury wallet address.
              Please contact the admin.
            </AlertDescription>
          </Alert>
        )}

        {/* ── MINTING FORM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your ICP Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Your ICP Wallet
              </CardTitle>
              <CardDescription>
                ICP will be sent directly from your wallet when you click Mint.
                Your wallet address is permanently tied to your Internet
                Identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Your ICP Balance (Live)
                  </p>
                  <p
                    className={`text-2xl font-bold ${icpBalanceICP > 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}
                  >
                    {icpBalanceLoading ? (
                      <span className="animate-pulse text-base">
                        Loading...
                      </span>
                    ) : (
                      `${icpBalanceICP.toFixed(8)} ICP`
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live from ICP Ledger
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchIcpBalance()}
                  disabled={icpBalanceLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${icpBalanceLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  When you click <strong>Mint</strong>, your Internet Identity
                  wallet will sign and submit the ICP transfer directly
                  on-chain. A network fee of <strong>0.0001 ICP</strong> applies
                  in addition to the ICP amount.
                </AlertDescription>
              </Alert>

              {icpAmount &&
                requiredICP > 0 &&
                (hasEnoughBalance ? (
                  <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm">
                      <strong>Balance sufficient!</strong> You have{" "}
                      {icpBalanceICP.toFixed(8)} ICP — enough to mint{" "}
                      {stkAmount} STK (including fee).
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-sm">
                      Insufficient balance. You need{" "}
                      <strong>
                        {Math.max(
                          0,
                          requiredICPWithFee - icpBalanceICP,
                        ).toFixed(8)}{" "}
                        more ICP
                      </strong>{" "}
                      (including 0.0001 fee). Send ICP to your wallet address in
                      the{" "}
                      <button
                        onClick={() => onNavigate("wallet")}
                        className="underline text-primary"
                        type="button"
                      >
                        Wallet page
                      </button>
                      .
                    </AlertDescription>
                  </Alert>
                ))}
            </CardContent>
          </Card>

          {/* Mint STK */}
          <Card className="relative overflow-hidden border-primary/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary" />
                Mint STK Tokens
              </CardTitle>
              <CardDescription>
                Enter the amount you want to mint. One click sends ICP and
                credits STK to your wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Purchase Mode Toggle */}
              <div className="flex items-center justify-center">
                <div className="flex bg-muted rounded-lg p-1">
                  <Button
                    variant={purchaseMode === "icp" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPurchaseMode("icp")}
                    className="rounded-md"
                  >
                    Specify ICP Amount
                  </Button>
                  <Button
                    variant={purchaseMode === "stk" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPurchaseMode("stk")}
                    className="rounded-md"
                  >
                    Specify STK Amount
                  </Button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icp-amount">ICP Amount</Label>
                  <div className="relative">
                    <Input
                      id="icp-amount"
                      type="number"
                      step="0.0001"
                      min="0.001"
                      placeholder="0.0000"
                      value={icpAmount}
                      onChange={(e) => handleIcpChange(e.target.value)}
                      className="pr-12"
                      data-ocid="mint-icp-amount"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ICP
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: {icpBalanceICP.toFixed(4)} ICP
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stk-amount">STK Amount</Label>
                  <div className="relative">
                    <Input
                      id="stk-amount"
                      type="number"
                      step="1"
                      min="1"
                      placeholder="0"
                      value={stkAmount}
                      onChange={(e) => handleStkChange(e.target.value)}
                      className="pr-12"
                      data-ocid="mint-stk-amount"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      STK
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ≈ $
                    {icpAmount
                      ? calculateUSDValue(Number.parseFloat(icpAmount))
                      : "0.00"}{" "}
                    USD
                  </p>
                </div>
              </div>

              {/* Exchange Preview */}
              {icpAmount && stkAmount && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">You pay:</span>
                    <span className="font-mono font-medium">
                      {icpAmount} ICP + 0.0001 fee
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">You receive:</span>
                    <span className="font-mono font-bold text-primary">
                      {stkAmount} STK
                    </span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Exchange rate:</span>
                    <span>1 ICP = {exchangeRate} STK</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>ICP price (live):</span>
                    <span>
                      ${(currentICPPrice ?? 0).toFixed(2)} ({priceSource})
                    </span>
                  </div>
                </div>
              )}

              {/* Minting progress */}
              {isMinting && mintStep && (
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0" />
                  <AlertDescription className="text-sm">
                    {mintStep === 1 ? (
                      <>
                        <strong>Step 1/2:</strong> Sending ICP to treasury
                        on-chain... Please wait and do not close this page.
                      </>
                    ) : (
                      <>
                        <strong>Step 2/2:</strong> ICP received! Crediting STK
                        tokens to your wallet...
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Minting error */}
              {lastMintingError && !isMinting && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm">
                    <strong>Error:</strong> {lastMintingError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success state */}
              {mintSuccess && (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-sm">
                    <strong>Minting successful!</strong> STK tokens have been
                    added to your wallet and ICP has been transferred to the
                    admin treasury.
                  </AlertDescription>
                </Alert>
              )}

              {/* Mint Button */}
              <Button
                onClick={handleMintTokens}
                disabled={
                  isMinting ||
                  !icpAmount ||
                  !stkAmount ||
                  !isTreasuryConfigured ||
                  !hasEnoughBalance
                }
                className="w-full"
                data-ocid="mint-tokens-btn"
                size="lg"
              >
                {isMinting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {mintButtonLabel()}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    {mintButtonLabel()}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                <Shield className="w-3 h-3 inline mr-1" />
                STK is only issued after on-chain ICP transfer confirmation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                STK Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(tokenBalance || 0).toLocaleString()} STK
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchBalance()}
                className="mt-2 p-0 h-auto text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Exchange Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                1 ICP = {exchangeRate} STK
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fixed conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Live ICP Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">
                  ${priceLoading ? "..." : (currentICPPrice ?? 0).toFixed(2)}
                </div>
                {priceChange24h !== 0 && (
                  <div
                    className={`flex items-center text-sm ${priceChange24h > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {priceChange24h > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(priceChange24h).toFixed(2)}%
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {getPriceStatusIcon()}
                <p className="text-xs text-muted-foreground">
                  {getPriceStatusText()} • {formatTimeAgo(lastPriceUpdate)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchPrice()}
                  className="p-0 h-auto ml-1"
                >
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="w-4 h-4" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-green-600">
                  {marketStatus?.healthScore || 0}%
                </div>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${marketStatus?.healthScore || 0}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Price feed reliability
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Circulating Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(circulatingSupply !== undefined ? Number(circulatingSupply) : 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                of 1,000,000 STK total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Price Oracle Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Live ICP Price Oracle Status
            </CardTitle>
            <CardDescription>
              Real-time ICP/USD pricing via backend HTTPS outcalls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Price Source</div>
                  <div className="text-sm text-muted-foreground">
                    {priceSource}
                  </div>
                </div>
                {getPriceStatusIcon()}
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Backend Feeds</div>
                  <div className="text-sm text-muted-foreground">
                    {priceFeeds?.length || 0} sources
                  </div>
                </div>
                <Database className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Last Update</div>
                  <div className="text-sm text-muted-foreground">
                    {formatTimeAgo(lastPriceUpdate)}
                  </div>
                </div>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">24h Change</div>
                  <div
                    className={`text-sm ${priceChange24h > 0 ? "text-green-600" : priceChange24h < 0 ? "text-red-600" : "text-muted-foreground"}`}
                  >
                    {priceChange24h > 0 ? "+" : ""}
                    {priceChange24h.toFixed(2)}%
                  </div>
                </div>
                {priceChange24h > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : priceChange24h < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : (
                  <Activity className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {hasBackendPriceFeeds && (
              <div className="mt-4 pt-4 border-t">
                <h5 className="font-medium mb-2">
                  Active Backend Price Oracles
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {priceFeeds?.slice(0, 6).map((feed) => (
                    <div
                      key={feed.source}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                    >
                      <span>{feed.source}</span>
                      <Badge
                        variant={
                          feed.status === "live" ? "default" : "secondary"
                        }
                      >
                        {feed.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Your verified STK token purchase records with on-chain ICP payment
              confirmation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Loading transaction history...
                </p>
              </div>
            ) : hasPurchaseHistory ? (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>ICP Amount</TableHead>
                      <TableHead>STK Received</TableHead>
                      <TableHead>USD Value</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseHistory
                      .slice(0, 10)
                      .map((purchase, index: number) => {
                        const icpAmt = Number(purchase.icpAmount) / 100_000_000;
                        const exchangeRateUsed =
                          Number(purchase.exchangeRate) / 100;
                        const usdValue =
                          icpAmt * (exchangeRateUsed || (currentICPPrice ?? 0));

                        return (
                          <TableRow
                            key={`purchase-${purchase.id?.toString() ?? index}`}
                          >
                            <TableCell className="font-mono text-sm">
                              {formatDate(purchase.timestamp)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {icpAmt.toFixed(4)} ICP
                            </TableCell>
                            <TableCell className="font-mono">
                              {Number(purchase.stkAmount).toLocaleString()} STK
                            </TableCell>
                            <TableCell className="font-mono">
                              ${usdValue.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              $
                              {(
                                exchangeRateUsed ||
                                (currentICPPrice ?? 0)
                              ).toFixed(2)}
                              /ICP
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  purchase.status === "Completed"
                                    ? "default"
                                    : purchase.status === "Pending"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {purchase.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
                {purchaseHistory.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Showing 10 most recent • Total: {purchaseHistory.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">
                  Your STK token purchases will appear here after on-chain ICP
                  payment
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How Minting Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong>Enter Amount</strong>
                  <p className="text-muted-foreground">
                    Choose how much ICP to spend or how many STK tokens to
                    receive. Amounts sync automatically.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong>Click Mint</strong>
                  <p className="text-muted-foreground">
                    Your Internet Identity wallet signs and submits the ICP
                    transfer on-chain to the admin treasury.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong>Receive STK</strong>
                  <p className="text-muted-foreground">
                    After the transfer is confirmed on-chain, STK tokens are
                    credited to your wallet instantly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Guarantees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <p>
                  <strong>No deposit address:</strong> ICP goes directly from
                  your wallet to the admin treasury in one transaction.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <p>
                  <strong>Internet Identity secured:</strong> Only you can sign
                  transfers from your account — the canister cannot.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <p>
                  <strong>No STK without ICP:</strong> The ledger transfer must
                  succeed before STK is credited. No tokens without confirmed
                  payment.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <p>
                  <strong>Block height audit:</strong> Every successful mint
                  records the ICP ledger block height for full auditability.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
