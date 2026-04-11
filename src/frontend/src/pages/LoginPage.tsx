import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Crown,
  Info,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect } from "react";

type Page =
  | "home"
  | "game"
  | "history"
  | "stats"
  | "leaderboard"
  | "profile"
  | "login";

interface LoginPageProps {
  onNavigate: (page: Page) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  const { login, loginStatus, isLoginError, loginError, isLoginSuccess } =
    useInternetIdentity();
  const { actor } = useActor();

  // After a successful login, initialize access control so the user gets
  // assigned a role (admin for first user, regular user for others), then
  // navigate to profile.
  useEffect(() => {
    if (isLoginSuccess && actor) {
      actor
        .initializeAccessControl()
        .catch((err: unknown) =>
          console.warn("initializeAccessControl on login failed:", err),
        )
        .finally(() => onNavigate("profile"));
    } else if (isLoginSuccess) {
      // actor not yet ready — navigate anyway; App.tsx will call init when actor loads
      onNavigate("profile");
    }
  }, [isLoginSuccess, actor, onNavigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sign In</h1>
            <p className="text-muted-foreground">
              Access your personal bowling profile and statistics
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Secure Authentication</CardTitle>
              <CardDescription>
                Sign in with Internet Identity 2.0 for secure, anonymous
                authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {loginError?.message ||
                      "Failed to sign in. Please try again."}
                    {loginError?.message?.includes("popup") && (
                      <div className="mt-2 space-y-1">
                        <div>
                          <strong>Troubleshooting:</strong>
                        </div>
                        <div>
                          • Allow popups for this site in your browser settings
                        </div>
                        <div>• Disable popup blockers temporarily</div>
                        <div>
                          • Try using a different browser if the issue persists
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Before signing in:</strong>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-sm">
                        Allow popups for this site
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-sm">
                        Ensure you have a stable internet connection
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="text-sm">
                        The authentication window will open in a new tab
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="text-center">
                <Button
                  onClick={handleLogin}
                  disabled={loginStatus === "logging-in"}
                  size="lg"
                  className="w-full max-w-sm"
                >
                  {loginStatus === "logging-in" ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Sign In with Internet Identity
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>
                  Internet Identity 2.0 provides secure, anonymous
                  authentication without requiring personal information or
                  passwords.
                </p>
                <p>
                  Your identity is cryptographically secured and works across
                  all Internet Computer applications.
                </p>
                <p className="text-xs">
                  <strong>Note:</strong> This application uses only official
                  Internet Identity authentication. No third-party OAuth
                  providers (like Google) are used.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefits of Signing In</CardTitle>
              <CardDescription>
                Unlock personalized features and track your bowling progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Personal Game History</h3>
                    <p className="text-sm text-muted-foreground">
                      Track all your games and see your progress over time
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Detailed Statistics</h3>
                    <p className="text-sm text-muted-foreground">
                      View your personal bowling statistics and trends
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Crown className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Global Leaderboard</h3>
                    <p className="text-sm text-muted-foreground">
                      Compete with other players and climb the rankings
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Team Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Create and join bowling teams with other players
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Don't want to sign in? You can still play games as a guest.
                </p>
                <Button variant="outline" onClick={() => onNavigate("home")}>
                  Continue as Guest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
