import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { API_BASE } from '@/lib/utils';
import { useSocket } from '../../hooks/useSocket';
import { triggerBonusRefresh } from '../../pages/awaiting-bonus';

declare global {
  interface Window {
    confetti?: (opts: any) => void;
  }
}

const confetti = () => {
  const duration = 1200;
  const end = Date.now() + duration;
  (function frame() {
    if (window.confetti) window.confetti({ particleCount: 7, spread: 70, origin: { y: 0.6 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

const slotEmojis = ["🍒", "🍋", "🍉", "🍇", "🔔", "💎", "⭐", "7️⃣"];

const SlotMachine = ({ gameState, updateGameState }: { gameState: any; updateGameState: (wager: number, payout: number, won: boolean, forcedBalance?: number) => void; }) => {
  const [bet, setBet] = useState(100);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<null | { win: boolean; amount: number; result: string; multiplier: string; winType: string }>();
  const [reels, setReels] = useState(["🍒", "🍋", "🔔"]);
  const [pulse, setPulse] = useState(false);

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit('user:gameChange', { gameName: 'Slots' });
    }
  }, [isConnected, socket]);

  const playSlots = async () => {
    if (bet > gameState.balance) {
      toast.error("Insufficient balance!");
      return;
    }
    if (bet <= 0) {
      toast.error("Invalid bet amount!");
      return;
    }
    
    setIsSpinning(true);
    setResult(null);
    setPulse(true);
    
    // Animate spinning reels
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setReels([
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
        slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
      ]);
      spinCount++;
      if (spinCount > 12) clearInterval(spinInterval);
    }, 60);
    
    try {
      const res = await fetch(`${API_BASE}/api/slots/play`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ bet }),
      });
      
      const data = await res.json();
      
      setTimeout(() => {
        clearInterval(spinInterval);
        setPulse(false);
        
        if (data.success) {
          setReels(data.reels);
          const won = data.result !== "loss";
          setResult({ 
            win: won, 
            amount: data.payout, 
            result: data.result,
            multiplier: data.multiplier,
            winType: data.winType
          });
          updateGameState(bet, data.payout, won, data.balance);
          if (won) {
            confetti();
            toast.success(
              `${data.result === 'jackpot' ? '🎰 JACKPOT! ' : data.result === 'big win' ? '💎 BIG WIN! ' : '🎉 '}You won ₹${data.payout}! (${data.multiplier})`,
              { icon: data.result === 'jackpot' ? "🎰" : data.result === 'big win' ? "💎" : "🎉" }
            );
          } else {
            toast.error(`You lost ₹${bet}.`, { icon: "💸" });
          }
          if (data.bonusReleased) {
            triggerBonusRefresh();
            toast.success("Your first deposit bonus has been credited to your balance!", { icon: "🎁" });
          }
        } else {
          toast.error(data.message || "Error playing Slots");
        }
        setIsSpinning(false);
      }, 900);
    } catch (err) {
      clearInterval(spinInterval);
      setPulse(false);
      setIsSpinning(false);
      toast.error("Server error");
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background animated particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="floating-particles">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <Card className="relative glass-effect border-4 border-gradient shadow-2xl bg-gradient-to-br from-slate-900/95 via-purple-900/90 to-slate-900/95 backdrop-blur-xl p-3 sm:p-6 my-4 sm:my-8 overflow-hidden">
        {/* Animated border glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 rounded-lg blur-sm opacity-20 animate-pulse-glow" />
        
        {/* Inner glow effect */}
        <div className="absolute inset-1 bg-gradient-to-br from-slate-900/80 via-purple-900/60 to-slate-900/80 rounded-lg" />
        
        <div className="relative z-10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2 sm:gap-3 text-xl sm:text-3xl mb-2 sm:mb-4">
              <div className="relative">
                <span className="text-3xl sm:text-5xl animate-bounce-slow">🎰</span>
                <div className="absolute inset-0 animate-ping">
                  <span className="text-3xl sm:text-5xl opacity-20">🎰</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent font-bold text-2xl sm:text-4xl tracking-wide drop-shadow-lg animate-text-glow">
                  SLOT MACHINE
                </span>
                <Badge className="bg-gradient-to-r from-yellow-400/20 to-yellow-300/20 text-yellow-300 border border-yellow-400/40 px-2 sm:px-4 py-1 text-xs sm:text-sm font-bold shadow-lg">
                  RTP: 92% • JACKPOT READY
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 flex flex-col items-center">
            {/* Result Display - Top */}
            {result && (
              <div className={`relative text-center p-4 sm:p-6 rounded-2xl border-2 shadow-2xl w-full max-w-md ${
                result.win 
                  ? "bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-400 text-green-300" 
                  : "bg-gradient-to-r from-red-900/80 to-rose-900/80 border-red-400 text-red-300"
              }`}>
                <div className={`text-2xl sm:text-4xl font-extrabold ${result.win ? "animate-bounce-celebration" : "animate-shake"}`}>
                  {result.win ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl sm:text-6xl">
                        {result.result === 'jackpot' ? '🎰' : result.result === 'big win' ? '💎' : '🎉'}
                      </span>
                      <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-sm sm:text-base">
                        {result.result === 'jackpot' ? 'JACKPOT! ' : result.result === 'big win' ? 'BIG WIN! ' : ''}You won <span className="text-yellow-400">₹{result.amount}</span>!
                      </span>
                      <div className="text-sm sm:text-lg font-normal opacity-80">Multiplier: {result.multiplier}</div>
                      <div className="text-xs sm:text-sm font-normal opacity-60">Win Type: {result.winType.replace(/_/g, ' ')}</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl sm:text-6xl">💸</span>
                      <span className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-sm sm:text-base">
                        You lost <span className="text-yellow-400">₹{bet}</span>
                      </span>
                      <div className="text-sm sm:text-lg font-normal opacity-80">Try again for the jackpot!</div>
                    </div>
                  )}
                </div>
                {result.win && (
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-2xl blur opacity-20 animate-pulse-glow" />
                )}
              </div>
            )}

            {/* Slot Machine Frame */}
            <div className="relative">
              <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 rounded-2xl blur opacity-30 animate-pulse-glow" />
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-3 sm:p-6 rounded-2xl border-4 border-yellow-400/60 shadow-2xl">
                <div className="flex gap-3 sm:gap-6 items-center justify-center">
                  {(Array.isArray(reels) ? reels : ["🍒", "🍋", "🔔"]).map((emoji, i) => (
                    <div
                      key={i}
                      className={`relative slot-reel ${isSpinning ? 'spinning' : ''} ${pulse ? 'animate-pulse-strong' : ''}`}
                      style={{ 
                        boxShadow: result?.win 
                          ? '0 0 30px 8px #ffd700, inset 0 0 20px rgba(255, 215, 0, 0.3)' 
                          : '0 0 20px rgba(138, 43, 226, 0.5), inset 0 0 10px rgba(0, 0, 0, 0.8)'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-black rounded-xl" />
                      <div className="relative w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center text-3xl sm:text-5xl rounded-xl border-2 border-purple-400/60 bg-gradient-to-br from-slate-800 via-slate-700 to-black shadow-inner overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
                        <span className="relative z-10 filter drop-shadow-lg">{emoji}</span>
                        {isSpinning && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        )}
                      </div>
                      {result?.win && (
                        <div className="absolute -inset-1 sm:-inset-2 border-4 border-yellow-400 rounded-xl animate-spin-slow opacity-60" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bet Controls and Spin Button - moved above payout table */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 w-full max-w-md">
              <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-slate-800 to-slate-700 p-3 sm:p-4 rounded-xl border border-purple-400/40 shadow-lg w-full">
                <span className="text-yellow-300 font-bold text-sm sm:text-lg whitespace-nowrap">Bet Amount:</span>
                <Input
                  id="bet"
                  type="number"
                  value={bet}
                  onChange={e => setBet(Number(e.target.value))}
                  min="100"
                  max={gameState.balance}
                  step="1"
                  className="bg-secondary/30 text-lg h-12 mt-2"
                />
                <span className="text-yellow-300 font-bold text-sm sm:text-lg">₹</span>
              </div>
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={() => setBet(Math.max(100, Math.floor(bet / 2)))} 
                  disabled={isSpinning} 
                  className="flex-1 bg-gradient-to-r from-slate-700 to-slate-600 text-yellow-300 hover:from-slate-600 hover:to-slate-500 border border-purple-400/40 font-bold transition-all duration-200 hover:scale-105 h-10 sm:h-auto"
                >
                  1/2
                </Button>
                <Button 
                  onClick={() => setBet(Math.min(gameState.balance, bet * 2))} 
                  disabled={isSpinning || bet >= gameState.balance} 
                  className="flex-1 bg-gradient-to-r from-slate-700 to-slate-600 text-yellow-300 hover:from-slate-600 hover:to-slate-500 border border-purple-400/40 font-bold transition-all duration-200 hover:scale-105 h-10 sm:h-auto"
                >
                  2x
                </Button>
                <Button 
                  onClick={() => setBet(gameState.balance)} 
                  disabled={isSpinning} 
                  className="flex-1 bg-gradient-to-r from-slate-700 to-slate-600 text-yellow-300 hover:from-slate-600 hover:to-slate-500 border border-purple-400/40 font-bold transition-all duration-200 hover:scale-105 h-10 sm:h-auto"
                >
                  Max
                </Button>
              </div>
              <Button
                onClick={playSlots}
                disabled={isSpinning || bet > gameState.balance || bet <= 0}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold text-lg sm:text-xl py-3 sm:py-4 px-6 sm:px-8 rounded-xl border-2 border-yellow-400/60 shadow-2xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 h-12 sm:h-auto"
              >
                {isSpinning ? "SPINNING..." : "SPIN"}
              </Button>
            </div>

            {/* Payout Table - now at the bottom */}
            <div className="w-full max-w-md">
              <div className="bg-gradient-to-r from-yellow-900/80 to-yellow-700/80 rounded-xl border-2 border-yellow-400/40 shadow-lg p-3 sm:p-4">
                <div className="text-center text-yellow-200 font-bold text-base sm:text-lg mb-2 tracking-wide">Payout Table</div>
                <div className="grid grid-cols-2 gap-2 text-yellow-100 text-sm sm:text-base">
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-xl sm:text-2xl">7️⃣7️⃣7️⃣</span> <span>Jackpot</span></div><div className="text-right font-bold">×20</div>
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-xl sm:text-2xl">💎💎💎</span> <span>Big Win</span></div><div className="text-right font-bold">×10</div>
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-xl sm:text-2xl">🔔🔔🔔</span> <span>Win</span></div><div className="text-right font-bold">×5</div>
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-xl sm:text-2xl">🍒🍒🍒</span> <span>Win</span></div><div className="text-right font-bold">×3</div>
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-xl sm:text-2xl">🍋🍋🍋</span> <span>Win</span></div><div className="text-right font-bold">×3</div>
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-xl sm:text-2xl">🐯🐯🐯</span> <span>Win</span></div><div className="text-right font-bold">×3</div>
                  <div className="flex items-center gap-1 sm:gap-2"><span className="text-sm sm:text-base">Any 2</span> <span>of a kind</span></div><div className="text-right font-bold">×1.5</div>
                </div>
                <div className="text-xs text-yellow-300 mt-2 text-center">RTP: ~92% • All reels spin independently</div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      <style>{`
        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: linear-gradient(45deg, #ffd700, #ff6b35);
          border-radius: 50%;
          animation: float linear infinite;
        }
        
        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .slot-reel.spinning {
          animation: reel-spin 0.1s linear infinite;
        }
        
        @keyframes reel-spin {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(360deg); }
        }
        
        .animate-pulse-strong { 
          animation: pulse-strong 0.7s infinite alternate; 
        }
        
        @keyframes pulse-strong {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        
        @keyframes bounce-slow {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        
        .animate-text-glow {
          animation: text-glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes text-glow {
          from { text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
          to { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 0 0 30px rgba(255, 215, 0, 0.4); }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite alternate;
        }
        
        @keyframes pulse-glow {
          from { opacity: 0.2; }
          to { opacity: 0.4; }
        }
        
        .animate-shimmer {
          animation: shimmer 1.5s linear infinite;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-shimmer-slow {
          animation: shimmer-slow 3s linear infinite;
        }
        
        @keyframes shimmer-slow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-bounce-celebration {
          animation: bounce-celebration 1s ease-in-out infinite;
        }
        
        @keyframes bounce-celebration {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0) scale(1); }
          40% { transform: translateY(-20px) scale(1.1); }
          60% { transform: translateY(-10px) scale(1.05); }
        }
        
        .animate-shake { 
          animation: shake 0.5s; 
        }
        
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
};

export default SlotMachine;