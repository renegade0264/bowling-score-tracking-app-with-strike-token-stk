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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useAdjustPoolAllocation,
  useDistributeTokens,
  useGetAdminIcpWallet,
  useGetAllUserProfiles,
  useGetCirculatingSupply,
  useGetDetailedAuditTrail,
  useGetMarketDataStatus,
  useGetPoolManagementHistory,
  useGetPriceFeeds,
  useGetPurchaseHistory,
  useGetTokenAllocations,
  useGetTotalSupply,
  useGetTokenTransactions,
  useIsCallerAdmin,
  useSetAdminIcpWallet,
  useSetLedgerPrincipal,
  useTransferFromPoolToUser,
  useTransferTokensBetweenPools,
} from "@/hooks/useQueries";
import type { TokenPool } from "@/types";
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  CheckCircle,
  Coins,
  Database,
  DollarSign,
  Download,
  FileText,
  Gift,
  History,
  Info,
  RefreshCw,
  Send,
  Server,
  Settings,
  Shield,
  Sliders,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
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

interface AdminPageProps {
  onNavigate: (page: Page) => void;
}

interface AuditEntry {
  category: string;
  allocated: bigint;
  distributed: bigint;
  remaining: bigint;
  description: string;
  transactions: number;
  lastActivity: string | null;
  recipients: Array<{
    principal: string;
    amount: bigint;
    timestamp: bigint;
    transactionHash?: string;
    reason?: string;
  }>;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const { identity: _identity } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const {
    data: tokenPools,
    isLoading: _allocationsLoading,
    refetch: refetchAllocations,
  } = useGetTokenAllocations();
  const { data: userProfiles, isLoading: profilesLoading } =
    useGetAllUserProfiles();
  useGetTokenTransactions();
  const {
    data: detailedAuditTrail,
    isLoading: _auditLoading,
    refetch: refetchAudit,
  } = useGetDetailedAuditTrail();
  const { data: priceFeeds } = useGetPriceFeeds();
  const { data: allPurchaseHistory } = useGetPurchaseHistory();
  const { data: marketStatus } = useGetMarketDataStatus();
  const { data: poolManagementHistory, refetch: refetchPoolHistory } =
    useGetPoolManagementHistory();
  const { data: totalSupply } = useGetTotalSupply();
  const { data: circulatingSupply } = useGetCirculatingSupply();
  const { mutate: distributeTokens, isPending: isDistributing } =
    useDistributeTokens();
  const { mutate: transferBetweenPools, isPending: isTransferring } =
    useTransferTokensBetweenPools();
  const { mutate: transferFromPool, isPending: isTransferringToUser } =
    useTransferFromPoolToUser();
  const { mutate: adjustPoolAllocation, isPending: isAdjusting } =
    useAdjustPoolAllocation();

  const [ledgerPrincipalInput, setLedgerPrincipalInput] = useState(
    "ryjl3-tyaaa-aaaaa-aaaba-cai",
  );
  const { mutate: setLedgerPrincipal, isPending: isSettingLedger } =
    useSetLedgerPrincipal();

  // Admin ICP wallet configuration
  const { data: currentAdminWallet } = useGetAdminIcpWallet();
  const { mutate: setAdminWallet, isPending: isSettingAdminWallet } =
    useSetAdminIcpWallet();
  const [adminWalletInput, setAdminWalletInput] = useState("");

  const [distributionAmount, setDistributionAmount] = useState("");
  const [distributionCategory, setDistributionCategory] = useState("");
  const [distributionNote, setDistributionNote] = useState("");

  // Pool transfer state
  const [transferSourcePool, setTransferSourcePool] = useState("");
  const [transferDestPool, setTransferDestPool] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  // Pool-to-user transfer state
  const [poolToUserPool, setPoolToUserPool] = useState("");
  const [poolToUserRecipient, setPoolToUserRecipient] = useState("");
  const [poolToUserAmount, setPoolToUserAmount] = useState("");
  const [showPoolToUserDialog, setShowPoolToUserDialog] = useState(false);

