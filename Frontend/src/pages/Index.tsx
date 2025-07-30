import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dice6,
  Crown,
  Coins,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Play,
  Pause,
  DollarSign,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from '@/lib/utils';
import AwaitingBonus from './awaiting-bonus';

// Game state management
interface GameState {
  balance: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  winRate: number;
}

const Index = () => {
  const [gameState, setGameState] = useState<GameState>({
    balance: 12500,
    totalWagered: 0,
    totalWon: 0,
    gamesPlayed: 0,
    winRate: 0,
  });

  // Sync balance with navigation
  useEffect(() => {
    const navBalance = document.getElementById("nav-balance");
    const mobileNavBalance = document.getElementById("mobile-nav-balance");

    if (navBalance) {
      navBalance.textContent = `₹${(gameState.balance ?? 0).toLocaleString()}`;
    }
    if (mobileNavBalance) {
      mobileNavBalance.textContent = `Balance: ₹${(gameState.balance ?? 0).toLocaleString()}`;
    }
  }, [gameState.balance]);

  // House edge system - ensures user doesn't win more than 40%
  const calculateWinProbability = (baseWinChance: number): boolean => {
    const currentWinRate = gameState.winRate;
    let adjustedWinChance = baseWinChance;

    // If user is winning too much, reduce their chances
    if (currentWinRate > 35) {
      adjustedWinChance = baseWinChance * 0.3; // Drastically reduce chances
    } else if (currentWinRate > 30) {
      adjustedWinChance = baseWinChance * 0.5;
    } else if (currentWinRate > 25) {
      adjustedWinChance = baseWinChance * 0.7;
    }

    return Math.random() < adjustedWinChance;
  };

  const updateGameState = (wager: number, payout: number, won: boolean) => {
    setGameState((prev) => {
      const newBalance = prev.balance - wager + (won ? payout : 0);
      const newTotalWagered = prev.totalWagered + wager;
      const newTotalWon = prev.totalWon + (won ? payout : 0);
      const newGamesPlayed = prev.gamesPlayed + 1;
      const newWinRate =
        newTotalWagered > 0 ? (newTotalWon / newTotalWagered) * 100 : 0;

      // Log for debugging
      console.log(
        `Game Result: Wager: ₹${wager}, Payout: ₹${payout}, Won: ${won}`,
      );
      console.log(`Balance: ₹${prev.balance} → ₹${newBalance}`);
      console.log(
        `Win Rate: ${prev.winRate.toFixed(1)}% → ${newWinRate.toFixed(1)}%`,
      );

      return {
        balance: newBalance,
        totalWagered: newTotalWagered,
        totalWon: newTotalWon,
        gamesPlayed: newGamesPlayed,
        winRate: newWinRate,
      };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Clean Header */}
      <div className="border-b border-border/30 bg-secondary/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gold-gradient bg-clip-text text-transparent">
                Royal Casino
              </h1>
              <p className="text-muted-foreground mt-1">
                Premium gaming experience with live results
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gold">
                  ₹{(gameState.balance ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Balance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {gameState.gamesPlayed}
                </div>
                <div className="text-xs text-muted-foreground">Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-casino-red">
                  ₹{(gameState.totalWagered ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Wagered</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    gameState.winRate > 30
                      ? "text-casino-green"
                      : "text-casino-red"
                  }`}
                >
                  {(gameState.winRate ?? 0).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            </div>
          </div>

          {/* Win Rate Progress */}
          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Win Rate Progress</span>
              <span className="text-gold">Max: 40%</span>
            </div>
            <Progress value={Math.min((gameState.winRate ?? 0), 40)} className="h-2" />
          </div>
        </div>
      </div>

      {/* Games Section */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="aviator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-secondary/30 p-1">
            <TabsTrigger
              value="aviator"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              ✈️ Aviator
            </TabsTrigger>
            <TabsTrigger
              value="slots"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              🎰 Slots
            </TabsTrigger>
            <TabsTrigger
              value="roulette"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              🎯 Roulette
            </TabsTrigger>
            <TabsTrigger
              value="coinflip"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              🪙 Coin Flip
            </TabsTrigger>
            <TabsTrigger
              value="dice"
              className="data-[state=active]:bg-gold data-[state=active]:text-black"
            >
              🎲 Dice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="aviator">
            <AviatorGame
              gameState={gameState}
              calculateWinProbability={calculateWinProbability}
              updateGameState={updateGameState}
            />
          </TabsContent>

          <TabsContent value="slots">
            <SlotMachine
              gameState={gameState}
              calculateWinProbability={calculateWinProbability}
              updateGameState={updateGameState}
            />
          </TabsContent>

          <TabsContent value="roulette">
            <Roulette
              gameState={gameState}
              calculateWinProbability={calculateWinProbability}
              updateGameState={updateGameState}
            />
          </TabsContent>

          <TabsContent value="coinflip">
            <CoinFlip
              gameState={gameState}
              calculateWinProbability={calculateWinProbability}
              updateGameState={updateGameState}
            />
          </TabsContent>

          <TabsContent value="dice">
            <DiceGame
              gameState={gameState}
              calculateWinProbability={calculateWinProbability}
              updateGameState={updateGameState}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Copy all game components from Casino.tsx

// Aviator Game Component
const AviatorGame = ({
  gameState,
  calculateWinProbability,
  updateGameState,
}) => {
  const [bet, setBet] = useState(1);
  const [gamePhase, setGamePhase] = useState<"betting" | "flying" | "crashed">(
    "betting",
  );
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [roundNumber, setRoundNumber] = useState(1);
  const [lastCrashPoint, setLastCrashPoint] = useState<number | null>(null);

  // Continuous game loop
  useEffect(() => {
    const gameLoop = () => {
      // Betting phase (10 seconds)
      setGamePhase("betting");
      setBetPlaced(false);
      setCashedOut(false);
      setMultiplier(1.0);
      setCrashPoint(null);
      setLastWin(0);
      setCountdown(10);

      const bettingInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(bettingInterval);
            startFlight();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const startFlight = () => {
      setGamePhase("flying");
      setCountdown(0);

      // Skewed distribution: most rounds crash early, some go high
      // 80% chance to crash between 1.0x and 2.0x, 15% between 2.0x and 5.0x, 5% above 5.0x
      let crashPoint;
      const r = Math.random();
      if (r < 0.8) {
        crashPoint = 1.0 + Math.random() * 1.0; // 1.0x - 2.0x
      } else if (r < 0.95) {
        crashPoint = 2.0 + Math.random() * 3.0; // 2.0x - 5.0x
      } else {
        crashPoint = 5.0 + Math.random() * 10.0; // 5.0x - 15.0x
      }

      setCrashPoint(crashPoint);

      // Animate multiplier increase
      const gameInterval = setInterval(() => {
        setMultiplier((prev) => {
          const next = prev + 0.01;
          if (next >= crashPoint) {
            clearInterval(gameInterval);
            endRound(crashPoint);
            return crashPoint;
          }
          return next;
        });
      }, 50);
    };

    const endRound = (crashedAt: number) => {
      setGamePhase("crashed");
      setLastCrashPoint(crashedAt);

      // Process bets
      if (betPlaced && !cashedOut) {
        updateGameState(bet, 0, false);
        toast.error(
          `Plane crashed at ${(crashedAt ?? 0).toFixed(2)}x! You lost ₹${bet}`,
          {
            icon: "💥",
          },
        );
      }

      // Wait 3 seconds then start new round
      setTimeout(() => {
        setRoundNumber((prev) => prev + 1);
        gameLoop();
      }, 3000);
    };

    // Start first round
    gameLoop();

    // Cleanup function
    return () => {
      // This will be called when component unmounts
    };
  }, []);

  const placeBet = () => {
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }

    if (gamePhase !== "betting") {
      toast.error("Betting is closed for this round!");
      return;
    }

    setBetPlaced(true);
    toast.success(`Bet placed: ₹${bet}`, { icon: "✈️" });
  };

  const cashOut = () => {
    if (gamePhase !== "flying" || !betPlaced || cashedOut) return;

    setCashedOut(true);
    const payout = bet * multiplier;
    setLastWin(payout);
    updateGameState(bet, payout, true);
    toast.success(`Cashed out at ${(multiplier ?? 0).toFixed(2)}x! Won ₹${payout}!`, {
      icon: "💰",
    });
  };

  return (
    <Card className="glass-effect border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-gold" />
            Aviator
            <Badge className="bg-gold/20 text-gold">RTP: 30%</Badge>
          </div>
          <div className="flex items-center gap-2">
            {lastCrashPoint && (
              <Badge variant="secondary" className="text-sm">
                Last: ${(lastCrashPoint ?? 0).toFixed(2)}x
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Game Phase Indicator */}
        <div className="text-center">
          <div
            className={`text-lg font-semibold mb-2 ${
              gamePhase === "betting"
                ? "text-gold"
                : gamePhase === "flying"
                  ? "text-casino-green"
                  : "text-casino-red"
            }`}
          >
            {gamePhase === "betting" &&
              `Betting Phase - ${(countdown ?? 0)}s remaining`}
            {gamePhase === "flying" && "Flight in Progress"}
            {gamePhase === "crashed" && "Round Ended"}
          </div>

          {gamePhase === "betting" && countdown > 0 && (
            <Progress value={(10 - (countdown ?? 0)) * 10} className="h-2 mb-4" />
          )}
        </div>

        <div className="text-center">
          <div className="bg-secondary/30 rounded-lg p-8 mb-4 relative overflow-hidden h-64">
            {/* Flight Path Background */}
            <div className="absolute inset-0 opacity-20">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 250"
                className="absolute inset-0"
              >
                <defs>
                  <linearGradient
                    id="flightPath"
                    x1="0%"
                    y1="100%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#ffc626" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ffc626" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <path
                  d="M 20 230 Q 150 125 280 20"
                  stroke="url(#flightPath)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="8,8"
                  className={gamePhase === "flying" ? "animate-pulse" : ""}
                />
              </svg>
            </div>

            {/* Flying Plane */}
            <div
              className={`absolute transition-all duration-100 ease-linear ${
                gamePhase === "flying" ? "opacity-100" : "opacity-60"
              }`}
              style={{
                bottom:
                  gamePhase === "betting"
                    ? "15%"
                    : `${Math.min((multiplier - 1) * 25, 80)}%`,
                left:
                  gamePhase === "betting"
                    ? "10%"
                    : `${Math.min((multiplier - 1) * 12, 70)}%`,
                transform: `
                  ${
                    gamePhase === "crashed"
                      ? "rotate(45deg) scale(0.8)"
                      : gamePhase === "flying"
                        ? "rotate(-15deg) scale(1.2)"
                        : "rotate(0deg) scale(1)"
                  }
                `,
                transition:
                  gamePhase === "crashed"
                    ? "all 0.5s ease-in"
                    : "all 0.1s ease-out",
              }}
            >
              <div className="text-5xl filter drop-shadow-xl">
                {gamePhase === "crashed" ? "💥" : "✈️"}
              </div>

              {/* Plane Trail */}
              {gamePhase === "flying" && (
                <div
                  className="absolute top-1/2 -right-10 w-16 h-1 bg-gradient-to-r from-casino-green to-transparent opacity-70 animate-pulse"
                  style={{
                    transform: "translateY(-50%)",
                  }}
                />
              )}
            </div>

            {/* Altitude Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {[20, 40, 60, 80].map((height) => (
                <div
                  key={height}
                  className="absolute w-full border-t border-border/30"
                  style={{ bottom: `${height}%` }}
                >
                  <span className="absolute right-3 -top-3 text-sm text-muted-foreground bg-background/80 px-2 rounded">
                    ${(1 + height / 20).toFixed(1)}x
                  </span>
                </div>
              ))}
            </div>

            {/* Multiplier Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`text-7xl font-bold z-10 ${
                  gamePhase === "flying"
                    ? "text-casino-green animate-pulse"
                    : gamePhase === "crashed"
                      ? "text-casino-red"
                      : "text-gold"
                }`}
              >
                {gamePhase === "betting"
                  ? "1.00x"
                  : `${(multiplier ?? 0).toFixed(2)}x`}
              </div>
            </div>

            {/* Phase Status */}
            {gamePhase === "crashed" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-2xl text-casino-red font-bold animate-bounce z-20 bg-background/90 px-6 py-3 rounded-xl border-2 border-casino-red">
                  CRASHED AT ${(crashPoint ?? 0).toFixed(2)}x!
                </div>
              </div>
            )}

            {gamePhase === "betting" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xl text-gold font-bold z-20 bg-background/90 px-6 py-3 rounded-xl border-2 border-gold">
                  PLACE YOUR BETS
                </div>
              </div>
            )}

            {/* Live Indicator */}
            {gamePhase === "flying" && (
              <div className="absolute top-3 left-3 text-sm text-casino-green bg-background/80 px-3 py-2 rounded-lg border border-casino-green/30">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-casino-green rounded-full animate-pulse"></div>
                  FLYING
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Betting Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="bet" className="text-base font-semibold">
                Bet Amount (₹)
              </Label>
              <Input
                id="bet"
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                min="1"
                max={(gameState.balance ?? 0)}
                disabled={gamePhase !== "betting"}
                className="bg-secondary/30 text-lg h-12 mt-2"
                placeholder="Enter amount..."
              />
            </div>

            {gamePhase === "betting" ? (
              <Button
                onClick={placeBet}
                disabled={
                  bet > (gameState.balance ?? 0) || betPlaced || (countdown ?? 0) === 0
                }
                className={`w-full font-semibold h-12 text-lg ${
                  betPlaced
                    ? "bg-casino-green hover:bg-casino-green/90 text-white"
                    : "bg-gold hover:bg-gold/90 text-black"
                }`}
                size="lg"
              >
                {betPlaced ? (
                  <>
                    <Target className="w-5 h-5 mr-2" />
                    Bet Placed (₹{(bet ?? 0).toLocaleString()})
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Place Bet (₹{(bet ?? 0).toLocaleString()})
                  </>
                )}
              </Button>
            ) : gamePhase === "flying" ? (
              <Button
                onClick={cashOut}
                disabled={!betPlaced || cashedOut}
                className="w-full bg-casino-green hover:bg-casino-green/90 text-white font-semibold h-12 text-lg"
                size="lg"
              >
                {cashedOut ? (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Cashed Out
                  </>
                ) : betPlaced ? (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Cash Out (₹{(bet * (multiplier ?? 0)).toFixed(0)})
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5 mr-2" />
                    No Bet Placed
                  </>
                )}
              </Button>
            ) : (
              <Button
                disabled
                className="w-full bg-secondary text-muted-foreground font-semibold h-12 text-lg"
                size="lg"
              >
                <Pause className="w-5 h-5 mr-2" />
                Round Ended
              </Button>
            )}
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {lastWin > 0 && (
              <div className="text-center p-6 bg-casino-green/20 rounded-xl border-2 border-casino-green/40">
                <div className="text-3xl font-bold text-casino-green mb-2">
                  +₹{(lastWin ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Cashed out at ${(lastWin / bet).toFixed(2)}x
                </div>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground bg-secondary/30 p-4 rounded-lg">
              <p>
                💡 Watch the plane climb and cash out before it crashes! New
                rounds start automatically every few seconds.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Slot Machine Component (simplified for space)
const SlotMachine = ({
  gameState,
  calculateWinProbability,
  updateGameState,
}) => {
  const [bet, setBet] = useState(1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(["🍎", "🍎", "🍎"]);
  const [lastWin, setLastWin] = useState(0);

  const symbols = ["🍎", "🍊", "🍇", "🍒", "💎", "👑", "🔔", "💰"];
  const payouts = {
    "💎💎💎": 50,
    "👑👑👑": 25,
    "💰💰💰": 10,
    "🔔🔔🔔": 5,
    "🍒🍒🍒": 3,
    any_two: 1.5,
  };

  const spin = () => {
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }

    setIsSpinning(true);
    setLastWin(0);

    const spinAnimation = setInterval(() => {
      setReels([
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ]);
    }, 100);

    setTimeout(() => {
      clearInterval(spinAnimation);
      const baseWinChance = 0.25;
      const willWin = calculateWinProbability(baseWinChance);

      let finalReels;
      let payout = 0;

      if (willWin) {
        const winType = Math.random();
        if (winType < 0.05) {
          finalReels = ["💎", "💎", "💎"];
          payout = bet * payouts["💎💎💎"];
        } else if (winType < 0.15) {
          finalReels = ["👑", "👑", "👑"];
          payout = bet * payouts["👑👑👑"];
        } else if (winType < 0.35) {
          finalReels = ["💰", "💰", "💰"];
          payout = bet * payouts["💰💰💰"];
        } else if (winType < 0.6) {
          finalReels = ["🔔", "🔔", "🔔"];
          payout = bet * payouts["🔔🔔🔔"];
        } else {
          const symbol = symbols[Math.floor(Math.random() * 4)];
          finalReels = [
            symbol,
            symbol,
            symbols[Math.floor(Math.random() * symbols.length)],
          ];
          payout = bet * payouts.any_two;
        }
      } else {
        finalReels = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];
        while (
          finalReels[0] === finalReels[1] &&
          finalReels[1] === finalReels[2]
        ) {
          finalReels[2] = symbols[Math.floor(Math.random() * symbols.length)];
        }
      }

      setReels(finalReels);
      setLastWin(payout);
      updateGameState(bet, payout, payout > 0);
      setIsSpinning(false);

      if (payout > 0) {
        toast.success(`You won ₹${(payout ?? 0).toLocaleString()}!`, { icon: "🎉" });
      }
    }, 2000);
  };

  return (
    <Card className="glass-effect border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-gold" />
          Royal Slots
          <Badge className="bg-gold/20 text-gold">RTP: 40%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {reels.map((symbol, index) => (
            <div
              key={index}
              className={`text-8xl text-center p-6 bg-secondary/50 rounded-xl border-2 border-gold/30 ${
                isSpinning ? "animate-pulse" : ""
              }`}
            >
              {symbol}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="bet" className="text-base font-semibold">
                Bet Amount (₹)
              </Label>
              <Input
                id="bet"
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                min="1"
                max={(gameState.balance ?? 0)}
                className="bg-secondary/30 text-lg h-12 mt-2"
              />
            </div>

            <Button
              onClick={spin}
              disabled={isSpinning || bet > (gameState.balance ?? 0)}
              className="w-full bg-gold hover:bg-gold/90 text-black font-semibold h-12 text-lg"
              size="lg"
            >
              {isSpinning ? (
                <>
                  <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                  Spinning...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Spin (₹{(bet ?? 0).toLocaleString()})
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4">
            {lastWin > 0 && (
              <div className="text-center p-6 bg-casino-green/20 rounded-xl border-2 border-casino-green/40">
                <div className="text-3xl font-bold text-casino-green mb-2">
                  +₹{(lastWin ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">You won!</div>
              </div>
            )}

            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-3 text-center">Payouts</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>💎💎💎</span>
                  <span className="text-gold font-bold">50x</span>
                </div>
                <div className="flex justify-between">
                  <span>👑👑👑</span>
                  <span className="text-gold font-bold">25x</span>
                </div>
                <div className="flex justify-between">
                  <span>💰💰💰</span>
                  <span className="text-gold font-bold">10x</span>
                </div>
                <div className="flex justify-between">
                  <span>Any Two</span>
                  <span className="text-gold font-bold">1.5x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Simplified versions of other games for space
const CoinFlip = ({ gameState, calculateWinProbability, updateGameState }) => {
  const [bet, setBet] = useState(1);
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [lastWin, setLastWin] = useState(0);

  const flip = () => {
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }
    setIsFlipping(true);
    setLastWin(0);
    setTimeout(() => {
      const baseWinChance = 0.4;
      const willWin = calculateWinProbability(baseWinChance);
      const actualResult: "heads" | "tails" = willWin
        ? choice
        : choice === "heads"
          ? "tails"
          : "heads";
      const payout = willWin ? bet * 2 : 0;
      setResult(actualResult);
      setLastWin(payout);
      updateGameState(bet, payout, willWin);
      setIsFlipping(false);
      if (willWin) toast.success(`You won ₹${(payout ?? 0).toLocaleString()}!`, { icon: "🎉" });
    }, 1500);
  };

  return (
    <Card className="glass-effect border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-gold" />
          Coin Flip
          <Badge className="bg-gold/20 text-gold">RTP: 40%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className={`text-9xl mb-6 ${isFlipping ? "animate-spin" : ""}`}>
            {isFlipping
              ? "🪙"
              : result === "heads"
                ? "👑"
                : result === "tails"
                  ? "💰"
                  : "🪙"}
          </div>
          {result && !isFlipping && (
            <Badge
              className={`text-xl p-3 ${result === choice ? "bg-casino-green" : "bg-casino-red"}`}
            >
              {result.toUpperCase()}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Choose Side</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={choice === "heads" ? "default" : "outline"}
                  onClick={() => setChoice("heads")}
                  className="flex-1 h-12 text-lg"
                >
                  👑 Heads
                </Button>
                <Button
                  variant={choice === "tails" ? "default" : "outline"}
                  onClick={() => setChoice("tails")}
                  className="flex-1 h-12 text-lg"
                >
                  💰 Tails
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="bet" className="text-base font-semibold">
                Bet Amount (₹)
              </Label>
              <Input
                id="bet"
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                min="1"
                max={(gameState.balance ?? 0)}
                className="bg-secondary/30 text-lg h-12 mt-2"
              />
            </div>
            <Button
              onClick={flip}
              disabled={isFlipping || bet > (gameState.balance ?? 0)}
              className="w-full bg-gold hover:bg-gold/90 text-black font-semibold h-12 text-lg"
              size="lg"
            >
              {isFlipping ? (
                <>
                  <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                  Flipping...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Flip (₹{(bet ?? 0).toLocaleString()})
                </>
              )}
            </Button>
          </div>
          <div>
            {lastWin > 0 && (
              <div className="text-center p-6 bg-casino-green/20 rounded-xl border-2 border-casino-green/40">
                <div className="text-3xl font-bold text-casino-green mb-2">
                  +₹{(lastWin ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Correct guess!
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Roulette = ({ gameState, calculateWinProbability, updateGameState }) => {
  const [bet, setBet] = useState(1);
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
      const willWin = calculateWinProbability(baseWinChance);
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
      if (willWin) toast.success(`You won ₹${(payout ?? 0).toLocaleString()}!`, { icon: "🎉" });
    }, 3000);
  };

  const getNumberColor = (num: number) => {
    if (num === 0) return "green";
    return redNumbers.includes(num) ? "red" : "black";
  };

  return (
    <Card className="glass-effect border-border/50 shadow-2xl">
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
            className={`w-40 h-40 mx-auto rounded-full border-4 border-gold bg-secondary/30 flex items-center justify-center ${
              isSpinning ? "animate-spin" : ""
            }`}
          >
            {isSpinning ? (
              <div className="text-3xl">🎯</div>
            ) : result !== null ? (
              <div className="text-center">
                <div className="text-4xl font-bold">{result}</div>
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
              <div className="text-3xl">🎯</div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Choose Color</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={choice === "red" ? "default" : "outline"}
                  onClick={() => setChoice("red")}
                  className="bg-casino-red hover:bg-casino-red/90 text-white h-12"
                >
                  Red (2x)
                </Button>
                <Button
                  variant={choice === "black" ? "default" : "outline"}
                  onClick={() => setChoice("black")}
                  className="bg-slate-800 hover:bg-slate-700 text-white h-12"
                >
                  Black (2x)
                </Button>
                <Button
                  variant={choice === "green" ? "default" : "outline"}
                  onClick={() => setChoice("green")}
                  className="bg-casino-green hover:bg-casino-green/90 text-white h-12"
                >
                  Green (35x)
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="bet" className="text-base font-semibold">
                Bet Amount (₹)
              </Label>
              <Input
                id="bet"
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                min="1"
                max={(gameState.balance ?? 0)}
                className="bg-secondary/30 text-lg h-12 mt-2"
              />
            </div>
            <Button
              onClick={spin}
              disabled={isSpinning || bet > (gameState.balance ?? 0)}
              className="w-full bg-gold hover:bg-gold/90 text-black font-semibold h-12 text-lg"
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
                  Spin (₹{(bet ?? 0).toLocaleString()})
                </>
              )}
            </Button>
          </div>
          <div>
            {lastWin > 0 && (
              <div className="text-center p-6 bg-casino-green/20 rounded-xl border-2 border-casino-green/40">
                <div className="text-3xl font-bold text-casino-green mb-2">
                  +₹{(lastWin ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Winning color!
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DiceGame = ({ gameState, calculateWinProbability, updateGameState }) => {
  const [bet, setBet] = useState(1);
  const [prediction, setPrediction] = useState<"over" | "under">("over");
  const [target, setTarget] = useState(7);
  const [isRolling, setIsRolling] = useState(false);
  const [diceResult, setDiceResult] = useState<number[]>([1, 1]);
  const [lastWin, setLastWin] = useState(0);

  const rollDice = () => {
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }
    setIsRolling(true);
    setLastWin(0);
    const rollAnimation = setInterval(() => {
      setDiceResult([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 100);
    setTimeout(() => {
      clearInterval(rollAnimation);
      const baseWinChance = 0.35;
      const willWin = calculateWinProbability(baseWinChance);
      let finalDice;
      if (willWin) {
        if (prediction === "over") {
          const total = Math.floor(Math.random() * (12 - target)) + target + 1;
          finalDice = distributeTotal(total);
        } else {
          const total = Math.floor(Math.random() * target) + 2;
          finalDice = distributeTotal(total);
        }
      } else {
        if (prediction === "over") {
          const total = Math.floor(Math.random() * (target - 1)) + 2;
          finalDice = distributeTotal(total);
        } else {
          const total = Math.floor(Math.random() * (12 - target)) + target + 1;
          finalDice = distributeTotal(total);
        }
      }
      const multiplier = calculateMultiplier(target, prediction);
      const payout = willWin ? bet * multiplier : 0;
      setDiceResult(finalDice);
      setLastWin(payout);
      updateGameState(bet, payout, willWin);
      setIsRolling(false);
      if (willWin) toast.success(`You won ₹${(payout ?? 0).toLocaleString()}!`, { icon: "🎉" });
    }, 2000);
  };

  const distributeTotal = (total: number): number[] => {
    const die1 = Math.max(1, Math.min(6, Math.floor(Math.random() * 6) + 1));
    const die2 = Math.max(1, Math.min(6, total - die1));
    return die2 >= 1 && die2 <= 6
      ? [die1, die2]
      : [Math.floor(total / 2), total - Math.floor(total / 2)];
  };

  const calculateMultiplier = (
    target: number,
    prediction: "over" | "under",
  ): number => {
    if (prediction === "over") {
      return Math.max(1.1, 2.5 - (target - 7) * 0.2);
    } else {
      return Math.max(1.1, 1.5 + target * 0.1);
    }
  };

  return (
    <Card className="glass-effect border-border/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dice6 className="w-6 h-6 text-gold" />
          Dice Roll
          <Badge className="bg-gold/20 text-gold">RTP: 35%</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center gap-4">
          {diceResult.map((die, index) => (
            <div
              key={index}
              className={`w-20 h-20 bg-secondary/50 rounded-xl border-2 border-gold/30 flex items-center justify-center text-3xl font-bold ${
                isRolling ? "animate-bounce" : ""
              }`}
            >
              {die}
            </div>
          ))}
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-gold">
            Total: {(diceResult[0] ?? 0) + (diceResult[1] ?? 0)}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Target Number</Label>
              <Input
                type="range"
                min="3"
                max="11"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="mt-2"
              />
              <div className="text-center mt-1 text-gold font-semibold text-xl">
                {target}
              </div>
            </div>
            <div>
              <Label className="text-base font-semibold">Prediction</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={prediction === "over" ? "default" : "outline"}
                  onClick={() => setPrediction("over")}
                  className="flex-1 h-12 text-lg"
                >
                  Over {target}
                  <span className="ml-2 text-sm">
                    {(calculateMultiplier(target, "over") ?? 0).toFixed(1)}x
                  </span>
                </Button>
                <Button
                  variant={prediction === "under" ? "default" : "outline"}
                  onClick={() => setPrediction("under")}
                  className="flex-1 h-12 text-lg"
                >
                  Under {target}
                  <span className="ml-2 text-sm">
                    {(calculateMultiplier(target, "under") ?? 0).toFixed(1)}x
                  </span>
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="bet" className="text-base font-semibold">
                Bet Amount (₹)
              </Label>
              <Input
                id="bet"
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                min="1"
                max={(gameState.balance ?? 0)}
                className="bg-secondary/30 text-lg h-12 mt-2"
              />
            </div>
            <Button
              onClick={rollDice}
              disabled={isRolling || bet > (gameState.balance ?? 0)}
              className="w-full bg-gold hover:bg-gold/90 text-black font-semibold h-12 text-lg"
              size="lg"
            >
              {isRolling ? (
                <>
                  <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                  Rolling...
                </>
              ) : (
                <>
                  <Dice6 className="w-5 h-5 mr-2" />
                  Roll Dice (₹{(bet ?? 0).toLocaleString()})
                </>
              )}
            </Button>
          </div>
          <div>
            {lastWin > 0 && (
              <div className="text-center p-6 bg-casino-green/20 rounded-xl border-2 border-casino-green/40">
                <div className="text-3xl font-bold text-casino-green mb-2">
                  +₹{(lastWin ?? 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Correct prediction!
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Index;
