import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetTokenBalance,
  useIsCallerAdmin,
} from "@/hooks/useQueries";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Coins,
  Crown,
  History,
  LogIn,
  LogOut,
  Menu,
  Settings,
  Trophy,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

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

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isAuthenticated: boolean;
  loginStatus: string;
}

export function Header({
  currentPage,
  onNavigate,
  isAuthenticated,
  loginStatus,
}: HeaderProps) {
  const { clear, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: profile } = useGetCallerUserProfile();
  const profilePictureUrl = profile?.profilePicture || null;
  const { data: tokenBalance } = useGetTokenBalance();
  const { data: isAdmin } = useIsCallerAdmin();

  const handleLogout = async () => {
    try {
      await clear();
      // Clear all cached data on logout
      queryClient.clear();
      onNavigate("home");
    } catch (error) {
      console.error("Logout error:", error);
      // Still navigate home even if logout fails
      onNavigate("home");
    }
  };

  const getUserInitials = () => {
    if (profile?.displayName) {
      const words = profile.displayName.trim().split(" ");
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0].slice(0, 2).toUpperCase();
    }
    if (!identity) return "U";
    const principal = identity.getPrincipal().toString();
    return principal.slice(0, 2).toUpperCase();
  };

  // Only show token balance if backend token system is implemented and balance > 0
  const hasTokenSystem = tokenBalance !== undefined && Number(tokenBalance) > 0;

  return (
    <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/assets/generated/bowling-ball-icon.png"
              alt="Strike Tracker Logo"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-primary">Strike Tracker</h1>
          </button>

          <nav className="hidden md:flex items-center space-x-6">
            <Button
              variant={currentPage === "home" ? "default" : "ghost"}
              className="flex items-center space-x-2"
              onClick={() => onNavigate("home")}
            >
              <Trophy className="w-4 h-4" />
              <span>New Game</span>
            </Button>
            <Button
              variant={currentPage === "teams" ? "default" : "ghost"}
              className="flex items-center space-x-2"
              onClick={() => onNavigate("teams")}
            >
              <Users className="w-4 h-4" />
              <span>Teams</span>
            </Button>
            <Button
              variant={currentPage === "leaderboard" ? "default" : "ghost"}
              className="flex items-center space-x-2"
              onClick={() => onNavigate("leaderboard")}
            >
              <Crown className="w-4 h-4" />
              <span>Leaderboard</span>
            </Button>
            <Button
              variant={currentPage === "history" ? "default" : "ghost"}
              className="flex items-center space-x-2"
              onClick={() => onNavigate("history")}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </Button>
            <Button
              variant={currentPage === "stats" ? "default" : "ghost"}
              className="flex items-center space-x-2"
              onClick={() => onNavigate("stats")}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Stats</span>
            </Button>
            {isAuthenticated && (
              <>
                <Button
                  variant={currentPage === "wallet" ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                  onClick={() => onNavigate("wallet")}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Wallet</span>
                  {hasTokenSystem && (
                    <Badge variant="secondary" className="ml-1">
                      {Number(tokenBalance)} STK
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={currentPage === "minting" ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                  onClick={() => onNavigate("minting")}
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy STK</span>
                </Button>
              </>
            )}
            {isAuthenticated && isAdmin && (
              <Button
                variant={currentPage === "admin" ? "default" : "ghost"}
                className="flex items-center space-x-2"
                onClick={() => onNavigate("admin")}
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </Button>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {/* Token Balance Display for Mobile */}
            {isAuthenticated && hasTokenSystem && (
              <div className="md:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate("wallet")}
                  className="flex items-center space-x-1"
                >
                  <Coins className="w-4 h-4" />
                  <span>{Number(tokenBalance)} STK</span>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onNavigate("home")}>
                    <Trophy className="w-4 h-4 mr-2" />
                    New Game
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("teams")}>
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("leaderboard")}>
                    <Crown className="w-4 h-4 mr-2" />
                    Leaderboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("history")}>
                    <History className="w-4 h-4 mr-2" />
                    History
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("stats")}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Stats
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    <>
                      <DropdownMenuItem onClick={() => onNavigate("wallet")}>
                        <Wallet className="w-4 h-4 mr-2" />
                        Wallet
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onNavigate("minting")}>
                        <Zap className="w-4 h-4 mr-2" />
                        Buy STK
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAuthenticated && isAdmin && (
                    <DropdownMenuItem onClick={() => onNavigate("admin")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                  >
                    <Avatar className="h-10 w-10">
                      {profilePictureUrl ? (
                        <AvatarImage
                          src={profilePictureUrl}
                          alt="Profile picture"
                        />
                      ) : null}
                      <AvatarFallback className="bg-primary/10">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onNavigate("profile")}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("wallet")}>
                    <Wallet className="w-4 h-4 mr-2" />
                    My Wallet
                    {hasTokenSystem && (
                      <Badge variant="secondary" className="ml-auto">
                        {Number(tokenBalance)} STK
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("minting")}>
                    <Zap className="w-4 h-4 mr-2" />
                    Buy STK Tokens
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => onNavigate("admin")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                onClick={() => onNavigate("login")}
                disabled={loginStatus === "logging-in"}
                className="flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {loginStatus === "logging-in" ? "Signing In..." : "Sign In"}
                </span>
              </Button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
