import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetAllGames, useGetAllPlayerStats } from "@/hooks/useQueries";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

type Page = "home" | "game" | "history" | "stats" | "leaderboard";

interface StatsPageProps {
  onNavigate: (page: Page) => void;
}

export function StatsPage({ onNavigate }: StatsPageProps) {
  const { data: games = [], isLoading: gamesLoading } = useGetAllGames();
  const { data: playerStats = [], isLoading: statsLoading } =
    useGetAllPlayerStats();

  const calculateOverallStats = () => {
    if (games.length === 0) {
      return {
        totalGames: 0,
        totalPlayers: 0,
        averageScore: 0,
        highestScore: 0,
        totalStrikes: 0,
        totalSpares: 0,
      };
    }

    const allScores = games.flatMap((game) => game.totalScores.map(Number));
    let totalStrikes = 0;
    let totalSpares = 0;

    for (const game of games) {
      for (const playerFrames of game.frames) {
        for (const frame of playerFrames) {
          if (Number(frame.roll1) === 10) {
            totalStrikes++;
          } else if (Number(frame.roll1) + Number(frame.roll2) === 10) {
            totalSpares++;
          }
        }
      }
    }

    const uniquePlayers = new Set(
      games.flatMap((game) => game.players.map((p) => p.name)),
    );

    return {
      totalGames: games.length,
      totalPlayers: uniquePlayers.size,
      averageScore: Math.round(
        allScores.reduce((a, b) => a + b, 0) / allScores.length,
      ),
      highestScore: Math.max(...allScores),
      totalStrikes,
      totalSpares,
    };
  };

  const stats = calculateOverallStats();

  const getImprovementTips = (): string[] => {
    const tips: string[] = [
      "Practice your stance and approach for consistency.",
      "Focus on spare shooting to improve overall scores.",
      "Work on hitting the pocket for better pin carry.",
      "Maintain a consistent release point.",
      "Study lane conditions and adjust your targeting.",
      "Practice difficult spare combinations regularly.",
    ];

    return tips.slice(0, 4); // Show 4 random tips
  };

  const getTopPerformers = () => {
    return playerStats
      .sort((a, b) => Number(b.averageScore) - Number(a.averageScore))
      .slice(0, 5);
  };

  if (gamesLoading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading statistics...</p>
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
            <h1 className="text-3xl font-bold mb-2">Bowling Statistics</h1>
            <p className="text-muted-foreground">
              Overall performance statistics and insights
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {stats.totalGames === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Statistics Yet</h3>
              <p className="text-muted-foreground mb-6">
                Play some games to see bowling statistics and insights!
              </p>
              <Button onClick={() => onNavigate("home")}>
                <Trophy className="w-4 h-4 mr-2" />
                Start First Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalGames}</p>
                      <p className="text-sm text-muted-foreground">
                        Total Games
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPlayers}</p>
                      <p className="text-sm text-muted-foreground">
                        Total Players
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.averageScore}</p>
                      <p className="text-sm text-muted-foreground">
                        Average Score
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Target className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.highestScore}</p>
                      <p className="text-sm text-muted-foreground">
                        Highest Score
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>Performance Breakdown</span>
                  </CardTitle>
                  <CardDescription>
                    Overall bowling performance analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {stats.totalStrikes}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Strikes
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {stats.totalSpares}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Spares
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Games Played</span>
                      <Badge variant="default">{stats.totalGames}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Players</span>
                      <Badge variant="secondary">{stats.totalPlayers}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Overall Average</span>
                      <Badge variant="outline">{stats.averageScore}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Improvement Tips</span>
                  </CardTitle>
                  <CardDescription>
                    General suggestions to improve your bowling game
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getImprovementTips().map((tip) => (
                      <div key={tip} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <p className="text-sm">{tip}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            {getTopPerformers().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="w-5 h-5" />
                    <span>Top Performers</span>
                  </CardTitle>
                  <CardDescription>
                    Players with the highest average scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getTopPerformers().map((player, index) => (
                      <div
                        key={player.name}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{player.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {player.scores?.length ?? 0} games played
                            </p>
                          </div>
                        </div>
                        <Badge variant="default">
                          {Number(player.averageScore)} avg
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
