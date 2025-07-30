import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, History, Clock, Zap, DollarSign, AlertTriangle, Plane } from "lucide-react";
import { toast } from "sonner";
import io from "socket.io-client";
import { verifyCrashPoint, API_BASE, SOCKET_BASE } from "../../lib/utils";
import React from "react";
import { useOutletContext } from 'react-router-dom';
// Add imports for SVGs
// import planeSvg from '/aviator-plane.svg';
// import fanSvg from '/aviator-fan.svg';
const aviatorImg = '/images/aviator.png';

interface GameState {
  balance: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  winRate: number;
}

interface AviatorGameProps {
  gameState: GameState;
  updateGameState: (wager: number, payout: number, won: boolean, forcedBalance?: number) => void;
  userId: string | null;
  token: string | null;
}

const AviatorGame: React.FC<AviatorGameProps> = ({ gameState, updateGameState, userId, token }) => {
  const [bet, setBet] = useState(100);
  const [gamePhase, setGamePhase] = useState<"betting" | "flying" | "crashed">("betting");
  const [multiplier, setMultiplier] = useState(1.0);
  // --- Smooth animation state ---
  const animatedMultiplier = useRef(1.0);
  const lastBackendMultiplier = useRef(1.0);
  const lastUpdateTime = useRef(Date.now());
  const animationFrame = useRef<number | null>(null);
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashedOut, setCashedOut] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [roundNumber, setRoundNumber] = useState(1);
  const [lastCrashPoint, setLastCrashPoint] = useState<number | null>(2.34);
  const [fairnessHash, setFairnessHash] = useState("a7b9c3d2e5f8");
  const [roundId, setRoundId] = useState("");
  const [volatilityMode, setVolatilityMode] = useState("normal");
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
  const betTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recentResults, setRecentResults] = useState<number[]>([1.23, 4.56, 2.1, 8.9, 1.45, 3.2, 15.67, 2.8, 1.9, 5.4]);
  const [currentBetAmount, setCurrentBetAmount] = useState(0);
  const { setBalance } = useOutletContext() as { setBalance: (bal: number) => void };

  // Helper function to update balance across all states
  const updateBalance = (newBalance: number) => {
    // Update local storage
    localStorage.setItem("balance", newBalance.toString());
    
    // Update navbar balance via outlet context
    setBalance(newBalance);
    
    // Update global window balance function if it exists
    if (typeof window !== 'undefined' && window.__setLayoutBalance) {
      window.__setLayoutBalance(newBalance);
    }
    
    // Update game state with forced balance
    updateGameState(0, 0, false, newBalance);
  };

  // Remove smooth exponential animation logic and restore original multiplier event handling
  // Remove animationRef, roundStartTimeRef, crashPointRef, kRef, and animateMultiplier

  useEffect(() => {
    if (!token) {
      return;
    }
    
    const socket = io(SOCKET_BASE, { 
      auth: { token },
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;
    
    socket.on("connect", () => {
      setIsConnected(true);
      toast.success("Connected to game server", { icon: "🟢" });
    });
    
    socket.on("connect_error", (error) => {
      setIsConnected(false);
      toast.error("Failed to connect to game server", { icon: "🔴" });
    });
    
    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Game events
    socket.on("aviator:roundStart", (data) => {
      setGamePhase("betting");
      setBetPlaced(false);
      setCashedOut(false);
      setMultiplier(1.0);
      setCrashPoint(null);
      setLastWin(0);
      setCountdown(10);
      setRoundId(data.roundId);
      setRoundNumber(data.roundNumber || 1);
      setFairnessHash(data.fairnessHash);
      setVolatilityMode(data.volatilityMode || "normal");
      setServerSeed("");
      setClientSeed("");
      setNonce(null);
      setCurrentBetAmount(0);
    });
    
    socket.on("aviator:multiplier", (data) => {
      setGamePhase("flying");
      setMultiplier(data.multiplier);
    });
    
    socket.on("aviator:crash", (data) => {
      setGamePhase("crashed");
      setCrashPoint(data.crashPoint);
      setLastCrashPoint(data.crashPoint);
      setRecentResults(prev => [data.crashPoint, ...prev.slice(0, 18)]);
      
      // Handle user's loss if they didn't cash out
      if (betPlaced && !cashedOut && currentBetAmount > 0) {
        socket.emit("aviator:crashLoss", { 
          roundId: data.roundId, 
          bet: currentBetAmount 
        });
        toast.error(`💥 Crashed at ${data.crashPoint.toFixed(2)}x! Lost ₹${currentBetAmount}`, { icon: "💥" });
      }
      
      // Reset game state after 3 seconds
      setTimeout(() => {
        setMultiplier(1.0);
        setCrashPoint(null);
        setCashedOut(false);
        setBetPlaced(false);
        setLastWin(0);
        setCurrentBetAmount(0);
      }, 3000);
    });
    
    socket.on("aviator:betPlaced", (data) => {
      // CLEAR THE TIMEOUT!
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
        betTimeoutRef.current = null;
      }
      if (data.success && typeof data.balance === "number") {
        updateBalance(data.balance);
        setCurrentBetAmount(data.betAmount || bet);
        toast.success(`Bet placed: ₹${data.betAmount || bet}`, { icon: "✈️" });
        if (data.bonusReleased) {
          toast.success("Your first deposit bonus has been credited to your balance!", { icon: "🎁" });
        }
      } else if (!data.success) {
        toast.error(data.message || "Bet failed");
        setBetPlaced(false);
      }
    });
    
    socket.on("aviator:cashedOut", (data) => {
      if (data.success && typeof data.balance === "number") {
        const payout = data.payout;
        updateBalance(data.balance);
        setLastWin(payout);
        setCashedOut(true);
        toast.success(`🎉 CASHOUT! Won ₹${payout.toFixed(2)} at ${data.multiplier.toFixed(2)}x`, { icon: "💰" });
      } else if (!data.success) {
        toast.error(data.message || "Cashout failed");
        setCashedOut(false);
      }
    });
    
    socket.on("aviator:crashLossProcessed", (data) => {
      if (data.success && typeof data.balance === "number") {
        updateBalance(data.balance);
      }
    });

    return () => {
      socket.disconnect();
      // Clean up timeout on unmount
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
        betTimeoutRef.current = null;
      }
    };
  }, [token]);

  // Moved this useEffect to the top level
  useEffect(() => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('user:gameChange', { gameName: 'Aviator' });
    }
  }, [isConnected]);

  // Countdown timer
  useEffect(() => {
    if (gamePhase === "betting") {
      setCountdown(10);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gamePhase]);

  // Fetch recent results
  useEffect(() => {
    fetchRecentResults();
  }, []);

  const fetchRecentResults = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/aviator/history`);
      const data = await res.json();
      if (data.success) {
        const results = data.rounds
          .slice(0, 10)
          .map((r: any) => r.crashPoint);
        setRecentResults(results);

        if (data.rounds.length > 0) {
          setLastCrashPoint(data.rounds[0].crashPoint);
          setRoundNumber(data.rounds[0].roundNumber || data.rounds.length);
        }
      }
    } catch (err) {
      // Error handling without console output
    }
  };

  const placeBet = () => {
    console.log("[DEBUG] placeBet called at", new Date().toISOString());
    console.log("[DEBUG] Socket connected:", isConnected);
    console.log("[DEBUG] Socket ref:", socketRef.current?.connected);
    console.log("[DEBUG] Game phase:", gamePhase);
    console.log("[DEBUG] Bet amount:", bet);
    console.log("[DEBUG] Round ID:", roundId);
    console.log("[DEBUG] User balance:", gameState?.balance);
    
    if (!token) {
      console.log("[DEBUG] No token, showing auth error");
      toast.error("Authentication required");
      return;
    }
    if (bet > gameState.balance) {
      console.log("[DEBUG] Insufficient balance");
      toast.error("Insufficient balance!");
      return;
    }
    if (gamePhase !== "betting") {
      console.log("[DEBUG] Betting closed");
      toast.error("Betting is closed for this round!");
      return;
    }
    if (betPlaced) {
      console.log("[DEBUG] Bet already placed");
      toast.error("Bet already placed!");
      return;
    }
    
    console.log("[DEBUG] Setting bet placed to true");
    setBetPlaced(true);
    
    if (socketRef.current && isConnected) {
      console.log("[DEBUG] Emitting aviator:placeBet event");
      const betData = { 
        amount: bet, 
        roundId: roundId 
      };
      console.log("[DEBUG] Bet data:", betData);
      // Add timeout to detect if we don't get a response
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
      betTimeoutRef.current = setTimeout(() => {
        console.log("[DEBUG] No response received within 8 seconds - server timeout");
        toast.error("Server timeout - please try again");
        setBetPlaced(false);
        betTimeoutRef.current = null;
      }, 8000); // Increased to 8 seconds to match server timeout
      
      socketRef.current.emit("aviator:placeBet", betData);
    } else {
      console.log("[DEBUG] Not connected to server");
      toast.error("Not connected to server!");
      setBetPlaced(false);
    }
  };

  const cashOut = () => {
    if (gamePhase !== "flying" || !betPlaced || cashedOut) {
      return;
    }
    setCashedOut(true); // Disable button immediately
    const actualBetAmount = currentBetAmount || bet;
    const expectedPayout = actualBetAmount * multiplier;
    if (socketRef.current && isConnected) {
      socketRef.current.emit("aviator:cashout", { 
        roundId: roundId, 
        multiplier: multiplier, 
        bet: actualBetAmount 
      });
    } else {
      toast.error("Not connected to server!");
    }
  };

  const isFair = serverSeed && clientSeed && nonce && crashPoint
    ? verifyCrashPoint(serverSeed, clientSeed, nonce, crashPoint)
    : null;

  // --- Simple continuous parabolic path helpers ---
  function getPlaneParabolicPosition(mult, width = 1000, height = 380, minMult = 1, maxMult = 5) {
    // t: normalized progress (0 to 1)
    const t = Math.max(0, (mult - minMult) / (maxMult - minMult));
    const xOffset = 100; // Start plane from more advanced X position
    const x = xOffset + t * (width - xOffset);
    
    // Parabolic path: starts at bottom (height), goes up in a curve, then back down
    // Use a quadratic function for smooth parabolic motion
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const amplitude = isMobile ? 200 : 280; // Reduced amplitude for mobile to improve starting position
    const frequency = 0.6; // Reduced frequency for smoother curves
    const y = height - amplitude * Math.sin(frequency * t * Math.PI) * Math.sin(frequency * t * Math.PI);
    
    return { x, y };
  }

  function getParabolicCurvePoints(mult, width = 1000, height = 380, minMult = 1, maxMult = 5, steps = 400) {
    const points = [];
    const tMax = Math.max(0, (mult - minMult) / (maxMult - minMult));
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const amplitude = isMobile ? 200 : 280; // Match the amplitude from getPlaneParabolicPosition
    const frequency = 0.6; // Match the frequency from getPlaneParabolicPosition
    const xOffset = 100; // Start plane from more advanced X position
    for (let i = 0; i <= steps; i++) {
      const t = tMax * (i / steps);
      const x = xOffset + t * (width - xOffset);
      const y = height - amplitude * Math.sin(frequency * t * Math.PI) * Math.sin(frequency * t * Math.PI);
      points.push([x, y]);
    }
    return points;
  }

  // --- Animation loop for smooth multiplier ---
  useEffect(() => {
    let running = true;
    function animate() {
      if (!running) return;
      const now = Date.now();
      const dt = (now - lastUpdateTime.current) / 1000;
      
      // For high multipliers (above 5x), use direct synchronization
      // For lower multipliers, use smooth animation
      let nextMult = lastBackendMultiplier.current;
      if (gamePhase === "flying") {
        if (multiplier > 5) {
          // At high multipliers, sync directly to prevent lag
          nextMult = multiplier;
        } else {
          // Smooth animation for lower multipliers
          const k = 0.05;
          nextMult = lastBackendMultiplier.current * Math.exp(k * dt);
          if (nextMult > multiplier) nextMult = multiplier;
        }
      } else {
        nextMult = multiplier;
      }
      
      animatedMultiplier.current = nextMult;
      setDisplayMultiplier(nextMult);
      animationFrame.current = requestAnimationFrame(animate);
    }
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [gamePhase, multiplier]);

  // --- On backend multiplier update, update refs ---
  useEffect(() => {
    lastBackendMultiplier.current = multiplier;
    lastUpdateTime.current = Date.now();
  }, [multiplier]);

  // --- On crash, immediately set the display multiplier ---
  useEffect(() => {
    if (gamePhase === "crashed" && crashPoint) {
      animatedMultiplier.current = crashPoint;
      setDisplayMultiplier(crashPoint);
    }
    if (gamePhase === "betting") {
      animatedMultiplier.current = 1.0;
      setDisplayMultiplier(1.0);
    }
  }, [gamePhase, crashPoint]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-1 sm:p-4">
      {/* Overlay: show when not connected */}
      {!isConnected && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-lg transition-opacity duration-300" style={{ pointerEvents: 'all' }}>
          {/* Background grid and floating stars (subtle, not too distracting) */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="grid-pattern"></div>
          </div>
          <div className="absolute inset-0 pointer-events-none">
            <div className="star star-1"></div>
            <div className="star star-2"></div>
            <div className="star star-3"></div>
            <div className="star star-4"></div>
            <div className="star star-5"></div>
            <div className="star star-6"></div>
            <div className="star star-7"></div>
            <div className="star star-8"></div>
          </div>
          {/* Loading animation */}
          <div className="loading-container">
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-2 border-yellow-400/30 animate-spin-slow relative">
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-yellow-400 rounded-full transform -translate-x-1/2 shadow-lg shadow-yellow-400/50 animate-pulse"></div>
                <div className="absolute inset-0 rounded-full border border-yellow-400/20 animate-pulse"></div>
              </div>
              <div className="absolute inset-3 w-24 h-24 rounded-full border-2 border-purple-400/40 animate-spin-reverse">
                <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"></div>
                <div className="absolute bottom-0 left-0 w-1 h-1 bg-purple-300 rounded-full shadow-lg shadow-purple-300/50"></div>
              </div>
              <div className="absolute inset-6 w-16 h-16 rounded-full border border-yellow-500/50 animate-pulse-slow">
                <div className="absolute inset-1 w-14 h-14 rounded-full bg-gradient-to-r from-yellow-400/10 to-purple-500/10 animate-pulse-glow"></div>
              </div>
              <div className="absolute inset-10 w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-400 animate-pulse-core shadow-2xl shadow-yellow-500/40">
                <div className="absolute inset-0.5 rounded-full bg-gradient-to-r from-purple-900/80 to-purple-800/80"></div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-r from-yellow-300 to-yellow-400 animate-ping opacity-60"></div>
                <div className="absolute inset-3 rounded-full bg-gradient-to-r from-yellow-200 to-yellow-300 animate-pulse"></div>
              </div>
            </div>
            <div className="mt-8 text-center">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 mb-2 tracking-wider animate-fade-in">
                CONNECTING TO AVIATOR SERVER
              </h2>
              <p className="text-purple-400 text-xs tracking-widest animate-fade-in-delay">
                Please wait, preparing your experience...
              </p>
              <div className="flex justify-center space-x-2 mt-3">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce-1 shadow-lg shadow-yellow-400/50"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce-2 shadow-lg shadow-yellow-500/50"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce-3 shadow-lg shadow-orange-400/50"></div>
              </div>
            </div>
          </div>
          {/* Overlay styles (scoped) */}
          <style>{`
            .grid-pattern {
              background-image: 
                linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px);
              background-size: 40px 40px;
              width: 100%;
              height: 100%;
              animation: float 6s ease-in-out infinite;
            }
            .star {
              position: absolute;
              width: 3px;
              height: 3px;
              background: linear-gradient(45deg, #fbbf24, #f59e0b);
              border-radius: 50%;
              animation: float 8s ease-in-out infinite;
              box-shadow: 0 0 6px rgba(251, 191, 36, 0.6);
            }
            .star-1 { top: 15%; left: 15%; animation-delay: 0s; animation-duration: 6s; }
            .star-2 { top: 25%; right: 20%; animation-delay: 1s; animation-duration: 7s; }
            .star-3 { top: 60%; left: 10%; animation-delay: 2s; animation-duration: 8s; }
            .star-4 { bottom: 30%; right: 15%; animation-delay: 3s; animation-duration: 6.5s; }
            .star-5 { top: 40%; right: 40%; animation-delay: 1.5s; animation-duration: 7.5s; }
            .star-6 { bottom: 20%; left: 30%; animation-delay: 2.5s; animation-duration: 5.5s; }
            .star-7 { top: 70%; right: 60%; animation-delay: 4s; animation-duration: 6.8s; }
            .star-8 { top: 35%; left: 60%; animation-delay: 0.8s; animation-duration: 7.2s; }
            .loading-container { position: relative; display: flex; flex-direction: column; align-items: center; z-index: 10; }
            .animate-spin-slow { animation: spin-slow 4s linear infinite; }
            .animate-spin-reverse { animation: spin-reverse 3s linear infinite; }
            .animate-pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite; }
            .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
            .animate-pulse-core { animation: pulse-core 2s ease-in-out infinite; }
            .animate-fade-in { animation: fade-in 1.5s ease-out; }
            .animate-fade-in-delay { animation: fade-in-delay 2s ease-out 0.5s both; }
            .animate-bounce-1 { animation: bounce-1 1.6s ease-in-out infinite; }
            .animate-bounce-2 { animation: bounce-2 1.6s ease-in-out 0.3s infinite; }
            .animate-bounce-3 { animation: bounce-3 1.6s ease-in-out 0.6s infinite; }
            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
            @keyframes pulse-glow { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
            @keyframes pulse-slow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.02); } }
            @keyframes pulse-core { 0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); } 50% { transform: scale(1.1); box-shadow: 0 0 30px rgba(251, 191, 36, 0.6); } }
            @keyframes fade-in { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
            @keyframes fade-in-delay { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
            @keyframes bounce-1 { 0%, 80%, 100% { transform: scale(0.8) translateY(0); } 40% { transform: scale(1.2) translateY(-10px); } }
            @keyframes bounce-2 { 0%, 80%, 100% { transform: scale(0.8) translateY(0); } 40% { transform: scale(1.2) translateY(-10px); } }
            @keyframes bounce-3 { 0%, 80%, 100% { transform: scale(0.8) translateY(0); } 40% { transform: scale(1.2) translateY(-10px); } }
            @keyframes float { 0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; } 50% { transform: translateY(-15px) scale(1.1); opacity: 1; } }
          `}</style>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header - Mobile Optimized */}
        <div className="flex items-center justify-between mb-2 sm:mb-6 px-2 sm:px-0">
          <div className="flex items-center gap-1 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Plane className="w-4 h-4 sm:w-8 sm:h-8 text-yellow-400" />
              <h1 className="text-lg sm:text-3xl font-bold text-white">Aviator</h1>
            </div>
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs sm:text-sm hidden sm:block">
              RTP: 97%
            </Badge>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400">Balance</div>
              <div className="text-sm sm:text-xl font-bold text-white">₹{(gameState?.balance || 1000).toLocaleString()}</div>
            </div>
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          </div>
        </div>

        {/* Main Game Area - Mobile Stacked Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-6">
          {/* Game Canvas - Full width on mobile */}
          <div className="lg:col-span-3">
            <Card className="bg-black/40 border-gray-700/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Game Stats Bar - Mobile Optimized */}
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 p-2 sm:p-4 border-b border-gray-700/50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 sm:gap-8 flex-1 justify-between">
                      <div className="text-center">
                        <div className="text-gray-400 text-xs">Last</div>
                        <div className="text-red-400 font-bold text-sm sm:text-lg">{lastCrashPoint?.toFixed(2)}x</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Countdown Bar - Mobile Optimized */}
                {gamePhase === "betting" && countdown > 0 && (
                  <div className="bg-gray-800/50 p-2 sm:p-4 border-b border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-yellow-400 font-semibold flex items-center gap-1 sm:gap-2 text-xs sm:text-base">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Waiting for next round</span>
                        <span className="sm:hidden">Next round</span>
                      </span>
                      <span className="text-white font-bold text-sm sm:text-base">{countdown}s</span>
                    </div>
                    <Progress 
                      value={(10 - countdown) * 10} 
                      className="h-1 sm:h-2 bg-gray-700"
                    />
                  </div>
                )}

                {/* Main Game Canvas - Mobile Optimized */}
                <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 bg-transparent overflow-visible">
                  {/* Plane Animation on Exponential Curve, mobile-optimized */}
                  {(() => {
                    const minMult = 1;
                    const baseMaxMult = 5;
                    const width = 1000;
                    const height = 380;
                    
                    let planeYOffset = 5;
                    let isMobile = false;
                    if (typeof window !== 'undefined' && window.innerWidth < 640) {
                      planeYOffset = 90; // Adjusted from 25 to 60 for better mobile starting position
                      isMobile = true;
                    }
                    // Plane position and curve path on parabolic path
                    const { x: planeX, y: planeY } = getPlaneParabolicPosition(displayMultiplier, width, height, minMult, baseMaxMult);
                    const points = getParabolicCurvePoints(displayMultiplier, width, height, minMult, baseMaxMult, 400)
                      .map(([x, y]) => [x, y + planeYOffset]);
                    const path = points.map(([x, y], i) => i === 0 ? `M ${x},${y}` : `L ${x},${y}`).join(' ');
                    // Camera: always center the plane horizontally
                    const centerOffset = width * 0.5;
                    let viewBoxX = 0;
                    if (planeX > centerOffset) {
                      viewBoxX = planeX - centerOffset;
                    }
                    const planeImageHeight = height * 0.197;
                    return (
                      <svg
                        className="absolute inset-0 w-full h-full z-10"
                        viewBox={`${viewBoxX} 0 ${width} ${height}`}
                        style={{
                          pointerEvents: 'none',
                          background: 'none',
                          width: '100%',
                          height: '100%',
                          maxWidth: '100vw',
                          maxHeight: '100%',
                          touchAction: 'none',
                          willChange: 'transform, viewBox',
                          contain: 'strict',
                          display: 'block',
                          transition: (displayMultiplier > 5 || isMobile) ? 'none' : 'viewBox 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        }}
                        preserveAspectRatio="xMinYMin meet"
                      >
                        {/* Red line with gradient glow effect */}
                        <defs>
                          <linearGradient id="redGlowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{stopColor: '#FF2D55', stopOpacity: 0.8}} />
                            <stop offset="50%" style={{stopColor: '#FF2D55', stopOpacity: 1}} />
                            <stop offset="100%" style={{stopColor: '#FF2D55', stopOpacity: 0.8}} />
                          </linearGradient>
                        </defs>
                        <path d={path} stroke="url(#redGlowGradient)" strokeWidth={width < 500 ? 3 : 4} fill="none" style={{willChange: 'stroke'}} />
                        <path d={path} stroke="#FF2D55" strokeWidth={width < 500 ? 1.5 : 2.5} fill="none" style={{willChange: 'stroke'}} />
                        <image
                          href={aviatorImg}
                          x={planeX - width * 0.12}
                          y={planeY - planeImageHeight + planeYOffset}
                          width={width * 0.24}
                          height={planeImageHeight * 1.6}
                          style={{
                            filter: 'drop-shadow(0 0 8px #FF2D55)',
                            willChange: 'transform, x, y',
                            pointerEvents: 'none',
                            touchAction: 'none',
                            contain: 'strict',
                            display: 'block',
                            transition: (displayMultiplier > 5 || isMobile) ? 'none' : 'x 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), y 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          }}
                        />
                        <g style={{willChange: 'transform', pointerEvents: 'none'}}>
                          {/* Removed small multiplier display next to plane */}
                        </g>
                    </svg>
                    );
                  })()}

                  {/* Multiplier Display - Mobile Optimized */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div
                        className={`text-2xl sm:text-4xl md:text-6xl lg:text-8xl font-black tracking-wider transition-all duration-100 ${
                          gamePhase === "flying"
                            ? "text-green-400 drop-shadow-2xl animate-pulse scale-110"
                            : gamePhase === "crashed"
                            ? "text-red-500 drop-shadow-2xl"
                            : "text-yellow-400 drop-shadow-xl"
                        }`}
                        style={{
                          textShadow: gamePhase === "flying" 
                            ? "0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.4)"
                            : gamePhase === "crashed"
                            ? "0 0 30px rgba(239, 68, 68, 0.8)"
                            : "0 0 20px rgba(251, 191, 36, 0.6)"
                        }}
                      >
                        {multiplier.toFixed(2)}x
                      </div>
                    </div>
                  </div>

                  {/* Game Status Overlays - Mobile Optimized */}
                  {gamePhase === "crashed" && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-sm">
                      <div className="text-center bg-black/80 px-3 sm:px-8 py-3 sm:py-6 rounded-xl border-2 border-red-500 mx-2">
                        <div className="text-xl sm:text-4xl mb-1 sm:mb-2">💥</div>
                        <div className="text-sm sm:text-2xl font-bold text-red-400 mb-1">CRASHED!</div>
                        <div className="text-xs sm:text-lg text-gray-300">at {crashPoint?.toFixed(2)}x</div>
                      </div>
                    </div>
                  )}

                  {gamePhase === "betting" && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center bg-black/80 px-3 sm:px-8 py-3 sm:py-6 rounded-xl border-2 border-yellow-400 mx-2">
                        <div className="text-xl sm:text-4xl mb-1 sm:mb-2">⏰</div>
                        <div className="text-sm sm:text-2xl font-bold text-yellow-400 mb-1">Next Round In</div>
                        <div className="text-lg sm:text-3xl font-black text-white">{countdown}s</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Results Ticker - Mobile Optimized */}
                <div className="bg-black/60 p-2 sm:p-4 border-t border-gray-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-400">Recent Results</span>
                  </div>
                  <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {recentResults.map((crash, idx) => (
                      <div
                        key={idx}
                        className={`px-2 sm:px-3 py-1 rounded-full font-mono text-xs sm:text-sm font-bold flex-shrink-0 transition-all
                          ${crash < 2
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : crash < 5
                            ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                            : crash < 10
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                          }
                        `}
                      >
                        {crash.toFixed(2)}x
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Betting Panel - Mobile Optimized */}
          <div className="lg:col-span-1">
            <Card className="bg-black/40 border-gray-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-white text-sm sm:text-lg">Place Your Bet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {/* Bet Amount Input - Mobile Optimized */}
                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2 block">Bet Amount</label>
                  <input
                    type="number"
                    value={bet}
                    onChange={(e) => setBet(Number(e.target.value))}
                    className="w-full px-3 sm:px-4 py-3 sm:py-3 border border-gray-600 rounded-lg bg-gray-800/50 text-white text-base sm:text-lg font-semibold"
                    min="100"
                    max={gameState?.balance || 1000}
                    inputMode="numeric"
                  />
                </div>

                {/* Quick Bet Buttons - Mobile Optimized */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2">
                  <button
                    onClick={() => setBet(Math.max(100, bet / 2))}
                    className="px-2 sm:px-3 py-3 sm:py-2 text-sm sm:text-sm border border-gray-600 rounded hover:bg-gray-700 text-white active:scale-95 transition-transform"
                  >
                    ½
                  </button>
                  <button
                    onClick={() => setBet(Math.min(gameState?.balance || 1000, bet * 2))}
                    className="px-2 sm:px-3 py-3 sm:py-2 text-sm sm:text-sm border border-gray-600 rounded hover:bg-gray-700 text-white active:scale-95 transition-transform"
                  >
                    2×
                  </button>
                  <button
                    onClick={() => setBet(gameState?.balance || 1000)}
                    className="px-2 sm:px-3 py-3 sm:py-2 text-sm sm:text-sm border border-gray-600 rounded hover:bg-gray-700 text-white active:scale-95 transition-transform"
                  >
                    Max
                  </button>
                </div>

                {/* Main Action Button - Mobile Optimized */}
                <div className="space-y-2 sm:space-y-3">
                  {gamePhase === "betting" && !betPlaced && (
                    <button
                      onClick={placeBet}
                      className="w-full py-4 sm:py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg touch-manipulation"
                      disabled={bet > (gameState?.balance || 1000)}
                    >
                      Place Bet ₹{bet}
                    </button>
                  )}
                  
                  {gamePhase === "flying" && betPlaced && !cashedOut && (
                    <button
                      onClick={cashOut}
                      className="w-full py-4 sm:py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-lg hover:from-green-300 hover:to-emerald-400 transition-all transform hover:scale-105 active:scale-95 text-base sm:text-lg animate-pulse touch-manipulation"
                    >
                      Cash Out ₹{(bet * multiplier).toFixed(0)}
                    </button>
                  )}

                  {betPlaced && gamePhase === "betting" && (
                    <div className="w-full py-3 sm:py-4 bg-blue-500/20 text-blue-400 font-bold rounded-lg text-center border border-blue-500/30 text-sm sm:text-base">
                      Bet Placed: ₹{bet}
                    </div>
                  )}

                  {cashedOut && (
                    <div className="w-full py-3 sm:py-4 bg-green-500/20 text-green-400 font-bold rounded-lg text-center border border-green-500/30 text-sm sm:text-base">
                      Cashed Out: ₹{lastWin.toFixed(0)}
                    </div>
                  )}
                </div>

                {/* Win Display - Mobile Optimized */}
                {lastWin > 0 && (
                  <div className="text-center py-3 sm:py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
                    <div className="text-lg sm:text-2xl mb-1">🎉</div>
                    <div className="text-green-400 font-bold text-sm sm:text-lg">
                      Won ₹{(lastWin ?? 0).toLocaleString()}!
                    </div>
                  </div>
                )}

                {/* Game Info - Mobile Optimized */}
                <div className="bg-gray-800/30 p-2 sm:p-3 rounded-lg border border-gray-700/30">
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Min Bet:</span>
                      <span>₹100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Bet:</span>
                      <span>₹10,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Win:</span>
                      <span>₹1,000,000</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;