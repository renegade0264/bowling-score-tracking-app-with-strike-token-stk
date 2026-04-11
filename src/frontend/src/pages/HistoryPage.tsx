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
import { useGetAllGames, useGetUserGames } from "@/hooks/useQueries";
import {
  ArrowLeft,
  Calendar,
  Clock,
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

interface HistoryPageProps {
  onNavigate: (page: Page) => void;
}

export function HistoryPage({ onNavigate }: HistoryPageProps) {
  const { identity } = useInternetIdentity();
  const { data: allGames = [], isLoading: allGamesLoading } = useGetAllGames();
  const { data: userGames = [], isLoading: userGamesLoading } = useGetUserGames(
    identity?.getPrincipal(),
  );

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGameDuration = (frames: any[][]) => {
    // Estimate game duration based on number of frames (rough calculation)
    const totalFrames = frames.reduce(
      (acc, playerFrames) => acc + playerFrames.length,
      0,
    );
    const estimatedMinutes = Math.round(totalFrames * 2); // ~2 minutes per frame
    return `~${estimatedMinutes} min`;
  };

  const renderGameCard = (game: any, showOwnership = false) => (
    <Card key={Number(game.id)} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Game #{Number(game.id)}</CardTitle>
          <div className="flex items-center space-x-2">
            {showOwnership && game.owner && (
              <Badge variant="secondary">My Game</Badge>
            )}
            <Badge variant="outline">
              <Users className="w-3 h-3 mr-1" />
              {game.players.length} players
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(game.timestamp)}</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{getGameDuration(game.frames)}</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Player Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {game.players.map((player: any, index: number) => (
              <div
                key={player.name ?? `player-${index}`}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium truncate">{player.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Avg: {Number(player.averageScore)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">
                    {Number(game.totalScores[index]) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Final Score</p>
                </div>
              </div>
            ))}
          </div>

          {/* Game Stats */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Target className="w-4 h-4" />
                <span>
                  High:{" "}
                  {Math.max(
                    ...game.totalScores.map((score: bigint) => Number(score)),
                  )}
                </span>
              </span>
              <span>
                Avg:{" "}
                {Math.round(
                  game.totalScores.reduce(
                    (acc: number, score: bigint) => acc + Number(score),
                    0,
                  ) / game.totalScores.length,
                )}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {game.frames[0]?.length || 10} frames
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (allGamesLoading || (identity && userGamesLoading)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading game history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Game History</h1>
            <p className="text-muted-foreground">
              {identity
                ? "View your personal games and all public games"
                : "Browse all completed bowling games"}
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {identity ? (
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">
                My Games ({userGames.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Games ({allGames.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              {userGames.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">
                      No Personal Games Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Start playing games to build your personal history!
                    </p>
                    <Button onClick={() => onNavigate("home")}>
                      <Trophy className="w-4 h-4 mr-2" />
                      Play Your First Game
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {userGames
                    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                    .map((game) => renderGameCard(game, false))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {allGames.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">
                      No Games Recorded
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      No games have been completed yet. Be the first to play!
                    </p>
                    <Button onClick={() => onNavigate("home")}>
                      <Trophy className="w-4 h-4 mr-2" />
                      Start First Game
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {allGames
                    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                    .map((game) => renderGameCard(game, true))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {allGames.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Games Recorded
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    No games have been completed yet. Be the first to play!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={() => onNavigate("home")}>
                      <Trophy className="w-4 h-4 mr-2" />
                      Start First Game
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onNavigate("login")}
                    >
                      Sign In for Personal History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    All Games ({allGames.length})
                  </h2>
                  <Button variant="outline" onClick={() => onNavigate("login")}>
                    Sign In for Personal History
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {allGames
                    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
                    .map((game) => renderGameCard(game, false))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
