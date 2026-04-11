import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Frame } from "@/types";

interface ScoreboardProps {
  players: string[];
  frames: Frame[][];
  scores: number[][];
  currentPlayer: number;
  currentFrame: number;
  calculateTotalScore: (frames: Frame[][], playerIndex: number) => number;
}

export function Scoreboard({
  players,
  frames,
  scores,
  currentPlayer,
  currentFrame,
  calculateTotalScore,
}: ScoreboardProps) {
  const formatRoll = (
    roll: bigint | undefined,
    isFirstRoll: boolean,
    prevRoll?: bigint,
  ): string => {
    if (roll === undefined) return "";
    const rollValue = Number(roll);

    if (rollValue === 0) return "-";
    if (rollValue === 10 && isFirstRoll) return "X"; // Strike
    if (!isFirstRoll && Number(prevRoll || 0) + rollValue === 10) return "/"; // Spare
    return rollValue.toString();
  };

  const getFrameDisplay = (playerFrames: Frame[], frameIndex: number) => {
    const frame = playerFrames[frameIndex];
    if (!frame) return { roll1: "", roll2: "", roll3: "", score: 0 };

    const roll1 = Number(frame.roll1);
    const roll2 = Number(frame.roll2);
    const roll3 = frame.roll3 ? Number(frame.roll3) : undefined;

    if (frameIndex === 9) {
      // 10th frame special display
      return {
        roll1: formatRoll(frame.roll1, true),
        roll2: formatRoll(frame.roll2, roll1 === 10, frame.roll1),
        roll3:
          roll3 !== undefined
            ? formatRoll(frame.roll3, roll1 === 10 || roll1 + roll2 === 10)
            : "",
        score: roll1 + roll2 + (roll3 || 0),
      };
    }

    return {
      roll1: formatRoll(frame.roll1, true),
      roll2: roll1 === 10 ? "" : formatRoll(frame.roll2, false, frame.roll1),
      roll3: "",
      score: roll1 === 10 ? 10 : roll1 + roll2,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoreboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left min-w-[120px]">Player</th>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((frameNum) => (
                  <th
                    key={`frame-header-${frameNum}`}
                    className="border p-2 text-center min-w-[60px]"
                  >
                    {frameNum}
                  </th>
                ))}
                <th className="border p-2 text-center min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, playerIndex) => {
                const isCurrentPlayer = playerIndex === currentPlayer;
                const totalScore = calculateTotalScore(frames, playerIndex);

                return (
                  <tr
                    key={`player-row-${player}`}
                    className={isCurrentPlayer ? "bg-primary/5" : ""}
                  >
                    <td className="border p-2 font-medium">
                      <div className="flex items-center space-x-2">
                        <span>{player}</span>
                        {isCurrentPlayer && (
                          <Badge variant="secondary">Current</Badge>
                        )}
                      </div>
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((frameIndex) => {
                      const frameDisplay = getFrameDisplay(
                        frames[playerIndex],
                        frameIndex,
                      );
                      const isCurrentFrame =
                        isCurrentPlayer && frameIndex === currentFrame;

                      return (
                        <td
                          key={`frame-${player}-${frameIndex + 1}`}
                          className={`border p-1 text-center ${
                            isCurrentFrame
                              ? "bg-primary/10 ring-2 ring-primary/20"
                              : ""
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex justify-center space-x-1 text-xs">
                              {frameIndex === 9 ? (
                                // 10th frame - show all three rolls in a row
                                <div className="flex space-x-1">
                                  <span className="w-4 text-center">
                                    {frameDisplay.roll1}
                                  </span>
                                  <span className="w-4 text-center">
                                    {frameDisplay.roll2}
                                  </span>
                                  <span className="w-4 text-center">
                                    {frameDisplay.roll3}
                                  </span>
                                </div>
                              ) : (
                                // Regular frames - show two rolls
                                <>
                                  <span className="w-4 text-center">
                                    {frameDisplay.roll1}
                                  </span>
                                  <span className="w-4 text-center">
                                    {frameDisplay.roll2}
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-sm font-semibold">
                              {scores[playerIndex][frameIndex] || ""}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="border p-2 text-center font-bold text-lg">
                      {totalScore}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
