import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { API_BASE } from '@/lib/utils';
import CryptoJS from "crypto-js";
import { triggerBonusRefresh } from '../../pages/awaiting-bonus';

const MIN_BET = 100;
const MAX_BET = 100000;
const MIN_ROLLOVER = 0.00;
const MAX_ROLLOVER = 99.99;

function calcWinChance(rollOver: number) {
  return +(100 - rollOver).toFixed(4);
}
function calcMultiplier(winChance: number) {
  return +(99 / winChance).toFixed(4);
}
function calcPayout(bet: number, multiplier: number) {
  return +(bet * multiplier).toFixed(2);
}

const DiceGame = ({ gameState, updateGameState }: { gameState: any; updateGameState: (wager: number, payout: number, won: boolean, forcedBalance?: number) => void; }) => {
  const [bet, setBet] = useState(100);
  const [rollOver, setRollOver] = useState(50.5);
  const [clientSeed, setClientSeed] = useState(() => Math.random().toString(36).slice(2, 10));
  const [isRolling, setIsRolling] = useState(false);
  const [roll, setRoll] = useState<number|null>(null);
  const [result, setResult] = useState<string|null>(null);
  const [payout, setPayout] = useState<number>(0);
  const [netGain, setNetGain] = useState<number>(0);
  const [provable, setProvable] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [gameMode, setGameMode] = useState<'manual' | 'auto'>('manual');
  const rollAudioRef = useRef<HTMLAudioElement>(null);

  const winChance = calcWinChance(rollOver);
  const multiplier = calcMultiplier(winChance);
  const potentialPayout = calcPayout(bet, multiplier);
  const potentialNetGain = +(potentialPayout - bet).toFixed(2);

  // Stop audio when rolling ends
  useEffect(() => {
    if (!isRolling && rollAudioRef.current) {
      rollAudioRef.current.pause();
      rollAudioRef.current.currentTime = 0;
    }
  }, [isRolling]);


   


  const handleBetChange = (v: number) => {
    setBet(Math.max(MIN_BET, Math.min(MAX_BET, v)));
  };
  const handleRollOverChange = (v: number) => {
    setRollOver(Math.max(MIN_ROLLOVER, Math.min(MAX_ROLLOVER, v)));
  };

  const handlePlay = async () => {
    // Play and loop the roll sound
    if (rollAudioRef.current) {
      rollAudioRef.current.currentTime = 0;
      rollAudioRef.current.loop = true;
      rollAudioRef.current.play();
    }
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }
    setIsRolling(true);
    setResult(null);
    setRoll(null);
    setPayout(0);
    setNetGain(0);
    setProvable(null);
    try {
      const res = await fetch(`${API_BASE}/api/dice/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ betAmount: bet, rollOver, clientSeed }),
      });
      const data = await res.json();
      // Show animation for 1.2s, but enable Play button as soon as result is set
      setTimeout(() => {
        if (data.success) {
          setRoll(data.roll);
          setResult(data.result);
          setPayout(data.payout);
          setNetGain(data.netGain);
          setProvable({
            serverSeed: data.serverSeed,
            clientSeed: data.clientSeed,
            nonce: data.nonce,
            hash: data.hash,
          });
          updateGameState(bet, data.payout, data.result === "win", data.balance);
          if (data.result === "win") toast.success(`You won ₹${data.payout}!`, { icon: "🎉" });
          else toast.error(`You lost ₹${bet}.`, { icon: "💸" });
          if (data.bonusReleased) {
            triggerBonusRefresh();
            toast.success("Your first deposit bonus has been credited to your balance!", { icon: "🎁" });
          }
        } else {
          toast.error(data.message || "Error playing Dice");
        }
        setIsRolling(false); // Enable Play button immediately after result is shown
      }, 1200);
    } catch (err) {
      setIsRolling(false);
      toast.error("Server error");
    }
  };

  const handleVerify = async () => {
    if (!provable) return;
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/verify-roll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverSeed: provable.serverSeed,
          clientSeed: provable.clientSeed,
          nonce: provable.nonce,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (roll !== null && Math.abs(data.roll - roll) < 0.0001) {
          toast.success("Roll verified!", { icon: "✅" });
        } else {
          toast.error("Verification failed.");
        }
      } else {
        toast.error("Verification error");
      }
    } catch (err) {
      toast.error("Verification error");
    }
    setVerifying(false);
  };

  // Animation for roll bar
  const rollBarValue = isRolling
    ? Math.random() * 100
    : roll !== null
    ? roll
    : rollOver;

  return (
    <>
      <audio ref={rollAudioRef} src="/audio/roll.mp3" preload="auto" />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2 sm:p-4 relative">
        <div className="max-w-6xl mx-auto pb-20 sm:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 h-full">
            {/* Left Panel - Controls */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6">
              {/* Mode Toggle */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-1 border border-slate-700/50">
                <div className="flex">
                  <button
                    onClick={() => setGameMode('manual')}
                    className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all ${
                      gameMode === 'manual' 
                        ? 'bg-slate-700 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setGameMode('auto')}
                    className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all ${
                      gameMode === 'auto' 
                        ? 'bg-slate-700 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Amount Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-slate-700/50">
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">Amount</label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={MIN_BET}
                        max={MAX_BET}
                        step={1}
                        value={bet}
                        onChange={e => handleBetChange(Number(e.target.value))}
                        className="w-full bg-slate-700/50 border-slate-600 text-white text-base sm:text-lg py-2 sm:py-3 pr-16 sm:pr-20"
                        disabled={isRolling}
                      />
                      <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-yellow-500 text-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold">
                        ₹
                      </div>
                    </div>
                    <div className="flex gap-2 mt-1 sm:mt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleBetChange(Math.max(MIN_BET, bet - 1))} 
                        disabled={isRolling}
                        className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600 text-xs sm:text-base"
                      >
                        -
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleBetChange(bet + 1)} 
                        disabled={isRolling || bet >= MAX_BET} 
                        className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600 text-xs sm:text-base"
                      >
                        +
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleBetChange(Math.min(gameState.balance, MAX_BET))} 
                        disabled={isRolling}
                        className="flex-1 bg-slate-700/50 border-slate-600 text-white hover:bg-slate-600 text-xs sm:text-base"
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">Net Gain on Win</label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={potentialNetGain}
                        readOnly
                        className="w-full bg-slate-700/50 border-slate-600 text-white text-base sm:text-lg py-2 sm:py-3 pr-16 sm:pr-20"
                      />
                      <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-yellow-500 text-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs font-bold">
                        ₹
                      </div>
                    </div>
                  </div>
                  {/* Play button for desktop only */}
                  <Button
                    onClick={handlePlay}
                    disabled={isRolling || bet > gameState.balance}
                    className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-green-500 hover:bg-green-600 text-black shadow-lg rounded-xl mt-2 hidden lg:block"
                    size="lg"
                  >
                    {isRolling ? "Rolling..." : "Play"}
                  </Button>
                </div>
              </div>

            </div>

            {/* Right Panel - Game Area */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Controls and Play Button */}
              <div className="flex flex-col gap-3 sm:gap-4 mb-2">
                {/* Play button for mobile/tablet only */}
                <Button
                  onClick={handlePlay}
                  disabled={isRolling || bet > gameState.balance}
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-green-500 hover:bg-green-600 text-black shadow-lg rounded-xl block lg:hidden"
                  size="lg"
                >
                  {isRolling ? "Rolling..." : "Play"}
                </Button>
              </div>
              {/* Roll Bar + Slider */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-6 border border-slate-700/50">
                <div className="space-y-2 sm:space-y-4">
                  {/* Scale */}
                  <div className="flex justify-between text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                  {/* Dynamic Bar with Slider */}
                  <div className="relative h-10 sm:h-16 flex items-center">
                    {/* Lose section (red) and Win section (green) */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-3 sm:h-4 rounded-full w-full bg-slate-700 overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-red-500" style={{ width: `${rollOver}%` }} />
                      <div className="absolute left-0 top-0 h-full bg-green-500" style={{ left: `${rollOver}%`, width: `${100 - rollOver}%` }} />
                    </div>
                    {/* The real interactive slider */}
                    <div className="w-full px-1 sm:px-2 z-10">
                      <Slider
                        min={0}
                        max={100}
                        step={0.01}
                        value={[rollOver]}
                        onValueChange={([v]) => handleRollOverChange(v)}
                        disabled={isRolling}
                        className="w-full custom-dice-slider"
                      />
                    </div>
                    {/* Roll result indicator */}
                    {roll !== null && (
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-6 sm:h-8 bg-white rounded-full shadow-lg animate-pulse z-20"
                        style={{ left: `calc(${roll}% - 4px)` }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Game Stats - horizontal scroll on mobile */}
              <div className="flex flex-nowrap gap-2 sm:grid sm:grid-cols-3 sm:gap-4 overflow-x-auto pb-2 hide-scrollbar">
                <div className="min-w-[120px] bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-700/50 text-center">
                  <div className="text-xs sm:text-sm text-slate-400 mb-1">Winnings</div>
                  <div className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center">
                    {multiplier.toFixed(4)}
                    <span className="text-base sm:text-lg ml-1">x</span>
                  </div>
                </div>
                
                <div className="min-w-[120px] bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-700/50 text-center flex flex-col items-center justify-center">
                  <div className="text-xs sm:text-sm text-slate-400 mb-1">Roll Over</div>
                  <Input
                    type="number"
                    min={MIN_ROLLOVER}
                    max={MAX_ROLLOVER}
                    step={0.01}
                    value={rollOver}
                    onChange={e => {
                      let v = parseFloat(e.target.value);
                      if (isNaN(v)) v = MIN_ROLLOVER;
                      handleRollOverChange(v);
                    }}
                    className="w-16 sm:w-24 bg-slate-700/70 border-slate-600 text-white text-center text-xl sm:text-2xl font-bold py-1 px-2 rounded-md"
                    disabled={isRolling}
                  />
                </div>
                
                <div className="min-w-[120px] bg-slate-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-slate-700/50 text-center">
                  <div className="text-xs sm:text-sm text-slate-400 mb-1">Win Chance</div>
                  <div className="text-xl sm:text-2xl font-bold text-white flex items-center justify-center">
                    {winChance.toFixed(2)}
                    <span className="text-base sm:text-lg ml-1">%</span>
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {roll !== null && (
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-slate-700/50 text-center">
                  <div className={`text-2xl sm:text-3xl font-bold mb-2 ${result === "win" ? "text-green-400" : "text-red-400"}`}>
                    Roll: {roll.toFixed(2)}
                  </div>
                  <div className={`text-lg sm:text-xl font-semibold ${result === "win" ? "text-green-400" : "text-red-400"}`}>
                    {result === "win" ? "🎉 WIN!" : "💸 LOSE"}
                  </div>
                  {result === "win" && (
                    <div className="text-base sm:text-lg text-slate-300 mt-2">
                      Payout: ₹{payout.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DiceGame;