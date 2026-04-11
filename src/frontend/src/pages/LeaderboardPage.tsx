import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import {
  useGetAllGames,
  useGetAllUserProfiles,
  useGetGlobalLeaderboard,
  useGetLeaderboard,
} from "@/hooks/useQueries";
import type { UserProfile } from "@/types";
import {
  ArrowLeft,
  Crown,
  LogIn,
  Medal,
  Target,
  Trophy,
  Users,
} from "lucide-react";

type Page =
  | "home"
  | "game"
  | "history"
  | "stats"
  | "leaderboard"
  | "profile"
  | "login";

interface LeaderboardPageProps {
  onNavigate: (page: Page) => void;
}

export function LeaderboardPage({ onNavigate }: LeaderboardPageProps) {
  const { identity } = useInternetIdentity();
  const { data: classicLeaderboard = [], isLoading: classicLoading } =
    useGetLeaderboard();
  const { data: globalLeaderboard = [], isLoading: globalLoading } =
    useGetGlobalLeaderboard();
  const { data: games = [], isLoading: gamesLoading } = useGetAllGames();
  const { data: allUserProfiles = [] } = useGetAllUserProfiles();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center text-sm font-bold">
            {rank}
          </div>
        );
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">1st Place</Badge>
        );
      case 2:
        return <Badge variant="secondary">2nd Place</Badge>;
      case 3:
        return <Badge variant="outline">3rd Place</Badge>;
      default:
        return <Badge variant="outline">#{rank}</Badge>;
    }
  };

  const getHighestSingleScore = () => {
    if (games.length === 0) return 0;
    const allScores = games.flatMap((game) => game.totalScores.map(Number));
    return Math.max(...allScores);
  };

  const getTotalGamesPlayed = () => {
    return games.length;
  };

  const getUserDisplayName = (profile?: UserProfile | null) => {
    if (!profile) return "Unknown User";
    return (
      profile.displayName ||
      `User ${profile.principal.toString().slice(0, 8)}...`
    );
  };

  const getUserInitials = (profile?: UserProfile | null) => {
    if (!profile) return "U";
    if (profile.displayName) {
      const words = profile.displayName.trim().split(" ");
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0].slice(0, 2).toUpperCase();
    }
    const principalStr = profile.principal.toString();
    return principalStr.slice(0, 2).toUpperCase();
  };

  const getProfileForPlayer = (player: any) => {
    return (
      allUserProfiles.find(
        (profile) =>
          profile.principal?.toString() === player.principal?.toString(),
      ) || null
    );
  };

  const renderLeaderboardCard = (
    player: any,
    index: number,
    isGlobal = false,
  ) => {
    const profile = isGlobal ? getProfileForPlayer(player) : null;
    const displayName = isGlobal ? getUserDisplayName(profile) : player.name;
    const initials = isGlobal
      ? getUserInitials(profile)
      : player.name.charAt(0).toUpperCase();

    return (
      <div
        key={isGlobal ? player.principal?.toString() : player.name}
        className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
          index < 3 ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-10 h-10">
            {getRankIcon(index + 1)}
          </div>
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {isGlobal
                ? `${player.games.length} games played`
                : `${player.scores.length} games played`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{Number(player.averageScore)}</p>
          <p className="text-sm text-muted-foreground">Average</p>
        </div>
      </div>
    );
  };

  if (classicLoading || globalLoading || gamesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">
              Top bowling performers across all games
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{getTotalGamesPlayed()}</p>
              <p className="text-sm text-muted-foreground">Total Games</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{globalLeaderboard.length}</p>
              <p className="text-sm text-muted-foreground">
                Registered Players
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{getHighestSingleScore()}</p>
              <p className="text-sm text-muted-foreground">Highest Score</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="global" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global">
              Global Rankings ({globalLeaderboard.length})
            </TabsTrigger>
            <TabsTrigger value="classic">
              All Players ({classicLeaderboard.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-6">
            {globalLeaderboard.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Crown className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Registered Players Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Sign in and play games to appear on the global leaderboard!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => onNavigate("login")}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In to Compete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onNavigate("home")}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Play as Guest
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Top 3 Podium for Global */}
                {globalLeaderboard.length >= 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Crown className="w-5 h-5" />
                        <span>Global Champions</span>
                      </CardTitle>
                      <CardDescription>
                        Top 3 registered players by average score
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {globalLeaderboard.slice(0, 3).map((player, index) => {
                          const profile = getProfileForPlayer(player);
                          return (
                            <div
                              key={player.principal?.toString()}
                              className="text-center p-6 bg-muted/50 rounded-lg"
                            >
                              <div className="mb-4">
                                {getRankIcon(index + 1)}
                              </div>
                              <Avatar className="h-16 w-16 mx-auto mb-4">
                                <AvatarFallback className="text-lg">
                                  {getUserInitials(profile)}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="font-bold text-lg mb-2">
                                {getUserDisplayName(profile)}
                              </h3>
                              <div className="space-y-1">
                                <p className="text-2xl font-bold text-primary">
                                  {Number(player.averageScore)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Average Score
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {player.games.length} games played
                                </p>
                              </div>
                              {getRankBadge(index + 1)}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Full Global Rankings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>Global Rankings</span>
                    </CardTitle>
                    <CardDescription>
                      All registered players sorted by average score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {globalLeaderboard.map((player, index) =>
                        renderLeaderboardCard(player, index, true),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="classic" className="space-y-6">
            {classicLeaderboard.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Rankings Yet
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    No games have been completed yet. Play some games to see the
                    leaderboard!
                  </p>
                  <Button onClick={() => onNavigate("home")}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Start First Game
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Top 3 Podium for Classic */}
                {classicLeaderboard.length >= 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Crown className="w-5 h-5" />
                        <span>Top 3 Champions</span>
                      </CardTitle>
                      <CardDescription>
                        The highest performing players across all games
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {classicLeaderboard.slice(0, 3).map((player, index) => (
                          <div
                            key={player.name}
                            className="text-center p-6 bg-muted/50 rounded-lg"
                          >
                            <div className="mb-4">{getRankIcon(index + 1)}</div>
                            <Avatar className="h-16 w-16 mx-auto mb-4">
                              <AvatarFallback className="text-lg">
                                {player.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <h3 className="font-bold text-lg mb-2">
                              {player.name}
                            </h3>
                            <div className="space-y-1">
                              <p className="text-2xl font-bold text-primary">
                                {Number(player.averageScore)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Average Score
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {player.scores?.length ?? 0} games played
                              </p>
                            </div>
                            {getRankBadge(index + 1)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Full Classic Rankings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="w-5 h-5" />
                      <span>All Player Rankings</span>
                    </CardTitle>
                    <CardDescription>
                      Complete leaderboard sorted by average score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {classicLeaderboard.map((player, index) =>
                        renderLeaderboardCard(player, index, false),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card>
          <CardHeader>
            <CardTitle>Join the Competition</CardTitle>
            <CardDescription>
              {identity
                ? "Play games to improve your ranking"
                : "Sign in to compete on the global leaderboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={() => onNavigate("home")} className="w-full">
                <Trophy className="w-4 h-4 mr-2" />
                Play New Game
              </Button>
              {identity ? (
                <Button
                  variant="outline"
                  onClick={() => onNavigate("profile")}
                  className="w-full"
                >
                  <Users className="w-4 h-4 mr-2" />
                  View My Profile
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => onNavigate("login")}
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In to Compete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => onNavigate("stats")}
                className="w-full"
              >
                <Target className="w-4 h-4 mr-2" />
                View Statistics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
