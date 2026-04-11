import { GameChat } from "@/components/GameChat";
import { PinSelector } from "@/components/PinSelector";
import { Scoreboard } from "@/components/Scoreboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSaveGame } from "@/hooks/useQueries";
import type { Frame, Player } from "@/types";
import { Home, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Page = "home" | "game" | "history" | "stats" | "leaderboard";

interface GamePageProps {
  players: string[];
  onNavigate: (page: Page) => void;
}

interface GameState {
  currentPlayer: number;
  currentFrame: number;
  currentRoll: number;
  frames: Frame[][]; // [player][frame]
  scores: number[][];
  gameComplete: boolean;
  gameId: bigint;
  remainingPins: number[]; // Track which specific pins are still standing
}

export function GamePage({ players, onNavigate }: GamePageProps) {
  const saveGameMutation = useSaveGame();

  const [gameState, setGameState] = useState<GameState>(() => ({
    currentPlayer: 0,
    currentFrame: 0,
    currentRoll: 1,
    frames: players.map(() =>
      Array.from({ length: 10 }, () => ({
        roll1: BigInt(0),
        roll2: BigInt(0),
        roll3: undefined,
        score: BigInt(0),
      })),
    ),
    scores: players.map(() => Array(10).fill(0)),
    gameComplete: false,
    gameId: BigInt(Date.now()), // Generate a unique game ID for chat
    remainingPins: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // All pins initially standing
  }));

  const calculateFrameScore = (
    frames: Frame[][],
    playerIndex: number,
    frameIndex: number,
  ): number => {
    const frame = frames[playerIndex][frameIndex];
    if (!frame) return 0;

    const roll1 = Number(frame.roll1);
    const roll2 = Number(frame.roll2);
    const roll3 = Number(frame.roll3 || 0);

    // 10th frame special scoring
    if (frameIndex === 9) {
      return roll1 + roll2 + roll3;
    }

    // Strike
    if (roll1 === 10) {
      let bonus = 0;
      if (frameIndex < 9) {
        const nextFrame = frames[playerIndex][frameIndex + 1];
        if (nextFrame) {
          bonus += Number(nextFrame.roll1);
          if (Number(nextFrame.roll1) === 10 && frameIndex < 8) {
            // Next frame is also a strike, need roll from frame after
            const frameAfter = frames[playerIndex][frameIndex + 2];
            if (frameAfter) {
              bonus += Number(frameAfter.roll1);
            }
          } else {
            bonus += Number(nextFrame.roll2 || 0);
          }
        }
      }
      return 10 + bonus;
    }

    // Spare
    if (roll1 + roll2 === 10) {
      let bonus = 0;
      if (frameIndex < 9) {
        const nextFrame = frames[playerIndex][frameIndex + 1];
        if (nextFrame) {
          bonus = Number(nextFrame.roll1);
        }
      }
      return 10 + bonus;
    }

    // Regular frame
    return roll1 + roll2;
  };

  const calculateTotalScore = (
    frames: Frame[][],
    playerIndex: number,
  ): number => {
    let total = 0;
    for (let i = 0; i < 10; i++) {
      total += calculateFrameScore(frames, playerIndex, i);
    }
    return total;
  };

  const handlePinsKnocked = (knockedPins: number[]) => {
    setGameState((prev) => {
      const newFrames = [...prev.frames];
      const currentPlayerFrames = [...newFrames[prev.currentPlayer]];
      const currentFrame = { ...currentPlayerFrames[prev.currentFrame] };

      const pinsKnocked = knockedPins.length;

      if (prev.currentRoll === 1) {
        currentFrame.roll1 = BigInt(pinsKnocked);
      } else if (prev.currentRoll === 2) {
        currentFrame.roll2 = BigInt(pinsKnocked);
      } else if (prev.currentRoll === 3) {
        currentFrame.roll3 = BigInt(pinsKnocked);
      }

      currentPlayerFrames[prev.currentFrame] = currentFrame;
      newFrames[prev.currentPlayer] = currentPlayerFrames;

      // Determine next state
      let nextPlayer = prev.currentPlayer;
      let nextFrame = prev.currentFrame;
      let nextRoll = prev.currentRoll;
      let gameComplete = prev.gameComplete;
      let newRemainingPins = [...prev.remainingPins];

      const isStrike = pinsKnocked === 10 && prev.currentRoll === 1;
      const isSpare =
        prev.currentRoll === 2 &&
        Number(currentFrame.roll1) + pinsKnocked === 10;
      const is10thFrame = prev.currentFrame === 9;

      if (is10thFrame) {
        // 10th frame logic
        if (prev.currentRoll === 1 && isStrike) {
          nextRoll = 2; // Continue for bonus rolls
          newRemainingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Reset pins for next roll
        } else if (
          prev.currentRoll === 2 &&
          (isSpare || Number(currentFrame.roll1) === 10)
        ) {
          nextRoll = 3; // Third roll for strike/spare
          newRemainingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Reset pins for third roll
        } else if (
          prev.currentRoll === 3 ||
          (prev.currentRoll === 2 && !isSpare)
        ) {
          // Move to next player or end game
          if (nextPlayer < players.length - 1) {
            nextPlayer++;
            nextFrame = 0;
            nextRoll = 1;
            newRemainingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Reset for new player
          } else {
            gameComplete = true;
          }
        } else {
          nextRoll++;
          // Remove knocked pins from remaining pins
          newRemainingPins = prev.remainingPins.filter(
            (pin) => !knockedPins.includes(pin),
          );
        }
      } else {
        // Regular frames
        if (isStrike || prev.currentRoll === 2) {
          // Move to next player or next frame
          if (nextPlayer < players.length - 1) {
            nextPlayer++;
          } else {
            nextPlayer = 0;
            nextFrame++;
          }
          nextRoll = 1;
          newRemainingPins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Reset pins for new frame
        } else {
          nextRoll = 2;
          // Remove knocked pins from remaining pins
          newRemainingPins = prev.remainingPins.filter(
            (pin) => !knockedPins.includes(pin),
          );
        }
      }

      // Calculate scores
      const newScores = newFrames.map((_playerFrames, playerIndex) =>
        Array.from({ length: 10 }, (_, frameIndex) =>
          calculateFrameScore(newFrames, playerIndex, frameIndex),
        ),
      );

      return {
        ...prev,
        frames: newFrames,
        scores: newScores,
        currentPlayer: nextPlayer,
        currentFrame: nextFrame,
        currentRoll: nextRoll,
        gameComplete,
        remainingPins: newRemainingPins,
      };
    });
  };

  const saveGame = async () => {
    try {
      const totalScores = gameState.frames.map((_, playerIndex) =>
        calculateTotalScore(gameState.frames, playerIndex),
      );

      const playersData: Player[] = players.map((name, index) => {
        const playerFrames = gameState.frames[index];
        let strikes = 0;
        let spares = 0;

        // Count strikes and spares for this game
        playerFrames.forEach((frame, frameIndex) => {
          const roll1 = Number(frame.roll1);
          const roll2 = Number(frame.roll2);

          if (frameIndex < 9) {
            // Regular frames
            if (roll1 === 10) {
              strikes++;
            } else if (roll1 + roll2 === 10) {
              spares++;
            }
          } else {
            // 10th frame
            if (roll1 === 10) strikes++;
            if (roll1 !== 10 && roll1 + roll2 === 10) spares++;
            if (roll1 === 10 && Number(frame.roll2 || 0) === 10) strikes++;
            if (
              roll1 === 10 &&
              Number(frame.roll2 || 0) !== 10 &&
              Number(frame.roll2 || 0) + Number(frame.roll3 || 0) === 10
            )
              spares++;
          }
        });

        const currentScore = totalScores[index];

        return {
          name,
          scores: [BigInt(currentScore)],
          averageScore: BigInt(currentScore),
          gamesPlayed: BigInt(1),
          highestScore: BigInt(currentScore),
          totalSpares: BigInt(spares),
          totalStrikes: BigInt(strikes),
          totalPoints: BigInt(currentScore),
        };
      });

      await saveGameMutation.mutateAsync({
        players: playersData,
        frames: gameState.frames,
        totalScores: totalScores.map((score) => BigInt(score)),
      });

      toast.success("Game saved successfully!");
      onNavigate("history");
    } catch (error) {
      toast.error("Failed to save game");
      console.error("Save game error:", error);
    }
  };

  if (!players || players.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground mb-4">No players selected</p>
        <Button onClick={() => onNavigate("home")}>
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Game Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <span>Frame {gameState.currentFrame + 1}</span>
                {gameState.gameComplete && (
                  <Badge variant="secondary">Game Complete</Badge>
                )}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => onNavigate("home")}>
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
                {gameState.gameComplete && (
                  <Button
                    onClick={saveGame}
                    disabled={saveGameMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveGameMutation.isPending ? "Saving..." : "Save Game"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Scoreboard */}
        <Scoreboard
          players={players}
          frames={gameState.frames}
          scores={gameState.scores}
          currentPlayer={gameState.currentPlayer}
          currentFrame={gameState.currentFrame}
          calculateTotalScore={calculateTotalScore}
        />

        {/* Pin Selector */}
        {!gameState.gameComplete && (
          <Card>
            <CardHeader>
              <CardTitle>
                {players[gameState.currentPlayer]} - Roll{" "}
                {gameState.currentRoll}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PinSelector
                remainingPins={gameState.remainingPins}
                onPinsKnocked={handlePinsKnocked}
              />
            </CardContent>
          </Card>
        )}

        {/* Game Chat */}
        <GameChat
          gameId={gameState.gameId}
          currentPlayer={players[gameState.currentPlayer]}
          players={players}
        />
      </div>
    </div>
  );
}
