import { useState, useEffect } from "react";
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Crown, RefreshCw } from "lucide-react";
import AviatorGame from "@/components/games/AviatorGame";
import SlotMachine from "@/components/games/SlotMachine";
import MinesGame from "@/components/games/MinesGame";
import DiceGame from "@/components/games/DiceGame";
import { API_BASE } from '@/lib/utils';

interface GameState {
  balance: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  winRate: number;
}

const Casino = () => {
  const [gameState, setGameState] = useState<GameState>({
    balance: 0,
    totalWagered: 0,
    totalWon: 0,
    gamesPlayed: 0,
    winRate: 0,
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const outlet = useOutletContext() as { setBalance: (bal: number) => void };
  const location = useLocation();
  const navigate = useNavigate();

  // Determine which tab to show based on the URL
  const tabFromPath = () => {
    if (location.pathname.endsWith('/mines')) return 'mines';
    if (location.pathname.endsWith('/dice')) return 'dice';
    if (location.pathname.endsWith('/slots')) return 'slots';
    if (location.pathname.endsWith('/aviator')) return 'aviator';
    return 'slots'; // default changed from 'aviator' to 'slots'
  };
  const [tab, setTab] = useState(tabFromPath());

  useEffect(() => {
    setTab(tabFromPath());
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    setTab(value);
    navigate(`/casino/${value}`);
  };

  useEffect(() => {
    // Load user data and token from localStorage
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    const storedBalance = localStorage.getItem("balance");
    
    if (storedUser && storedToken) {
      const user = JSON.parse(storedUser);
      setUserId(user._id);
      setToken(storedToken);
      setIsAuthenticated(true);
      
      if (storedBalance) {
        setGameState((prev) => ({ ...prev, balance: Number(storedBalance) }));
      }
      
      // Fetch latest balance from backend with JWT token
      fetchBalanceWithToken(storedToken);
      
      // Set up periodic balance refresh every 30 seconds
      const balanceInterval = setInterval(() => {
        fetchBalanceWithToken(storedToken);
      }, 30000);
      
      return () => clearInterval(balanceInterval);
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/auth';
    }
  }, []);

  const fetchBalanceWithToken = async (authToken: string, retryCount = 0) => {
    try {
      const res = await fetch(`${API_BASE}/api/user/balance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (res.status === 401 || res.status === 403) {
        // Token expired or invalid
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('balance');
        window.location.href = '/auth';
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        setGameState((prev) => ({ ...prev, balance: data.balance }));
        localStorage.setItem("balance", data.balance.toString());
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
      
      // Handle specific network errors
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        console.log('Network error - server might be down or unreachable');
        
        // Retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/3)`);
          setTimeout(() => fetchBalanceWithToken(authToken, retryCount + 1), delay);
        } else {
          console.log('Max retries reached. Server appears to be down.');
        }
        return;
      }
      
      // Handle timeout errors
      if (err.name === 'AbortError') {
        console.log('Request timeout - server is slow or unreachable');
        
        // Retry timeout errors once
        if (retryCount < 1) {
          console.log('Retrying timeout error...');
          setTimeout(() => fetchBalanceWithToken(authToken, retryCount + 1), 2000);
        }
        return;
      }
      
      // For other errors, check if it's a network issue
      if (err instanceof TypeError) {
        console.log('Network connection issue detected');
        return;
      }
    }
  };

  const handleRefreshBalance = () => {
    if (token) {
      fetchBalanceWithToken(token);
    }
  };

  const calculateWinProbability = (baseWinChance: number): boolean => {
    const currentWinRate = gameState.winRate;
    let adjustedWinChance = baseWinChance;
    if (currentWinRate > 35) {
      adjustedWinChance = baseWinChance * 0.3;
    } else if (currentWinRate > 30) {
      adjustedWinChance = baseWinChance * 0.5;
    } else if (currentWinRate > 25) {
      adjustedWinChance = baseWinChance * 0.7;
    }
    return Math.random() < adjustedWinChance;
  };

  // Restore updateGameState to its previous logic, removing the gameType check and restoring local balance calculation and POST for all games.

  const updateGameState = async (wager: number, payout: number, won: boolean, forcedBalance?: number) => {
    if (!token) return;

    // If forcedBalance is provided (from Aviator game), use it directly
    if (forcedBalance !== undefined) {
      setGameState((prev) => ({ ...prev, balance: forcedBalance }));
      if (typeof window !== 'undefined' && window.__setLayoutBalance) {
        window.__setLayoutBalance(forcedBalance);
      }
      return;
    }

    // For Aviator game, check if we need to sync balance from localStorage
    if (wager === 0 && payout === 0) {
      const storedBalance = localStorage.getItem("balance");
      if (storedBalance) {
        const balance = Number(storedBalance);
        setGameState((prev) => ({ ...prev, balance }));
        if (typeof window !== 'undefined' && window.__setLayoutBalance) {
          window.__setLayoutBalance(balance);
        }
        return;
      }
    }

    // Update local state immediately for better UX
    setGameState((prev) => {
      const newBalance = prev.balance - wager + (won ? payout : 0);
      const newTotalWagered = prev.totalWagered + wager;
      const newTotalWon = prev.totalWon + (won ? payout : 0);
      const newGamesPlayed = prev.gamesPlayed + 1;
      const newWinRate = newTotalWagered > 0 ? (newTotalWon / newTotalWagered) * 100 : 0;
      if (typeof window !== 'undefined' && window.__setLayoutBalance) {
        window.__setLayoutBalance(newBalance);
      }
      return {
        balance: newBalance,
        totalWagered: newTotalWagered,
        totalWon: newTotalWon,
        gamesPlayed: newGamesPlayed,
        winRate: newWinRate,
      };
    });

    // For Aviator game, balance is already updated via Socket.IO
    // For other games, update backend balance
    if (wager > 0 || payout > 0) {
      try {
        const res = await fetch(`${API_BASE}/api/user/balance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount: (won ? payout : 0) - wager })
        });
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('balance');
          window.location.href = '/auth';
          return;
        }
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("balance", data.balance.toString());
          setGameState((prev) => ({ ...prev, balance: data.balance }));
          if (typeof window !== 'undefined' && window.__setLayoutBalance) {
            window.__setLayoutBalance(data.balance);
          }
          if (outlet && outlet.setBalance) outlet.setBalance(data.balance);
        }
      } catch (err) {
        console.error('Error updating balance:', err);
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12 sm:h-10">
          <TabsTrigger value="slots" className="text-xs sm:text-sm">Slots</TabsTrigger>
            <TabsTrigger value="mines" className="text-xs sm:text-sm">Mines</TabsTrigger>
            <TabsTrigger value="dice" className="text-xs sm:text-sm">Dice</TabsTrigger>
            <TabsTrigger value="aviator" className="text-xs sm:text-sm">Aviator</TabsTrigger>
          </TabsList>
          

          <TabsContent value="aviator" className="mt-4">
            <AviatorGame gameState={gameState} updateGameState={updateGameState} userId={userId} token={token} />
          </TabsContent>
          <TabsContent value="mines" className="mt-4">
            <MinesGame gameState={gameState} updateGameState={updateGameState} />
          </TabsContent>
          <TabsContent value="dice" className="mt-4">
            <DiceGame gameState={gameState} updateGameState={updateGameState} />
          </TabsContent>
          <TabsContent value="slots" className="mt-4">
            <SlotMachine gameState={gameState} updateGameState={updateGameState} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Casino;