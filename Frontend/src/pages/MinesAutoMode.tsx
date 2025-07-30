import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Settings, 
  Play, 
  Square, 
  Info, 
  Target, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Gem,
  Bomb,
  DollarSign,
  RefreshCw,
  Shield,
  History,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { API_BASE } from '../lib/utils';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';

interface AutoModeSettings {
  isActive: boolean;
  betAmount: number;
  minesCount: number;
  tilesToReveal: number;
  stopOnProfit: number | null;
  stopOnLoss: number | null;
  status: string;
  stopReason: string | null;
  betsPlaced: number;
  totalProfit: number;
  startingBalance: number;
  currentBalance: number;
  startedAt: string | null;
  stoppedAt: string | null;
  selectedTiles: number[];
  gamesPlayed: any[];
}

interface GameHistory {
  gameId: string;
  bet: number;
  result: 'win' | 'loss';
  payout: number;
  multiplier: number;
  tilesRevealed: number;
  createdAt: string;
}

const GRID_SIZE = 25;
const GRID_DIM = 5;

const MinesAutoMode: React.FC = () => {
  const [settings, setSettings] = useState<AutoModeSettings>({
    isActive: false,
    betAmount: 100,
    minesCount: 3,
    tilesToReveal: 3,
    stopOnProfit: null,
    stopOnLoss: null,
    status: 'stopped',
    stopReason: null,
    betsPlaced: 0,
    totalProfit: 0,
    startingBalance: 0,
    currentBalance: 0,
    startedAt: null,
    stoppedAt: null,
    selectedTiles: [],
    gamesPlayed: []
  });

  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<'setup' | 'running' | 'stopped'>('setup');
  
  const autoModeInterval = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setBalance } = useOutletContext() as { setBalance: (bal: number) => void };

  // Authentication check
  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (authToken) {
      setToken(authToken);
      setIsAuthenticated(true);
    } else {
      navigate('/auth');
    }
  }, [navigate]);

  // Load settings and status on mount
  useEffect(() => {
    if (token) {
      loadSettings();
      loadStatus();
      fetchBalanceWithToken(token);
    }
  }, [token]);

  // Clear any stale auto mode state
  useEffect(() => {
    const clearStaleState = async () => {
      if (token && settings.isActive) {
        try {
          const statusResp = await fetch(`${API_BASE}/api/mines/auto/status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const statusData = await statusResp.json();
          if (!statusData.settings?.isActive) {
            setSettings(prev => ({ ...prev, isActive: false, status: 'stopped' }));
            setCurrentStep('stopped');
            if (autoModeInterval.current) clearInterval(autoModeInterval.current);
          }
        } catch (error) {
          setSettings(prev => ({ ...prev, isActive: false, status: 'stopped' }));
          setCurrentStep('stopped');
          if (autoModeInterval.current) clearInterval(autoModeInterval.current);
        }
      }
    };
    
    clearStaleState();
  }, [token]);

  const fetchBalanceWithToken = async (authToken: string) => {
    try {
      console.log('Fetching balance with token:', authToken ? 'Token exists' : 'No token');
      const response = await fetch(`${API_BASE}/api/user/balance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      console.log('Balance response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Balance data received:', data);
        setUserBalance(data.balance || 0);
        setBalance(data.balance || 0);
      } else {
        console.error('Balance response not ok:', response.status, response.statusText);
        if (response.status === 403) {
          console.log('Token expired, redirecting to login...');
          localStorage.removeItem('token');
          navigate('/auth');
        }
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const loadSettings = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          // Only update non-user-input fields, preserve balance boundaries
          setSettings(prev => ({
            ...prev,
            isActive: data.settings.isActive,
            betAmount: data.settings.betAmount,
            minesCount: data.settings.minesCount,
            tilesToReveal: data.settings.tilesToReveal,
            status: data.settings.status,
            stopReason: data.settings.stopReason,
            betsPlaced: data.settings.betsPlaced,
            totalProfit: data.settings.totalProfit,
            startingBalance: data.settings.startingBalance,
            currentBalance: data.settings.currentBalance,
            startedAt: data.settings.startedAt,
            stoppedAt: data.settings.stoppedAt,
            selectedTiles: data.settings.selectedTiles || [],
            gamesPlayed: data.settings.gamesPlayed || []
            // Preserve stopOnProfit and stopOnLoss from user input
          }));
          setSelectedTiles(data.settings.selectedTiles || []);
          if (data.settings.isActive) {
            setCurrentStep('running');
          } else {
            setCurrentStep('setup');
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadStatus = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
          
          if (data.settings.gamesPlayed) {
            const history = data.settings.gamesPlayed.map((game: any) => ({
              gameId: game.gameId,
              bet: game.bet,
              result: game.result,
              payout: game.payout,
              multiplier: game.multiplier,
              tilesRevealed: game.tilesRevealed,
              createdAt: game.createdAt || new Date().toISOString()
            }));
            setGameHistory(history);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load auto mode status:', error);
    }
  };

  const startAutoMode = async () => {
    console.log('Starting auto mode with:', {
      selectedTiles,
      betAmount: settings.betAmount,
      minesCount: settings.minesCount,
      stopOnProfit: settings.stopOnProfit,
      stopOnLoss: settings.stopOnLoss,
      userBalance
    });
    
    if (selectedTiles.length === 0) {
      toast({ title: 'Error', description: 'Please select tiles before starting auto mode', variant: 'destructive' });
      return;
    }
    
    if (!settings.betAmount || settings.betAmount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid bet amount', variant: 'destructive' });
      return;
    }
    
    if (settings.betAmount > (userBalance || 0)) {
      toast({ title: 'Error', description: 'Insufficient balance for this bet', variant: 'destructive' });
      return;
    }
    
    // Validate balance boundaries
    const currentBalance = userBalance || 0;
    
    // Check if upper balance boundary is less than current balance
    if (settings.stopOnProfit !== null && settings.stopOnProfit < currentBalance) {
      toast({ 
        title: 'Invalid Upper Balance Boundary', 
        description: `Upper balance (₹${settings.stopOnProfit}) cannot be less than current balance (₹${currentBalance.toFixed(2)})`, 
        variant: 'destructive' 
      });
      return;
    }
    
    // Check if lower balance boundary is more than current balance
    if (settings.stopOnLoss !== null && settings.stopOnLoss > currentBalance) {
      toast({ 
        title: 'Invalid Lower Balance Boundary', 
        description: `Lower balance (₹${settings.stopOnLoss}) cannot be more than current balance (₹${currentBalance.toFixed(2)})`, 
        variant: 'destructive' 
      });
      return;
    }
    
    setIsStarting(true);
    try {
      // First, update settings including balance boundaries
      console.log('Updating settings...');
      const settingsResponse = await fetch(`${API_BASE}/api/mines/auto/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          betAmount: settings.betAmount,
          minesCount: settings.minesCount,
          tilesToReveal: selectedTiles.length,
          stopAfterBets: null, // We don't use this, but backend expects it
          stopOnProfit: settings.stopOnProfit,
          stopOnLoss: settings.stopOnLoss,
          selectedTiles: selectedTiles,
        }),
      });
      
      const settingsData = await settingsResponse.json();
      console.log('Settings response:', settingsData);
      
      if (!settingsData.success) {
        toast({ title: 'Error', description: settingsData.message || 'Failed to update settings', variant: 'destructive' });
        return;
      }
      
      // Then start auto mode
      console.log('Starting auto mode...');
      const startResponse = await fetch(`${API_BASE}/api/mines/auto/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          betAmount: settings.betAmount,
          minesCount: settings.minesCount,
          selectedTiles: selectedTiles,
          tilesToReveal: selectedTiles.length,
        }),
      });
      
      const startData = await startResponse.json();
      console.log('Start response:', startData);
      
      if (startData.success) {
        toast({ title: 'Auto Mode Started!', description: 'Auto mode is now running continuously' });
        setCurrentStep('running');
        await loadSettings();
        await loadStatus();
        
        if (autoModeInterval.current) clearInterval(autoModeInterval.current);
        autoModeInterval.current = setInterval(async () => {
          try {
            const continueResp = await fetch(`${API_BASE}/api/mines/auto/continue`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
            });
            const continueData = await continueResp.json();
            
            if (continueData.success) {
              if (continueData.stopped) {
                toast({ title: 'Auto Mode Stopped', description: `Reason: ${continueData.reason}` });
                setCurrentStep('stopped');
                if (autoModeInterval.current) clearInterval(autoModeInterval.current);
              }
              await loadSettings();
              await loadStatus();
              await fetchBalanceWithToken(token!);
            }
          } catch (error) {
            console.error('Continue error:', error);
            if (autoModeInterval.current) clearInterval(autoModeInterval.current);
          }
        }, 2000);
      } else {
        if (startData.message?.includes('already running')) {
          toast({ title: 'Error', description: 'Auto mode is already running. Please stop it first.', variant: 'destructive' });
          await loadStatus();
        } else {
          toast({ title: 'Error', description: startData.message || 'Failed to start auto mode', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Start auto mode error:', error);
      toast({ title: 'Error', description: 'Failed to start auto mode. Please try again.', variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  const stopAutoMode = async () => {
    setIsStopping(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Auto Mode Stopped', description: `Total profit: ₹${(data.settings.totalProfit || 0).toFixed(2)}` });
        setCurrentStep('stopped');
        await loadSettings();
        await loadStatus();
        if (autoModeInterval.current) clearInterval(autoModeInterval.current);
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to stop auto mode', variant: 'destructive' });
    } finally {
      setIsStopping(false);
    }
  };

  const resetAutoMode = async () => {
    try {
      await fetch(`${API_BASE}/api/mines/auto/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (autoModeInterval.current) clearInterval(autoModeInterval.current);
      
      setSettings(prev => ({
        ...prev,
        isActive: false,
        status: 'stopped',
        stopReason: null
      }));
      setCurrentStep('setup');
      
      await loadSettings();
      await loadStatus();
      
      toast({ title: 'Auto Mode Reset', description: 'Auto mode has been reset successfully' });
    } catch (error) {
      console.error('Reset auto mode error:', error);
      toast({ title: 'Error', description: 'Failed to reset auto mode', variant: 'destructive' });
    }
  };

  const handleTileClick = (tileIndex: number) => {
    if (settings.isActive) return;
    
    setSelectedTiles(prev => {
      if (prev.includes(tileIndex)) {
        return prev.filter(tile => tile !== tileIndex);
      } else {
        const maxTiles = 25 - settings.minesCount;
        if (prev.length >= maxTiles) {
          toast({ title: 'Error', description: `Cannot select more than ${maxTiles} tiles`, variant: 'destructive' });
          return prev;
        }
        return [...prev, tileIndex];
      }
    });
  };

  const clearSelectedTiles = () => {
    setSelectedTiles([]);
  };

  const selectRandomTiles = () => {
    const maxTiles = 25 - settings.minesCount;
    const availableTiles = Array.from({ length: 25 }, (_, i) => i);
    const randomTiles = [];
    
    for (let i = 0; i < Math.min(maxTiles, 5); i++) {
      const randomIndex = Math.floor(Math.random() * availableTiles.length);
      randomTiles.push(availableTiles.splice(randomIndex, 1)[0]);
    }
    
    setSelectedTiles(randomTiles);
  };

  const generateGrid = () => {
    const tiles = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const isSelected = selectedTiles.includes(i);
      tiles.push(
        <div
          key={i}
          onClick={() => handleTileClick(i)}
          className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg border-2 cursor-pointer transition-all duration-200 ${
            isSelected
              ? 'bg-green-600 border-green-400 text-white transform scale-95 shadow-lg'
              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
          } ${settings.isActive ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'}`}
        >
          {isSelected ? <Gem className="w-5 h-5 sm:w-6 sm:h-6" /> : (i + 1)}
        </div>
      );
    }
    return tiles;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStopReasonText = (reason: string | null) => {
    if (!reason) return 'No reason specified';
    return reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  const calculateMultiplier = (minesCount: number, tilesRevealed: number) => {
    if (tilesRevealed === 0) return 1;
    
    const totalTiles = 25;
    const safeTiles = totalTiles - minesCount;
    
    if (tilesRevealed > safeTiles) return 0;
    
    // Custom multiplier series for 3 mines
    if (minesCount === 3) {
      const customSeries = [1.08, 1.23, 1.42, 1.64, 1.92, 2.25, 2.68, 3.23, 3.90, 4.75, 5.84, 7.25, 9.10, 11.55, 14.80, 19.15, 24.90, 32.60, 42.90, 56.75, 75.20, 99.45];
      if (tilesRevealed <= customSeries.length) {
        return customSeries[tilesRevealed - 1];
      }
    }
    
    // Custom multiplier series for 4 mines
    if (minesCount === 4) {
      const customSeries = [1.13, 1.36, 1.64, 2.01, 2.48, 3.10, 3.93, 5.00, 6.35, 8.10, 10.30, 13.10, 16.75, 21.50, 27.90, 36.50, 48.00, 63.50, 84.00, 111.00, 146.00];
      if (tilesRevealed <= customSeries.length) {
        return customSeries[tilesRevealed - 1];
      }
    }
    
    // Custom multiplier series for 5 mines
    if (minesCount === 5) {
      const customSeries = [1.19, 1.5, 1.92, 2.48, 3.26, 4.34, 5.89, 7.99, 10.83, 14.74, 20.12, 27.42, 37.31, 50.58, 68.21, 91.49, 121.99, 161.84, 213.82, 281.47];
      if (tilesRevealed <= customSeries.length) {
        return customSeries[tilesRevealed - 1];
      }
    }
    
    const baseMultiplier = (totalTiles / safeTiles) ** tilesRevealed;
    return Math.max(1, baseMultiplier * 0.98);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-1 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-2 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => navigate('/casino')}
              className="flex items-center gap-1 sm:gap-2 text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
            >
              <Target className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back to Casino</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        </div>

        {/* Game Tabs */}
        <Tabs defaultValue="mines" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900 text-xs sm:text-sm">
            <TabsTrigger value="slots" onClick={() => navigate('/casino/slots')}>Slots</TabsTrigger>
            <TabsTrigger value="mines" className="bg-blue-600">Mines</TabsTrigger>
            <TabsTrigger value="dice" onClick={() => navigate('/casino/dice')}>Dice</TabsTrigger>
            <TabsTrigger value="aviator" onClick={() => navigate('/casino/aviator')}>Aviator</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mines" className="space-y-2 sm:space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-2 sm:gap-6">
              {/* Left Sidebar */}
              <div className="space-y-2 sm:space-y-6">
                {/* Auto Mode Status */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                      Auto Mode Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Status</span>
                      <Badge className={getStatusColor(settings.status)}>
                        {settings.status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Live Stats when Active */}
                    {settings.isActive && (
                      <div className="grid grid-cols-2 gap-2 p-2 sm:p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                        <div className="text-center">
                          <div className="text-base sm:text-xl font-bold text-yellow-400">{settings.betsPlaced || 0}</div>
                          <div className="text-xs text-gray-400">Bets Placed</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-base sm:text-xl font-bold ${(settings.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{(settings.totalProfit || 0).toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">Total Profit</div>
                        </div>
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-400">Auto Mode Running</span>
                        </div>
                      </div>
                    )}

                    {/* Stop Reason */}
                    {settings.stopReason && (
                      <div className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">
                          {getStopReasonText(settings.stopReason)}
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-1.5">
                      {settings.isActive ? (
                        <>
                          <Button
                            onClick={stopAutoMode}
                            disabled={isStopping}
                            className="w-full bg-red-600 hover:bg-red-700 text-sm"
                          >
                            <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            {isStopping ? 'Stopping...' : 'Stop Auto Mode'}
                          </Button>
                          <Button
                            onClick={resetAutoMode}
                            disabled={isStopping}
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-sm"
                          >
                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Reset Auto Mode
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={startAutoMode}
                          disabled={isStarting || selectedTiles.length === 0 || !settings.betAmount || settings.betAmount > (userBalance || 0)}
                          className="w-full bg-green-600 hover:bg-green-700 text-sm"
                        >
                          <Play className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          {isStarting ? 'Starting...' : 'Start Auto Mode'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                      Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3">
                    {/* Bet Amount */}
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="betAmount" className="text-gray-300 text-xs sm:text-sm">Bet Amount (₹)</Label>
                      <Input
                        id="betAmount"
                        type="number"
                        value={settings.betAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : parseInt(value.replace(/^0+/, '') || '0', 10);
                          setSettings(prev => ({ ...prev, betAmount: numValue }));
                        }}
                        min="1"
                        max={userBalance}
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                        disabled={settings.isActive}
                      />

                    </div>

                    {/* Mines Count */}
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="minesCount" className="text-gray-300 text-xs sm:text-sm">Number of Mines</Label>
                      <Input
                        id="minesCount"
                        type="number"
                        value={settings.minesCount}
                        onChange={(e) => setSettings(prev => ({ ...prev, minesCount: Number(e.target.value) }))}
                        min="1"
                        max="24"
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                        disabled={settings.isActive}
                      />
                    </div>

                    {/* Upper Balance Boundary */}
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="upperBalance" className="text-gray-300 text-xs sm:text-sm">Upper Balance Boundary (₹)</Label>
                      <Input
                        id="upperBalance"
                        type="number"
                        value={settings.stopOnProfit || ''}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          stopOnProfit: e.target.value ? Number(e.target.value) : null 
                        }))}
                        min="0"
                        placeholder="Leave empty for no limit"
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                        disabled={settings.isActive}
                      />
                    </div>

                    {/* Lower Balance Boundary */}
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="lowerBalance" className="text-gray-300 text-xs sm:text-sm">Lower Balance Boundary (₹)</Label>
                      <Input
                        id="lowerBalance"
                        type="number"
                        value={settings.stopOnLoss || ''}
                        onChange={(e) => setSettings(prev => ({ 
                          ...prev, 
                          stopOnLoss: e.target.value ? Number(e.target.value) : null 
                        }))}
                        min="0"
                        placeholder="Leave empty for no limit"
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                        disabled={settings.isActive}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="xl:col-span-2 space-y-2 sm:space-y-6">
                {/* Game Board */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                      <Bomb className="w-4 h-4 sm:w-5 sm:h-5" />
                      Select Tiles for Auto Mode
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4">
                    <div className="flex flex-col items-center">
                      <div className="w-full max-w-sm sm:max-w-md overflow-x-auto">
                        <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-3 sm:mb-4">
                          {generateGrid()}
                        </div>
                      </div>
                      
                      {/* Tile Selection Info */}
                      <div className="text-center space-y-1 sm:space-y-2">
                        <div className="text-xs text-gray-400">
                          Click tiles to select them for auto mode
                        </div>
                        <div className="text-base sm:text-lg font-bold text-white">
                          Selected: {selectedTiles.length}/{25 - settings.minesCount} tiles
                        </div>
                        {selectedTiles.length > 0 && (
                          <div className="text-xs text-gray-300">
                            Tiles: {selectedTiles.map(tile => tile + 1).join(', ')}
                          </div>
                        )}
                      </div>

                      {/* Multiplier Preview */}
                      {selectedTiles.length > 0 && (
                        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                          <div className="text-center space-y-1 sm:space-y-2">
                            <div className="text-xs text-blue-400 font-semibold">
                              Potential Payout Preview
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-white">
                              {calculateMultiplier(settings.minesCount, selectedTiles.length).toFixed(2)}x
                            </div>
                            <div className="text-sm sm:text-base text-gray-300">
                              Win: ₹{(settings.betAmount * calculateMultiplier(settings.minesCount, selectedTiles.length)).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {settings.minesCount} mines, {selectedTiles.length} tiles
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tile Selection Controls */}
                      {!settings.isActive && (
                        <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
                          <Button
                            onClick={selectRandomTiles}
                            variant="outline"
                            size="sm"
                            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 text-xs"
                          >
                            <span className="hidden sm:inline">Random Selection</span>
                            <span className="sm:hidden">Random</span>
                          </Button>
                          <Button
                            onClick={clearSelectedTiles}
                            variant="outline"
                            size="sm"
                            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 text-xs"
                          >
                            <span className="hidden sm:inline">Clear Selection</span>
                            <span className="sm:hidden">Clear</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Game History */}
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      Live Game History
                      {settings.isActive && (
                        <div className="flex items-center gap-2 ml-auto">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-400">Live</span>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4">
                    {gameHistory.length === 0 ? (
                      <div className="text-center py-4 sm:py-6 text-gray-400">
                        <Target className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 opacity-50" />
                        <p className="text-xs sm:text-sm">No games played yet</p>
                        <p className="text-xs">Start auto mode to see live game history</p>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3 max-h-48 sm:max-h-80 overflow-y-auto">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-2 p-2 sm:p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                          <div className="text-center">
                            <div className="text-base sm:text-lg font-bold text-white">{gameHistory.length}</div>
                            <div className="text-xs text-gray-400">Total Games</div>
                          </div>
                          <div className="text-center">
                            <div className="text-base sm:text-lg font-bold text-green-400">
                              {gameHistory.filter(g => g.result === 'win').length}
                            </div>
                            <div className="text-xs text-gray-400">Wins</div>
                          </div>
                          <div className="text-center">
                            <div className="text-base sm:text-lg font-bold text-red-400">
                              {gameHistory.filter(g => g.result === 'loss').length}
                            </div>
                            <div className="text-xs text-gray-400">Losses</div>
                          </div>
                        </div>
                        
                        {/* Game List */}
                        <div className="space-y-1.5">
                          {gameHistory.slice(-8).reverse().map((game, index) => (
                            <div
                              key={game.gameId || index}
                              className={`flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all ${
                                game.result === 'win' 
                                  ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' 
                                  : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                              }`}
                            >
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                                  game.result === 'win' ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  {game.result === 'win' ? (
                                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                  ) : (
                                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-white text-xs sm:text-sm">
                                    {game.result.toUpperCase()} - ₹{(game.payout || 0).toFixed(2)}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-400">
                                    Bet: ₹{game.bet} | {game.tilesRevealed} tiles | {game.multiplier?.toFixed(2) || '0'}x
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs sm:text-sm text-gray-400">
                                  {formatDate(game.createdAt)}
                                </div>
                                <div className={`text-xs font-semibold ${
                                  game.result === 'win' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {game.result === 'win' ? '+' : '-'}₹{Math.abs(game.payout - game.bet).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Show more indicator */}
                        {gameHistory.length > 8 && (
                          <div className="text-center py-1">
                            <span className="text-xs text-gray-400">
                              Showing last 8 games of {gameHistory.length} total
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Info Section */}
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mt-1" />
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="text-sm sm:text-base font-semibold text-white">How Auto Mode Works</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs text-gray-300">
                      <div>
                        <h4 className="font-semibold text-blue-400 mb-1 sm:mb-2 text-sm">Setup Process</h4>
                        <ul className="space-y-1">
                          <li>• Set your bet amount and number of mines</li>
                          <li>• Select specific tiles you want to reveal</li>
                          <li>• Set upper and lower balance boundaries</li>
                          <li>• Click "Start Auto Mode" to begin</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-400 mb-1 sm:mb-2 text-sm">Auto Execution</h4>
                        <ul className="space-y-1">
                          <li>• Automatically starts games with your settings</li>
                          <li>• Uses your selected tiles in the same order</li>
                          <li>• Cashes out after revealing all selected tiles</li>
                          <li>• Continues automatically until balance boundaries are reached</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History Section */}
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white text-sm sm:text-base">
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  Complete Game History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 sm:p-4">
                <div className="text-center">
                  <Button
                    onClick={() => navigate('/account-statement')}
                    variant="outline"
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 text-sm"
                  >
                    <History className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">View Full Transaction History</span>
                    <span className="sm:hidden">View History</span>
                  </Button>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    See all your bets, wins, and losses across all games
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MinesAutoMode; 