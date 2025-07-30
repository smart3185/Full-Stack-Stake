import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Target, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from '@/lib/utils';

const Roulette = ({ gameState, updateGameState }: {
  gameState: any;
  updateGameState: (wager: number, payout: number, won: boolean, forcedBalance?: number) => void;
}) => {
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<"red" | "black" | "green">("red");
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);

  const redNumbers = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  const blackNumbers = [
    2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35,
  ];

  const spin = () => {
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }
    setIsSpinning(true);
    setLastWin(0);
    setTimeout(() => {
      const baseWinChance = choice === "green" ? 0.1 : 0.35;
      let adjustedWinChance = baseWinChance;
      const willWin = Math.random() < adjustedWinChance;
      let winningNumber;
      if (willWin) {
        if (choice === "green") {
          winningNumber = 0;
        } else if (choice === "red") {
          winningNumber =
            redNumbers[Math.floor(Math.random() * redNumbers.length)];
        } else {
          winningNumber =
            blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
        }
      } else {
        if (choice === "green") {
          winningNumber =
            Math.random() < 0.5
              ? redNumbers[Math.floor(Math.random() * redNumbers.length)]
              : blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
        } else if (choice === "red") {
          winningNumber =
            Math.random() < 0.1
              ? 0
              : blackNumbers[Math.floor(Math.random() * blackNumbers.length)];
        } else {
          winningNumber =
            Math.random() < 0.1
              ? 0
              : redNumbers[Math.floor(Math.random() * redNumbers.length)];
        }
      }
      const multiplier = choice === "green" ? 35 : 2;
      const payout = willWin ? bet * multiplier : 0;
      setResult(winningNumber);
      setLastWin(payout);
      updateGameState(bet, payout, willWin);
      setIsSpinning(false);
      if (willWin) {
        toast.success(`You won ₹${payout}!`, { icon: "🎉" });
      }
    }, 3000);
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return "green";
    return redNumbers.includes(num) ? "red" : "black";
  };

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-6 h-6 text-gold" />
          Royal Roulette
          <Badge className="bg-gold/20 text-gold">RTP: 35%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div
            className={`w-32 h-32 mx-auto rounded-full border-4 border-gold bg-secondary/30 flex items-center justify-center ${
              isSpinning ? "animate-spin" : ""
            }`}
          >
            {isSpinning ? (
              <div className="text-2xl">🎯</div>
            ) : result !== null ? (
              <div className="text-center">
                <div className="text-3xl font-bold">{result}</div>
                <div
                  className={`text-sm ${
                    getNumberColor(result) === "red"
                      ? "text-casino-red"
                      : getNumberColor(result) === "black"
                      ? "text-foreground"
                      : "text-casino-green"
                  }`}
                >
                  {getNumberColor(result).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="text-2xl">🎯</div>
            )}
          </div>
        </div>
        <div className="space-y-4 max-w-md mx-auto">
          <div>
            <Label>Choose Color</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                variant={choice === "red" ? "default" : "outline"}
                onClick={() => setChoice("red")}
                className="bg-casino-red hover:bg-casino-red/90 text-white"
              >
                Red (2x)
              </Button>
              <Button
                variant={choice === "black" ? "default" : "outline"}
                onClick={() => setChoice("black")}
                className="bg-slate-800 hover:bg-slate-700 text-white"
              >
                Black (2x)
              </Button>
              <Button
                variant={choice === "green" ? "default" : "outline"}
                onClick={() => setChoice("green")}
                className="bg-casino-green hover:bg-casino-green/90 text-white"
              >
                Green (35x)
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="bet">Bet Amount (₹)</Label>
            <Input
              id="bet"
              type="number"
              value={bet}
              onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
              min="1"
              max={gameState.balance}
              className="bg-secondary/30"
            />
          </div>
          <Button
            onClick={spin}
            disabled={isSpinning || bet > gameState.balance}
            className="w-full bg-gold hover:bg-gold/90 text-black font-semibold"
            size="lg"
          >
            {isSpinning ? (
              <>
                <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                Spinning...
              </>
            ) : (
              <>
                <Target className="w-5 h-5 mr-2" />
                Spin (₹{bet})
              </>
            )}
          </Button>
          {lastWin > 0 && (
            <div className="text-center p-4 bg-casino-green/20 rounded-lg border border-casino-green/30">
              <div className="text-2xl font-bold text-casino-green">
                +₹{lastWin}
              </div>
              <div className="text-sm text-muted-foreground">
                Winning color!
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Roulette;