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
import { Minus, Play, Plus } from "lucide-react";
import { useState } from "react";

type Page = "home" | "game" | "history" | "stats";

interface HomePageProps {
  onNavigate: (page: Page, data?: any) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [playerCount, setPlayerCount] = useState(1);
  const [playerNames, setPlayerNames] = useState(["Player 1"]);

  const updatePlayerCount = (count: number) => {
    setPlayerCount(count);
    const newNames = Array.from(
      { length: count },
      (_, i) => playerNames[i] || `Player ${i + 1}`,
    );
    setPlayerNames(newNames);
  };

  const updatePlayerName = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const startGame = () => {
    const validNames = playerNames
      .slice(0, playerCount)
      .filter((name) => name.trim());
    onNavigate("game", { players: validNames });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="relative w-full max-w-lg mx-auto mb-6 overflow-hidden rounded-xl shadow-2xl">
            <img
              src="/assets/bowling-hero.jpg"
              alt="Bowling pins being hit by a bowling ball"
              className="w-full h-48 sm:h-56 md:h-64 object-cover bowling-pins-hero"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg mb-2">
                Strike Tracker
              </h1>
              <p className="text-sm sm:text-base text-white/90 drop-shadow-md">
                Track your bowling scores and strike your way to success!
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="w-5 h-5" />
              <span>Start New Game</span>
            </CardTitle>
            <CardDescription>
              Set up your game with 1-5 players and start tracking your scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Number of Players</Label>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updatePlayerCount(Math.max(1, playerCount - 1))
                  }
                  disabled={playerCount <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-semibold w-8 text-center">
                  {playerCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    updatePlayerCount(Math.min(5, playerCount + 1))
                  }
                  disabled={playerCount >= 5}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Player Names</Label>
              {Array.from({ length: playerCount }, (_, i) => (
                <div key={`player-input-${i + 1}`} className="space-y-2">
                  <Input
                    placeholder={`Player ${i + 1}`}
                    value={playerNames[i] || ""}
                    onChange={(e) => updatePlayerName(i, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <Button
              onClick={startGame}
              className="w-full"
              size="lg"
              disabled={playerNames
                .slice(0, playerCount)
                .some((name) => !name.trim())}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