  // Pool adjustment state
  const [adjustPoolName, setAdjustPoolName] = useState("");
  const [adjustNewTotal, setAdjustNewTotal] = useState("");
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);

  // Live allocation state
  const [liveAllocDestPool, setLiveAllocDestPool] = useState("");
  const [liveAllocAmount, setLiveAllocAmount] = useState("");
  const [_showLiveAllocDialog, setShowLiveAllocDialog] = useState(false);

  // Show loading state
  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">
              Checking admin permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Access Denied</CardTitle>
              <CardDescription>
                You don't have administrator privileges to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => onNavigate("home")} variant="outline">
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleDistributeTokens = () => {
    if (!distributionAmount || !distributionCategory) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = BigInt(Number.parseInt(distributionAmount));
    distributeTokens(
      {
        category: distributionCategory,
        amount,
        recipients: undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `Successfully distributed ${distributionAmount} STK tokens`,
          );
          setDistributionAmount("");
          setDistributionCategory("");
          setDistributionNote("");
          refetchAllocations();
          refetchAudit();
        },
        onError: (error) => {
          toast.error(`Failed to distribute tokens: ${error.message}`);
        },
      },
    );
  };

  const handleTransferBetweenPools = () => {
    if (!transferSourcePool || !transferDestPool || !transferAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (transferSourcePool === transferDestPool) {
      toast.error("Source and destination pools must be different");
      return;
    }

    const amount = BigInt(Number.parseInt(transferAmount));
    transferBetweenPools(
      {
        sourcePool: transferSourcePool,
        destinationPool: transferDestPool,
        amount,
      },
      {
        onSuccess: () => {
          toast.success(
            `Successfully transferred ${transferAmount} STK from ${transferSourcePool} to ${transferDestPool}`,
          );
          setTransferSourcePool("");
          setTransferDestPool("");
          setTransferAmount("");
          setShowTransferDialog(false);
          refetchAllocations();
          refetchPoolHistory();
          refetchAudit();
        },
        onError: (error) => {
          toast.error(`Failed to transfer tokens: ${error.message}`);
        },
      },
    );
  };

  const handleTransferFromPoolToUser = () => {
    if (!poolToUserPool || !poolToUserRecipient || !poolToUserAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amount = BigInt(Number.parseInt(poolToUserAmount));
    transferFromPool(
      {
        poolName: poolToUserPool,
        recipient: poolToUserRecipient,
        amount,
      },
      {
        onSuccess: () => {
          toast.success(
            `Successfully transferred ${poolToUserAmount} STK from ${poolToUserPool} to ${poolToUserRecipient}`,
          );
          setPoolToUserPool("");
          setPoolToUserRecipient("");
          setPoolToUserAmount("");
          setShowPoolToUserDialog(false);
          refetchAllocations();
          refetchPoolHistory();
          refetchAudit();
        },
        onError: (error) => {
          toast.error(`Failed to transfer tokens: ${error.message}`);
        },
      },
    );
  };

  const handleAdjustPoolAllocation = () => {
    if (!adjustPoolName || !adjustNewTotal) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newTotal = BigInt(Number.parseInt(adjustNewTotal));
    adjustPoolAllocation(
      {
        poolName: adjustPoolName,
        newTotal,
      },
      {
        onSuccess: () => {
          toast.success(
            `Successfully adjusted ${adjustPoolName} allocation to ${adjustNewTotal} STK`,
          );
          setAdjustPoolName("");
          setAdjustNewTotal("");
          setShowAdjustDialog(false);
          refetchAllocations();
          refetchPoolHistory();
          refetchAudit();
        },
        onError: (error) => {
          toast.error(`Failed to adjust pool allocation: ${error.message}`);
        },
      },
    );
  };

  const handleLiveAllocation = () => {
    if (!liveAllocDestPool || !liveAllocAmount) {
      toast.error("Please select a destination pool and enter an amount");
      return;
    }

    const amount = BigInt(Number.parseInt(liveAllocAmount));

    // Use Treasury Reserves as the default source for live allocations
    transferBetweenPools(
      {
        sourcePool: "Treasury Reserves",
        destinationPool: liveAllocDestPool,
        amount,
      },
      {
        onSuccess: () => {
          toast.success(
            `Successfully allocated ${liveAllocAmount} STK to ${liveAllocDestPool}`,
          );
          setLiveAllocDestPool("");
          setLiveAllocAmount("");
          setShowLiveAllocDialog(false);
          refetchAllocations();
          refetchPoolHistory();
          refetchAudit();
        },
        onError: (error) => {
          toast.error(`Failed to allocate tokens: ${error.message}`);
        },
      },
    );
  };

  // Type-safe calculations with proper fallbacks using TokenPool type
  const safeTokenPools = (tokenPools || []) as TokenPool[];
  const totalAllocated = safeTokenPools.reduce(
    (sum, pool) => sum + Number(pool.total),
    0,
  );
  const totalRemaining = safeTokenPools.reduce(
    (sum, pool) => sum + Number(pool.remaining),
    0,
  );
  const totalDistributed = totalAllocated - totalRemaining;

  const safeDetailedAuditTrail = (detailedAuditTrail || []) as AuditEntry[];
  const auditStats = {
    totalDistributed: safeDetailedAuditTrail.reduce(
      (sum, entry) => sum + Number(entry.distributed),
      0,
    ),
    totalTransactions: safeDetailedAuditTrail.reduce(
      (sum, entry) => sum + entry.transactions,
      0,
    ),
    totalRecipients: safeDetailedAuditTrail.reduce(
      (sum, entry) => sum + entry.recipients.length,
      0,
    ),
    categoriesActive: safeDetailedAuditTrail.filter(
      (entry) => entry.transactions > 0,
    ).length,
  };

  // Get admin team wallet balance
  const adminTeamWallet = safeTokenPools.find(
    (pool) => pool.name === "Admin Team Wallet",
  );
  const adminTeamBalance = adminTeamWallet
    ? Number(adminTeamWallet.remaining)
    : 0;

  // Get available pools for live allocation (excluding Treasury Reserves as it's the source)
  const liveAllocPools = safeTokenPools.filter(
    (pool) =>
      pool.name === "Minting Platform" ||
      pool.name === "In-Game Rewards" ||
      pool.name === "Admin Team Wallet",
  );

  const handleExportAuditReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTokens: 1000000,
      totalAllocated,
      totalDistributed: totalDistributed,
      totalRemaining,
      tokenPools: safeTokenPools,
      auditTrail: safeDetailedAuditTrail,
      poolManagementHistory: poolManagementHistory || [],
      priceFeeds: priceFeeds || [],
      purchaseHistory: allPurchaseHistory || [],
      marketStatus: marketStatus || {},
      adminTeamWallet: {
        balance: adminTeamBalance,
        transactions:
          poolManagementHistory?.filter(
            (tx: any) =>
              tx.pool === "Admin Team Wallet" ||
              tx.reference?.includes("Admin Team Wallet"),
          ).length || 0,
      },
      summary: {
        totalTransactions: auditStats.totalTransactions,
        totalRecipients: auditStats.totalRecipients,
        categoriesActive: auditStats.categoriesActive,
        backendPriceFeeds: priceFeeds?.length || 0,
        totalPurchases: allPurchaseHistory?.length || 0,
        poolManagementActions: poolManagementHistory?.length || 0,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stk-audit-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Complete audit report exported successfully");
  };

  const hasTokenSystem =
    safeTokenPools.length > 0 || auditStats.totalDistributed > 0;
  const hasPaymentSystem =
    (priceFeeds?.length || 0) > 0 || (allPurchaseHistory?.length || 0) > 0;
  const isSystemActive = hasTokenSystem || hasPaymentSystem;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="w-8 h-8 text-primary" />
              Admin Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage STK token distribution, pool allocations, ICP payment
              processing, and system administration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchAllocations();
                refetchAudit();
                refetchPoolHistory();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Badge variant="secondary" className="text-sm">
              Admin Access
            </Badge>
          </div>
        </div>

        {/* System Status Alert */}
        {isSystemActive ? (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <strong>ICP Payment & STK Token System Active:</strong> The
              backend Motoko canister is operational with
              {hasPaymentSystem &&
                ` real ICP payment processing (${priceFeeds?.length || 0} price feeds, ${allPurchaseHistory?.length || 0} transactions)`}
              {hasTokenSystem && " live STK token ledger functionality"}. All
              operations including balance tracking, transfers, rewards,
              minting, payment processing, and pool management are fully
              functional with persistent on-chain data.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <strong>Payment & Token System Status:</strong> The backend is
              configured for real ICP payment processing and STK token
              operations. Full functionality including ICP payment processing,
              live price feeds, token minting, balance tracking, transfers, and
              pool management will be available once the complete system is
              activated in the backend canister.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Admin Tabs */}
        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              System Status
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              ICP Payments
            </TabsTrigger>
            <TabsTrigger value="tokenomics" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Token Allocations
            </TabsTrigger>
            <TabsTrigger
              value="liveallocation"
              className="flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Live Allocation
            </TabsTrigger>
            <TabsTrigger
              value="poolmanagement"
              className="flex items-center gap-2"
            >
              <Sliders className="w-4 h-4" />
              Pool Management
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Management
            </TabsTrigger>
          </TabsList>

          {/* System Status Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Backend Canister</span>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>User Authentication</span>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Game System</span>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ICP Payment Processing</span>
                    <Badge
                      variant="secondary"
                      className={
                        hasPaymentSystem
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {hasPaymentSystem ? "Active" : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>STK Token System</span>
                    <Badge
                      variant="secondary"
                      className={
                        hasTokenSystem
                          ? "bg-green-100 text-green-800"
                          : "bg-orange-100 text-orange-800"
                      }
                    >
                      {hasTokenSystem ? "Active" : "Ready"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Platform Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Users</span>
                    <span className="font-mono">
                      {userProfiles?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Players</span>
                    <span className="font-mono">
                      {userProfiles?.filter((p) => p.games.length > 0).length ||
                        0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Games Played</span>
                    <span className="font-mono">
                      {userProfiles?.reduce(
                        (sum, p) => sum + p.games.length,
                        0,
                      ) || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ICP Payments Processed</span>
                    <span className="font-mono">
                      {allPurchaseHistory?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>STK Tokens Distributed</span>
                    <span className="font-mono">
                      {totalDistributed.toLocaleString()} STK
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Market Data Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  ICP Price Feed & Payment System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {marketStatus?.healthScore || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      System Health
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {priceFeeds?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Price Feeds
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {marketStatus?.currentPrice?.toFixed(2) || "0.00"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current ICP Price
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {allPurchaseHistory?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Purchases
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ICP Ledger Configuration */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  ICP Ledger Configuration
                </CardTitle>
                <CardDescription>
                  Set the ICP ledger canister principal. Required for all wallet
                  balance checks, ICP transfers, and STK minting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="ledger-principal">
                      Ledger Canister Principal
                    </Label>
                    <Input
                      id="ledger-principal"
                      data-ocid="admin-ledger-principal-input"
                      value={ledgerPrincipalInput}
                      onChange={(e) => setLedgerPrincipalInput(e.target.value)}
                      placeholder="ryjl3-tyaaa-aaaaa-aaaba-cai"
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    data-ocid="admin-ledger-principal-set"
                    disabled={isSettingLedger || !ledgerPrincipalInput.trim()}
                    onClick={() => {
                      setLedgerPrincipal(
                        { principalText: ledgerPrincipalInput.trim() },
                        {
                          onSuccess: () => {
                            toast.success(
                              "Ledger principal set successfully. Wallet and minting operations are now active.",
                            );
                          },
                          onError: (error) => {
                            toast.error(
                              `Failed to set ledger principal: ${error.message}`,
                            );
                          },
                        },
                      );
                    }}
                  >
                    {isSettingLedger ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Setting...
                      </>
                    ) : (
                      <>
                        <Server className="w-4 h-4 mr-2" />
                        Set Ledger Principal
                      </>
                    )}
                  </Button>
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    The default ICP ledger is{" "}
                    <code className="font-mono text-xs bg-muted px-1 rounded">
                      ryjl3-tyaaa-aaaaa-aaaba-cai
                    </code>
                    . This is pre-configured on startup. Use this field only if
                    you need to override it.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Minting Payment Destination */}
            <Card className="border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-orange-500" />
                  Minting Payment Destination
                </CardTitle>
                <CardDescription>
                  ICP payments from users minting STK tokens will be sent to
                  this address. Must be set before minting can succeed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentAdminWallet && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Current Admin ICP Wallet
                    </p>
                    <p className="font-mono text-xs break-all text-foreground">
                      {currentAdminWallet}
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Configured
                    </Badge>
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="admin-icp-wallet">
                      Admin ICP Wallet Address
                    </Label>
                    <Input
                      id="admin-icp-wallet"
                      data-ocid="admin-icp-wallet-input"
                      value={adminWalletInput}
                      onChange={(e) => setAdminWalletInput(e.target.value)}
                      placeholder="Enter 64-character hex Account ID..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be a 64-character hexadecimal ICP Account ID (not a
                      Principal ID)
                    </p>
                  </div>
                  <Button
                    data-ocid="admin-icp-wallet-set"
                    disabled={
                      isSettingAdminWallet ||
                      !adminWalletInput.trim() ||
                      !/^[0-9a-f]{64}$/i.test(adminWalletInput.trim())
                    }
                    onClick={() => {
                      setAdminWallet(
                        { address: adminWalletInput.trim() },
                        {
                          onSuccess: () => {
                            toast.success(
                              "Admin ICP wallet set. Minting payments will be sent here.",
                            );
                            setAdminWalletInput("");
                          },
                          onError: (error) => {
                            toast.error(
                              `Failed to set admin wallet: ${error.message}`,
                            );
                          },
                        },
                      );
                    }}
                  >
                    {isSettingAdminWallet ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Set Wallet
                      </>
                    )}
                  </Button>
                </div>
                {adminWalletInput &&
                  !/^[0-9a-f]{64}$/i.test(adminWalletInput) && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-xs">
                        Invalid format. ICP Account ID must be exactly 64
                        hexadecimal characters (0-9, a-f).
                      </AlertDescription>
                    </Alert>
                  )}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    When a user mints STK tokens, the ICP they deposited is
                    transferred from the canister to this admin wallet address.
                    If this is not set, minting will fail.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ICP Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  ICP Payment Processing Overview
                </CardTitle>
                <CardDescription>
                  Real-time ICP payment processing with live price feeds and
                  secure on-chain transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasPaymentSystem ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {allPurchaseHistory?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total ICP Payments
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {priceFeeds?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Active Price Feeds
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {allPurchaseHistory
                            ?.reduce(
                              (sum: number, p: any) =>
                                sum + Number(p.stkAmount),
                              0,
                            )
                            .toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          STK Tokens Minted
                        </div>
                      </div>
                    </div>

                    {/* Recent Payments */}
                    <div>
                      <h4 className="font-medium mb-4">Recent ICP Payments</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>ICP Amount</TableHead>
                            <TableHead>STK Minted</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPurchaseHistory
                            ?.slice(0, 10)
                            .map((payment: any, index: number) => (
                              <TableRow
                                key={
                                  payment.id?.toString() ?? `payment-${index}`
                                }
                              >
                                <TableCell className="font-mono text-sm">
                                  {new Date(
                                    Number(payment.timestamp) / 1000000,
                                  ).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {payment.user.toString().slice(0, 20)}...
                                </TableCell>
                                <TableCell className="font-mono">
                                  {(
                                    Number(payment.icpAmount) / 100000000
                                  ).toFixed(4)}{" "}
                                  ICP
                                </TableCell>
                                <TableCell className="font-mono">
                                  {Number(payment.stkAmount).toLocaleString()}{" "}
                                  STK
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      payment.status === "completed"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {payment.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Price Feeds Status */}
                    <div>
                      <h4 className="font-medium mb-4">
                        Backend Price Feeds Status
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {priceFeeds?.map((feed: any) => (
                          <div
                            key={feed.source}
                            className="p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{feed.source}</span>
                              <Badge
                                variant={
                                  feed.status === "live"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {feed.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              ${(Number(feed.icpUsd) / 100).toFixed(2)} USD
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Updated:{" "}
                              {new Date(
                                Number(feed.lastUpdated) / 1000000,
                              ).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      ICP Payment System Ready
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      The backend is configured for real ICP payment processing
                      with live price feeds, exchange rate locking, and secure
                      on-chain transactions. Payment functionality will be
                      available once the complete system is activated.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Token Allocations Tab */}
          <TabsContent value="tokenomics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>STK Token Allocations</CardTitle>
                <CardDescription>
                  Current token distribution according to established tokenomics
                  (1,000,000 total STK)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Supply overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-2xl font-bold text-primary">
                      {(totalSupply !== undefined ? Number(totalSupply) : 1_000_000).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Supply (fixed cap)</div>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-2xl font-bold text-green-600">
                      {(circulatingSupply !== undefined ? Number(circulatingSupply) : 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Circulating Supply (in wallets)</div>
                  </div>
                </div>
                {hasTokenSystem ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {totalAllocated.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Allocated
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {totalDistributed.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Distributed
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {totalRemaining.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Remaining
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {safeTokenPools.map((pool) => (
                        <div
                          key={pool.name}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{pool.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Token allocation pool
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">
                              {Number(pool.total).toLocaleString()} STK
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(
                                Number(pool.total) - Number(pool.remaining)
                              ).toLocaleString()}{" "}
                              distributed •{" "}
                              {Number(pool.remaining).toLocaleString()}{" "}
                              remaining
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Token Distribution Controls */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Distribute Tokens</CardTitle>
                        <CardDescription>
                          Manually distribute tokens from allocation categories
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <select
                              id="category"
                              value={distributionCategory}
                              onChange={(e) =>
                                setDistributionCategory(e.target.value)
                              }
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="">Select category...</option>
                              {safeTokenPools.map((pool) => (
                                <option key={pool.name} value={pool.name}>
                                  {pool.name} (
                                  {Number(pool.remaining).toLocaleString()}{" "}
                                  remaining)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="amount">Amount (STK)</Label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="0"
                              value={distributionAmount}
                              onChange={(e) =>
                                setDistributionAmount(e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="note">Distribution Note</Label>
                          <Textarea
                            id="note"
                            placeholder="Add a note about this distribution..."
                            value={distributionNote}
                            onChange={(e) =>
                              setDistributionNote(e.target.value)
                            }
                          />
                        </div>
                        <Button
                          onClick={handleDistributeTokens}
                          disabled={
                            isDistributing ||
                            !distributionAmount ||
                            !distributionCategory
                          }
                          className="w-full"
                        >
                          {isDistributing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Distributing...
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4 mr-2" />
                              Distribute Tokens
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Token System Ready:</strong> The tokenomics
                        structure is defined and ready for implementation. Once
                        the backend token system is active, this panel will show
                        live allocation data and distribution controls.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">Treasury Reserves</div>
                          <div className="text-sm text-muted-foreground">
                            Strategic development fund
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">400,000 STK</div>
                          <div className="text-xs text-muted-foreground">
                            40%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">Minting Platform</div>
                          <div className="text-sm text-muted-foreground">
                            ICP payment purchases
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">200,000 STK</div>
                          <div className="text-xs text-muted-foreground">
                            20%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">In-Game Rewards</div>
                          <div className="text-sm text-muted-foreground">
                            Strikes, spares, game completion
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">150,000 STK</div>
                          <div className="text-xs text-muted-foreground">
                            15%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">Admin Team Wallet</div>
                          <div className="text-sm text-muted-foreground">
                            Team management
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">150,000 STK</div>
                          <div className="text-xs text-muted-foreground">
                            15%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">NFT Staking Rewards</div>
                          <div className="text-sm text-muted-foreground">
                            Future NFT integration
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">100,000 STK</div>
                          <div className="text-xs text-muted-foreground">
                            10%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Allocation Tab */}
          <TabsContent value="liveallocation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Live Token Allocation
                </CardTitle>
                <CardDescription>
                  Real-time allocation of STK tokens between minting platform,
                  in-game rewards, and admin team wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTokenSystem ? (
                  <div className="space-y-6">
                    {/* Admin Team Wallet Display */}
                    <Card className="border-primary/20 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wallet className="w-5 h-5 text-primary" />
                          Admin Team Wallet
                        </CardTitle>
                        <CardDescription>
                          Dedicated wallet for team-related token management
                          (separate from user teams)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Current Balance
                            </div>
                            <div className="text-2xl font-bold text-primary">
                              {adminTeamBalance.toLocaleString()} STK
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-lg px-4 py-2"
                          >
                            Admin Wallet
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Live Allocation Interface */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Allocate Tokens
                        </CardTitle>
                        <CardDescription>
                          Transfer tokens from Treasury Reserves to selected
                          destination pools
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Destination Pool</Label>
                            <Select
                              value={liveAllocDestPool}
                              onValueChange={setLiveAllocDestPool}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select destination pool..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Minting Platform">
                                  Minting Platform
                                </SelectItem>
                                <SelectItem value="In-Game Rewards">
                                  In-Game Rewards
                                </SelectItem>
                                <SelectItem value="Admin Team Wallet">
                                  Admin Team Wallet
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {liveAllocDestPool && (
                              <p className="text-xs text-muted-foreground">
                                Current balance:{" "}
                                {safeTokenPools
                                  .find((p) => p.name === liveAllocDestPool)
                                  ?.remaining.toString() || "0"}{" "}
                                STK
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Amount (STK)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={liveAllocAmount}
                              onChange={(e) =>
                                setLiveAllocAmount(e.target.value)
                              }
                            />
                            <p className="text-xs text-muted-foreground">
                              Treasury Reserves:{" "}
                              {safeTokenPools
                                .find((p) => p.name === "Treasury Reserves")
                                ?.remaining.toString() || "0"}{" "}
                              STK available
                            </p>
                          </div>
                        </div>

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Tokens will be transferred from Treasury Reserves to
                            the selected destination pool. All transactions are
                            recorded in the audit trail.
                          </AlertDescription>
                        </Alert>

                        <Button
                          onClick={handleLiveAllocation}
                          disabled={
                            isTransferring ||
                            !liveAllocDestPool ||
                            !liveAllocAmount
                          }
                          className="w-full"
                        >
                          {isTransferring ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              Allocating...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Allocate Tokens
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Pool Balances Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Pool Balances Overview
                        </CardTitle>
                        <CardDescription>
                          Current balances for all allocation pools
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {liveAllocPools.map((pool) => (
                            <div
                              key={pool.name}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="font-medium">{pool.name}</div>
                              <div className="text-right">
                                <div className="font-mono font-bold">
                                  {Number(pool.remaining).toLocaleString()} STK
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {Number(pool.total).toLocaleString()} total
                                </div>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="font-medium">
                              Treasury Reserves (Source)
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-primary">
                                {Number(
                                  safeTokenPools.find(
                                    (p) => p.name === "Treasury Reserves",
                                  )?.remaining || 0,
                                ).toLocaleString()}{" "}
                                STK
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {Number(
                                  safeTokenPools.find(
                                    (p) => p.name === "Treasury Reserves",
                                  )?.total || 0,
                                ).toLocaleString()}{" "}
                                total
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Allocations */}
                    {poolManagementHistory &&
                      poolManagementHistory.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <History className="w-4 h-4" />
                              Recent Allocations
                            </CardTitle>
                            <CardDescription>
                              Latest token allocation transactions
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {poolManagementHistory
                                .slice(0, 5)
                                .map((tx: any, index: number) => (
                                  <div
                                    key={tx.id?.toString() ?? `tx-${index}`}
                                    className="flex items-center justify-between p-3 bg-muted/30 rounded text-sm"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {tx.transactionType}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(
                                          Number(tx.timestamp) / 1000000,
                                        ).toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-medium">
                                        {Number(tx.amount).toLocaleString()} STK
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {tx.reference}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Live Allocation Ready
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      The live token allocation system allows real-time
                      distribution of STK tokens between the minting platform,
                      in-game rewards, and admin team wallet. This feature will
                      be available once the backend token system is active.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pool Management Tab */}
          <TabsContent value="poolmanagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  Advanced Pool Management
                </CardTitle>
                <CardDescription>
                  Transfer tokens between pools and adjust allocations without
                  affecting payment processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTokenSystem ? (
                  <div className="space-y-6">
                    {/* Pool Management Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Transfer Between Pools */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4" />
                            Transfer Between Pools
                          </CardTitle>
                          <CardDescription>
                            Move tokens from one pool to another
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Dialog
                            open={showTransferDialog}
                            onOpenChange={setShowTransferDialog}
                          >
                            <DialogTrigger asChild>
                              <Button className="w-full">
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Transfer Tokens
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Transfer Tokens Between Pools
                                </DialogTitle>
                                <DialogDescription>
                                  Move tokens from one allocation pool to
                                  another. This action is logged in the audit
                                  trail.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Source Pool</Label>
                                  <Select
                                    value={transferSourcePool}
                                    onValueChange={setTransferSourcePool}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select source pool..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {safeTokenPools.map((pool) => (
                                        <SelectItem
                                          key={pool.name}
                                          value={pool.name}
                                        >
                                          {pool.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Destination Pool</Label>
                                  <Select
                                    value={transferDestPool}
                                    onValueChange={setTransferDestPool}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select destination pool..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {safeTokenPools
                                        .filter((p) => p.name !== transferSourcePool)
                                        .map((pool) => (
                                          <SelectItem
                                            key={pool.name}
                                            value={pool.name}
                                          >
                                            {pool.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Amount (STK)</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={transferAmount}
                                    onChange={(e) =>
                                      setTransferAmount(e.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowTransferDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleTransferBetweenPools}
                                  disabled={
                                    isTransferring ||
                                    !transferSourcePool ||
                                    !transferDestPool ||
                                    !transferAmount
                                  }
                                >
                                  {isTransferring ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Transferring...
                                    </>
                                  ) : (
                                    "Transfer Tokens"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>

                      {/* Adjust Pool Allocation */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Sliders className="w-4 h-4" />
                            Adjust Pool Allocation
                          </CardTitle>
                          <CardDescription>
                            Change the total allocation for a pool
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Dialog
                            open={showAdjustDialog}
                            onOpenChange={setShowAdjustDialog}
                          >
                            <DialogTrigger asChild>
                              <Button className="w-full" variant="outline">
                                <Sliders className="w-4 h-4 mr-2" />
                                Adjust Allocation
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Adjust Pool Allocation
                                </DialogTitle>
                                <DialogDescription>
                                  Change the total allocation for a pool. This
                                  will adjust the remaining balance accordingly.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Pool</Label>
                                  <Select
                                    value={adjustPoolName}
                                    onValueChange={setAdjustPoolName}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select pool..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {safeTokenPools.map((pool) => (
                                        <SelectItem
                                          key={pool.name}
                                          value={pool.name}
                                        >
                                          {pool.name} (Current:{" "}
                                          {Number(pool.total).toLocaleString()}{" "}
                                          STK)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>New Total Allocation (STK)</Label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={adjustNewTotal}
                                    onChange={(e) =>
                                      setAdjustNewTotal(e.target.value)
                                    }
                                  />
                                  {adjustPoolName && adjustNewTotal && (
                                    <p className="text-sm text-muted-foreground">
                                      Current:{" "}
                                      {Number(
                                        safeTokenPools.find(
                                          (p) => p.name === adjustPoolName,
                                        )?.total || 0,
                                      ).toLocaleString()}{" "}
                                      STK → New:{" "}
                                      {Number.parseInt(
                                        adjustNewTotal,
                                      ).toLocaleString()}{" "}
                                      STK
                                    </p>
                                  )}
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => setShowAdjustDialog(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleAdjustPoolAllocation}
                                  disabled={
                                    isAdjusting ||
                                    !adjustPoolName ||
                                    !adjustNewTotal
                                  }
                                >
                                  {isAdjusting ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Adjusting...
                                    </>
                                  ) : (
                                    "Adjust Allocation"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Transfer Pool to User Wallet */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <ArrowRightLeft className="w-4 h-4" />
                          Transfer Pool STK to User Wallet
                        </CardTitle>
                        <CardDescription>
                          Send STK tokens from a pool directly to a user's wallet balance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Dialog
                          open={showPoolToUserDialog}
                          onOpenChange={setShowPoolToUserDialog}
                        >
                          <DialogTrigger asChild>
                            <Button className="w-full" variant="outline">
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Transfer to User Wallet
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Transfer STK from Pool to User
                              </DialogTitle>
                              <DialogDescription>
                                Deduct STK from a pool and credit it to a user's
                                wallet. The recipient must have a registered wallet.
                                This action is logged in the audit trail.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Source Pool</Label>
                                <Select
                                  value={poolToUserPool}
                                  onValueChange={setPoolToUserPool}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select pool..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {safeTokenPools.map((pool) => (
                                      <SelectItem
                                        key={pool.name}
                                        value={pool.name}
                                      >
                                        {pool.name} (
                                        {Number(pool.remaining).toLocaleString()}{" "}
                                        STK remaining)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Recipient Principal ID</Label>
                                <Input
                                  placeholder="aaaaa-aa..."
                                  value={poolToUserRecipient}
                                  onChange={(e) =>
                                    setPoolToUserRecipient(e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Amount (STK)</Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={poolToUserAmount}
                                  onChange={(e) =>
                                    setPoolToUserAmount(e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setShowPoolToUserDialog(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleTransferFromPoolToUser}
                                disabled={
                                  isTransferringToUser ||
                                  !poolToUserPool ||
                                  !poolToUserRecipient ||
                                  !poolToUserAmount
                                }
                              >
                                {isTransferringToUser ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Transferring...
                                  </>
                                ) : (
                                  "Transfer to Wallet"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>

                    {/* Pool Management History */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Pool Management History
                        </CardTitle>
                        <CardDescription>
                          Complete audit trail of all pool transfers and
                          adjustments
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {poolManagementHistory &&
                        poolManagementHistory.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {poolManagementHistory.map(
                                (tx: any, index: number) => (
                                  <TableRow
                                    key={tx.id?.toString() ?? `tx-${index}`}
                                  >
                                    <TableCell className="font-mono text-sm">
                                      {new Date(
                                        Number(tx.timestamp) / 1000000,
                                      ).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {tx.transactionType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {tx.pool && (
                                        <span className="font-medium">
                                          {tx.pool}
                                        </span>
                                      )}
                                      {tx.reference && (
                                        <span className="text-muted-foreground">
                                          {" "}
                                          • {tx.reference}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="font-mono">
                                      {Number(tx.amount).toLocaleString()} STK
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant={
                                          tx.status === "Completed"
                                            ? "default"
                                            : "secondary"
                                        }
                                      >
                                        {tx.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ),
                              )}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No pool management actions yet
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Real-time Pool Balances */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="w-5 h-5" />
                          Real-Time Pool Balances
                        </CardTitle>
                        <CardDescription>
                          Current status of all token pools with live updates
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {safeTokenPools.map((pool) => {
                            const distributed =
                              Number(pool.total) - Number(pool.remaining);
                            const percentageUsed =
                              Number(pool.total) > 0
                                ? (distributed / Number(pool.total)) * 100
                                : 0;

                            return (
                              <div
                                key={pool.name}
                                className="p-4 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium">{pool.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {percentageUsed.toFixed(1)}% used
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <div className="text-muted-foreground">
                                      Total
                                    </div>
                                    <div className="font-mono font-medium">
                                      {Number(pool.total).toLocaleString()}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">
                                      Distributed
                                    </div>
                                    <div className="font-mono font-medium text-green-600">
                                      {distributed.toLocaleString()}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">
                                      Remaining
                                    </div>
                                    <div className="font-mono font-medium text-orange-600">
                                      {Number(pool.remaining).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary rounded-full h-2 transition-all"
                                    style={{ width: `${percentageUsed}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sliders className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Pool Management Ready
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Advanced pool management features including token
                      transfers between pools and allocation adjustments will be
                      available once the backend token system is active. These
                      tools allow you to manage tokenomics dynamically without
                      affecting payment processing.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Comprehensive Audit Trail
                </CardTitle>
                <CardDescription>
                  Complete breakdown of all STK token distributions with full
                  traceability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTokenSystem ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {auditStats.totalDistributed.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Distributed
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {auditStats.totalTransactions}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Transactions
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {auditStats.totalRecipients}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Unique Recipients
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {poolManagementHistory?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Pool Actions
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {safeDetailedAuditTrail.map((entry) => (
                        <Card key={entry.category}>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {entry.category}
                            </CardTitle>
                            <CardDescription>
                              {entry.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="text-center p-3 bg-muted/50 rounded">
                                <div className="font-bold">
                                  {Number(entry.allocated).toLocaleString()} STK
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Allocated
                                </div>
                              </div>
                              <div className="text-center p-3 bg-muted/50 rounded">
                                <div className="font-bold text-green-600">
                                  {Number(entry.distributed).toLocaleString()}{" "}
                                  STK
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Distributed
                                </div>
                              </div>
                              <div className="text-center p-3 bg-muted/50 rounded">
                                <div className="font-bold text-orange-600">
                                  {Number(entry.remaining).toLocaleString()} STK
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Remaining
                                </div>
                              </div>
                            </div>

                            {entry.recipients.length > 0 && (
                              <div>
                                <h5 className="font-medium mb-2">
                                  Recent Recipients
                                </h5>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {entry.recipients
                                    .slice(0, 5)
                                    .map((recipient) => (
                                      <div
                                        key={recipient.principal}
                                        className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                                      >
                                        <div>
                                          <div className="font-mono text-xs">
                                            {recipient.principal.slice(0, 20)}
                                            ...
                                          </div>
                                          {recipient.reason && (
                                            <div className="text-muted-foreground">
                                              {recipient.reason}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium">
                                            {Number(
                                              recipient.amount,
                                            ).toLocaleString()}{" "}
                                            STK
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {new Date(
                                              Number(recipient.timestamp) /
                                                1000000,
                                            ).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  {entry.recipients.length > 5 && (
                                    <div className="text-center text-sm text-muted-foreground">
                                      +{entry.recipients.length - 5} more
                                      recipients
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button
                      onClick={handleExportAuditReport}
                      variant="outline"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Complete Audit Report
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Audit Trail Ready
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      The comprehensive audit trail system is ready to track all
                      STK token distributions with complete transparency and
                      traceability once the token system is active.
                    </p>
                    <Button onClick={handleExportAuditReport} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export System Status Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Overview</CardTitle>
                <CardDescription>
                  Registered users and their activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profilesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {userProfiles?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Users
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {userProfiles?.filter((p) => p.games.length > 0)
                            .length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Active Players
                        </div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {userProfiles?.reduce(
                            (sum, p) => sum + p.games.length,
                            0,
                          ) || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total Games
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-medium">Recent User Activity</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {userProfiles?.slice(0, 10).map((profile) => (
                          <div
                            key={profile.principal?.toString()}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {profile.displayName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {profile.games.length} games • Avg:{" "}
                                {Number(profile.averageScore)} • High:{" "}
                                {Number(profile.highestScore)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {profile.principal.toString().slice(0, 20)}...
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {profile.games.length > 0 ? "Active" : "New"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
