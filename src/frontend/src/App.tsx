import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useLoginUser } from "@/hooks/useQueries";
import { AdminPage } from "@/pages/AdminPage";
import { GamePage } from "@/pages/GamePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { MintingPage } from "@/pages/MintingPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { StatsPage } from "@/pages/StatsPage";
import { TeamsPage } from "@/pages/TeamsPage";
import { WalletPage } from "@/pages/WalletPage";
import { ThemeProvider } from "next-themes";
import { useEffect, useRef, useState } from "react";
import "./index.css";

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

interface AppState {
  currentPage: Page;
  gameData?: {
    players: string[];
  };
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({
    currentPage: "home",
  });

  const { loginStatus, identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const accessControlInitialized = useRef(false);
  const loginUserCalled = useRef(false);
  const { mutate: loginUser } = useLoginUser();

  // Initialize access control as soon as the actor is available and the user
  // is authenticated. This assigns #admin to the first caller and #user to all
  // subsequent callers, which is required for the admin panel and wallet init.
  useEffect(() => {
    if (
      actor &&
      !actorFetching &&
      identity &&
      !accessControlInitialized.current
    ) {
      accessControlInitialized.current = true;
      actor.initializeAccessControl().catch((err: unknown) => {
        console.warn("initializeAccessControl failed:", err);
        // Reset so it can retry on next render cycle if needed
        accessControlInitialized.current = false;
      });
    }
  }, [actor, actorFetching, identity]);

  // Call loginUser() after authentication so the first user becomes admin and
  // subsequent callers receive the user role.
  useEffect(() => {
    if (actor && !actorFetching && identity && !loginUserCalled.current) {
      loginUserCalled.current = true;
      loginUser(undefined, {
        onError: (err) => {
          console.warn("loginUser failed:", err);
          loginUserCalled.current = false;
        },
      });
    }
  }, [actor, actorFetching, identity, loginUser]);

  const navigateTo = (page: Page, data?: any) => {
    setAppState({
      currentPage: page,
      gameData: data,
    });
  };

  const renderCurrentPage = () => {
    switch (appState.currentPage) {
      case "home":
        return <HomePage onNavigate={navigateTo} />;
      case "game":
        return (
          <GamePage
            players={appState.gameData?.players || []}
            onNavigate={navigateTo}
          />
        );
      case "history":
        return <HistoryPage onNavigate={navigateTo} />;
      case "stats":
        return <StatsPage onNavigate={navigateTo} />;
      case "leaderboard":
        return <LeaderboardPage onNavigate={navigateTo} />;
      case "profile":
        return <ProfilePage onNavigate={navigateTo} />;
      case "login":
        return <LoginPage onNavigate={navigateTo} />;
      case "teams":
        return <TeamsPage onNavigate={navigateTo} />;
      case "wallet":
        return <WalletPage onNavigate={navigateTo} />;
      case "admin":
        return <AdminPage onNavigate={navigateTo} />;
      case "minting":
        return <MintingPage onNavigate={navigateTo} />;
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  // Show loading screen while initializing Internet Identity or actor
  if (isInitializing || actorFetching) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <div className="space-y-2">
              <p className="text-lg font-medium">Loading Bowling Tracker</p>
              <p className="text-sm text-muted-foreground">
                {isInitializing
                  ? "Initializing authentication..."
                  : "Connecting to backend..."}
              </p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Show error state if actor failed to load
  if (!actor && !actorFetching && !isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 max-w-md mx-auto p-6">
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold">Connection Error</h1>
            <p className="text-muted-foreground">
              Unable to connect to the backend service. Please check your
              internet connection and try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen flex flex-col bg-background">
        <Header
          currentPage={appState.currentPage}
          onNavigate={navigateTo}
          isAuthenticated={!!identity}
          loginStatus={loginStatus}
        />
        <main className="flex-1">{renderCurrentPage()}</main>
        <Footer />
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
