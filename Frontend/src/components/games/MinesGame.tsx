import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { Gem, Bomb, DollarSign, RefreshCw, Shield, Target } from 'lucide-react';
import { API_BASE } from '../../lib/utils';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { triggerBonusRefresh } from '../../pages/awaiting-bonus';

interface GameState {
  balance: number;
  totalWagered: number;
  totalWon: number;
  gamesPlayed: number;
  winRate: number;
}

interface MinesGameProps {
  gameState: GameState;
  updateGameState: (wager: number, payout: number, won: boolean) => void;
}

const GRID_SIZE = 25;
const GRID_DIM = 5;
const MINE_PRESETS = [3, 5, 10, 20];

const MinesGame: React.FC<MinesGameProps> = ({ gameState, updateGameState }) => {
  // UI State
  const [bet, setBet] = useState(100);
  const [minesCount, setMinesCount] = useState(3);
  const [autoMode, setAutoMode] = useState(false);
  const [clientSeed, setClientSeed] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cashoutError, setCashoutError] = useState<string | null>(null);

  // Game State
  const [game, setGame] = useState<any>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [gameResult, setGameResult] = useState<'active' | 'win' | 'loss' | null>(null);
  const [potentialPayout, setPotentialPayout] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [nextMultipliers, setNextMultipliers] = useState<number[]>([]);
  const [mineRiskPercent, setMineRiskPercent] = useState(0);
  const [gemsLeft, setGemsLeft] = useState(0);
  const [balance, setBalance] = useState(gameState.balance);
  const [serverSeed, setServerSeed] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  
  // Optimistic updates for instant feedback
  const [optimisticReveals, setOptimisticReveals] = useState<number[]>([]);
  const [pendingReveals, setPendingReveals] = useState<Set<number>>(new Set());

  const { toast } = useToast();
  const { setBalance: setNavbarBalance } = useOutletContext() as { setBalance: (balance: number) => void };
  const navigate = useNavigate();

  // Helper function to update both local and navbar balance
  const updateBalance = (newBalance: number) => {
    setBalance(newBalance);
    setNavbarBalance(newBalance);
    localStorage.setItem('balance', newBalance.toString());
    
    // Also update the global window balance function if it exists
    if (typeof window !== 'undefined' && window.__setLayoutBalance) {
      window.__setLayoutBalance(newBalance);
    }
  };

  // --- Multiplier Bar Auto-Scroll ---
  const multiplierRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Scroll the next multiplier into view when revealedTiles changes
    if (multiplierRefs.current[revealedTiles.length]) {
      multiplierRefs.current[revealedTiles.length]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [revealedTiles.length, nextMultipliers]);

  // Generate random client seed
  useEffect(() => {
    setClientSeed(Math.random().toString(36).substring(2, 15));
  }, []);

  // Sync local balance with gameState.balance
  useEffect(() => {
    if (gameState.balance !== balance) {
      setBalance(gameState.balance);
    }
  }, [gameState.balance, balance]);

  // Replace stateless API calls with stateful Mines API integration
  // Start new game
  const startGame = async () => {
    if (bet <= 0 || bet > balance) {
      toast({ title: 'Invalid bet', description: 'Please enter a valid bet amount within your balance.', variant: 'destructive' });
      return;
    }
    if (minesCount < 1 || minesCount > 24) {
      toast({ title: 'Invalid mines count', description: 'Mines count must be between 1 and 24.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ bet, minesCount, clientSeed }),
      });
      const data = await response.json();
      if (data.success) {
        setGame(data.game);
        setRevealedTiles([]);
        setMinePositions([]);
        setOptimisticReveals([]);
        setPendingReveals(new Set());
        setGameResult('active');
        setCurrentMultiplier(1);
        setPotentialPayout(0);
        setNextMultipliers(data.nextMultipliers || []);
        setMineRiskPercent(data.mineRiskPercent || 0);
        setGemsLeft(data.gemsLeft || (GRID_SIZE - minesCount));
        updateBalance(data.balance); // Use the updated balance from backend
        toast({ title: 'Game started!', description: `Bet: ₹${bet} | Mines: ${minesCount}` });
        if (data.bonusReleased) {
          toast({ title: '🎁 Bonus Unlocked!', description: 'Your first deposit bonus has been credited to your balance!', variant: 'default' });
        }
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start game', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Reveal tile (stateful)
  const revealTile = async (tileIndex: number) => {
    if (!game || gameResult !== 'active' || revealedTiles.includes(tileIndex) || optimisticReveals.includes(tileIndex) || pendingReveals.has(tileIndex)) return;
    setPendingReveals(prev => new Set(prev).add(tileIndex));
    setOptimisticReveals(prev => [...prev, tileIndex]);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ gameId: game.id, tileIndex }),
      });
      const data = await response.json();
      setOptimisticReveals(prev => prev.filter(t => t !== tileIndex));
      setPendingReveals(prev => {
        const newSet = new Set(prev);
        newSet.delete(tileIndex);
        return newSet;
      });
      if (data.success) {
        setRevealedTiles(data.game.revealedTiles);
        setCurrentMultiplier(data.multiplier);
        setPotentialPayout(data.potentialPayout);
        setGemsLeft(data.gemsLeft || (GRID_SIZE - minesCount - data.game.revealedTiles.length));
        setMineRiskPercent(data.mineRiskPercent || ((minesCount / (GRID_SIZE - data.game.revealedTiles.length)) * 100));
        if (data.result === 'loss') {
          setGameResult('loss');
          setMinePositions(data.game.minePositions || []);
          setServerSeed(data.game.serverSeed || '');
          setShowVerification(true);
          toast({ title: '💣 BOOM!', description: `You hit a mine! Lost ₹${game.bet}`, variant: 'destructive' });
          if (data.bonusReleased) {
            triggerBonusRefresh();
            toast({ title: '🎁 Bonus Unlocked!', description: 'Your first deposit bonus has been credited to your balance!', variant: 'default' });
          }
        } else {
          toast({ title: '💎 Safe!', description: `Multiplier: ${data.multiplier}x | Potential: ₹${data.potentialPayout.toFixed(2)}` });
        }
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reveal tile', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const canCashOut = !!game && game.isActive && revealedTiles.length > 0 && !isLoading && gameResult === 'active';

  // Cashout
  const cashOut = async () => {
    if (!canCashOut) {
      setCashoutError('You must reveal at least one tile before cashing out and the game must be active.');
      return;
    }
    setIsLoading(true);
    setCashoutError(null);
    try {
      const response = await fetch(`${API_BASE}/api/mines/cashout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await response.json();
      if (typeof data.balance === 'number') {
        updateBalance(data.balance);
      }
      if (data.success) {
        setGameResult('win');
        toast({ title: '🎉 CASHOUT!', description: `Won ₹${(data.payout ?? 0).toFixed(2)} (${data.multiplier}x)` });
        if (data.bonusReleased) {
          triggerBonusRefresh();
          toast({ title: '🎁 Bonus Unlocked!', description: 'Your first deposit bonus has been credited to your balance!', variant: 'default' });
        }
      } else {
        if (data.message === 'Game is not active') {
          setCashoutError('Game is already over. Please start a new game.');
          // Optionally refresh game state here
        } else if (data.message === 'Must reveal at least one tile before cashing out') {
          setCashoutError('Reveal at least one tile before cashing out.');
        } else if (data.message === 'Game not found') {
          setCashoutError('Game not found. Please start a new game.');
        } else if (data.message === 'You do not own this game') {
          setCashoutError('You do not own this game. Please refresh and try again.');
        } else if (data.message === 'Server error') {
          setCashoutError('Server error. Please try again.');
        } else {
          setCashoutError(data.message || 'Failed to cashout.');
        }
        toast({ title: 'Error', description: data.message || 'Failed to cashout', variant: 'destructive' });
      }
    } catch (error) {
      setCashoutError('Failed to cashout. Please try again.');
      toast({ title: 'Error', description: 'Failed to cashout', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error on new game or play again
  const resetGame = () => {
    setGame(null);
    setRevealedTiles([]);
    setMinePositions([]);
    setOptimisticReveals([]);
    setPendingReveals(new Set());
    setCurrentMultiplier(1);
    setPotentialPayout(0);
    setGameResult(null);
    setServerSeed('');
    setShowVerification(false);
    setClientSeed(Math.random().toString(36).substring(2, 15));
    setCashoutError(null);
  };

  const playAgain = () => {
    resetGame();
    setTimeout(() => {
      startGame();
    }, 100);
    setCashoutError(null);
  };

  // Generate 5x5 grid with instant feedback
  const generateGrid = (alwaysDisabled = false) => {
    const tiles = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const isRevealed = revealedTiles.includes(i);
      const isOptimisticallyRevealed = optimisticReveals.includes(i);
      const isPending = pendingReveals.has(i);
      const isMine = minePositions.includes(i);
      const isGameOver = gameResult === 'win' || gameResult === 'loss';
      
      let tileContent = null;
      let tileClass = 'bg-gray-800 hover:bg-gray-700 transition-all duration-25 ease-out';
      
      // Show optimistic reveal immediately
      if (isOptimisticallyRevealed || isRevealed) {
        if (isMine) {
          tileContent = <Bomb className="w-6 h-6 text-red-500" />;
          tileClass = 'bg-red-900 border-red-500 transform scale-95';
        } else {
          tileContent = <Gem className="w-6 h-6 text-green-400" />;
          tileClass = 'bg-green-900 border-green-500 transform scale-95';
        }
      } else if (isGameOver && isMine) {
        tileContent = <Bomb className="w-6 h-6 text-red-500" />;
        tileClass = 'bg-red-900 border-red-500';
      }
      
      // Add pending state visual feedback with instant animation
      if (isPending) {
        tileClass += ' bg-yellow-800 border-yellow-500';
      }
      
      // Completely disable interactions if game is over or always disabled
      const isDisabled = alwaysDisabled || isGameOver || !game?.isActive || isRevealed || isOptimisticallyRevealed || isPending;
      
      tiles.push(
        <button
          key={i}
          className={`w-14 h-14 border-2 border-gray-700 rounded-lg flex items-center justify-center ${tileClass} ${!isDisabled ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed opacity-60'}`}
          onClick={() => !isDisabled && revealTile(i)}
          onTouchStart={() => !isDisabled && revealTile(i)}
          disabled={isDisabled}
          style={{ 
            willChange: 'transform, background-color, border-color',
            transform: 'translateZ(0)' // Force hardware acceleration
          }}
        >
          {tileContent}
        </button>
      );
    }
    return tiles;
  };

  // Multiplier bar
  const renderMultiplierBar = () => {
    const startIdx = revealedTiles.length;
    const endIdx = startIdx + 8;
    return (
      <div className="flex gap-2 justify-center mb-4 flex-nowrap overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
        {nextMultipliers.slice(startIdx, endIdx).map((mult, idx) => (
          <div
            key={startIdx + idx}
            ref={el => multiplierRefs.current[startIdx + idx] = el}
            className={`px-3 py-1 rounded bg-gray-800 border border-gray-700 text-orange-300 font-bold text-sm ${idx === 0 ? 'ring-2 ring-yellow-400' : ''}`}
          >
            x{mult.toFixed(2)}
          </div>
        ))}
      </div>
    );
  };

  // Game details
  const renderGameDetails = () => (
    <div className="bg-gray-800 rounded-xl p-4 mt-4 grid grid-cols-3 gap-4 text-center text-sm text-gray-300">
      <div>
        <div className="font-bold text-orange-300">{gemsLeft}</div>
        <div>Gems left</div>
      </div>
      <div>
        <div className="font-bold text-red-400">{mineRiskPercent.toFixed(1)}%</div>
        <div>Mine risk</div>
      </div>
      <div>
        <div className="font-bold text-yellow-300">{revealedTiles.length}/{GRID_SIZE}</div>
        <div>Opened tiles</div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6" style={{ willChange: 'transform' }}>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-2 sm:mb-4 gap-2 sm:gap-0">
        <div className="flex gap-2 items-center">
          <span className="text-xl sm:text-2xl font-bold text-orange-400">🔥 MINES</span>
          <Badge 
            className="ml-2 cursor-pointer bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate('/casino/mines')}
          >
            Manual
          </Badge>
          <Badge 
            className="ml-2 cursor-pointer bg-gray-600 hover:bg-gray-700"
            onClick={() => navigate('/mines-auto')}
          >
            <Target className="w-3 h-3 mr-1" />
            Auto
          </Badge>
        </div>

      </div>



      {/* Multiplier Bar */}
      {game && renderMultiplierBar()}
      {/* Main Card */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="py-4 sm:py-6">
          {/* Game Board - always visible */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-8">
            <div className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-full max-w-xs sm:max-w-md overflow-x-auto">
                <div className="grid grid-cols-5 gap-1 sm:gap-2 mb-3 sm:mb-4" style={{ willChange: 'transform' }}>
                  {game ? generateGrid() : generateGrid(true)}
                </div>
              </div>
              {game && renderGameDetails()}
            </div>
            {/* Right side: controls or game info */}
            <div className="flex-1 flex flex-col gap-3 sm:gap-4 justify-center w-full max-w-xs mx-auto md:max-w-none">
              {game ? (
                <>
                  <div className="text-center mb-2 sm:mb-4">
                    <div className="text-2xl sm:text-3xl font-bold text-orange-300 mb-1 sm:mb-2">{currentMultiplier.toFixed(2)}x</div>
                    <div className="text-base sm:text-lg text-gray-300 mb-1 sm:mb-2">Potential: <span className="text-yellow-300 font-bold">₹{(potentialPayout ?? 0).toFixed(2)}</span></div>
                  </div>
                  <Button
                    onClick={cashOut}
                    disabled={!canCashOut}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-base sm:text-lg h-11 sm:h-12"
                  >
                    <DollarSign className="w-5 h-5 mr-2" />
                    Cashout
                  </Button>
                  {cashoutError && (
                    <div className="text-center text-red-400 text-sm mt-2">{cashoutError}</div>
                  )}
                  <Button
                    onClick={playAgain}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Play Again
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Controls shown when no game is active */}
                  <div className="flex-1 space-y-1 sm:space-y-2">
                    <label className="text-sm font-medium text-gray-300">Bet Amount</label>
                    <Input
                      type="number"
                      value={bet}
                      onChange={e => setBet(Number(e.target.value))}
                      className="bg-gray-800 border-gray-600 text-white"
                      min="1"
                      max={balance}
                    />
                    <div className="flex gap-1 sm:gap-2 mt-1 sm:mt-2">
                                              <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}
                        >
                          1/2
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setBet(Math.min(balance, bet * 2))}
                        >
                          2x
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setBet(balance)}
                        >
                          max
                        </Button>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1 sm:space-y-2">
                    {/* <label className="text-sm font-medium text-gray-300">Mines</label> */}
                    {/* Custom mines input */}
                    <div className="mb-1 flex flex-col items-start">
                      <label htmlFor="mines-count-input" className="text-xs text-gray-400 mb-1">Number of Mines</label>
                      <Input
                        id="mines-count-input"
                        type="number"
                        min={1}
                        max={24}
                        value={minesCount}
                        onChange={e => {
                          let val = Number(e.target.value);
                          if (isNaN(val)) val = 1;
                          setMinesCount(Math.max(1, Math.min(24, val)));
                        }}
                        className="w-20 bg-gray-800 border-gray-600 text-white text-center text-base font-bold mb-2"
                        style={{marginBottom: 0}}
                        
                    />
                    </div>
                    
                    <div className="flex gap-1 sm:gap-2 mb-1 sm:mb-2 flex-wrap">
                      {MINE_PRESETS.map(preset => (
                        <Button 
                          key={preset} 
                          size="sm" 
                          variant={minesCount === preset ? 'default' : 'outline'} 
                          onClick={() => setMinesCount(preset)}
                        >
                          {preset}
                        </Button>
                      ))}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setMinesCount(Math.max(1, minesCount - 1))}
                      >
                        -
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setMinesCount(Math.min(24, minesCount + 1))}
                      >
                        +
                      </Button>
                      {/* <Button size="sm" variant="outline" onClick={() => setMinesCount(24)}>max</Button> */}
                    </div>
                  </div>
                  <Button
                    onClick={startGame}
                    disabled={isLoading || bet <= 0 || bet > balance}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-bold text-base sm:text-lg h-11 sm:h-12"
                  >
                    {isLoading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Bomb className="w-5 h-5 mr-2" />}
                    Start Game
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* Game Result */}
          {gameResult && gameResult !== 'active' && (
            <div className="mt-4 p-4 rounded-lg border-2">
              {gameResult === 'win' ? (
                <div className="text-center text-green-400">
                  <h3 className="text-xl font-bold mb-2">🎉 CASHOUT SUCCESSFUL!</h3>
                  <p className="text-lg">You won ₹{potentialPayout.toFixed(2)}!</p>
                </div>
              ) : (
                <div className="text-center text-red-400">
                  <h3 className="text-xl font-bold mb-2">💣 GAME OVER!</h3>
                  <p className="text-lg">You lost ₹{game.bet}</p>
                  <p className="text-sm text-red-300 mt-2">All interactions disabled - Game ended</p>
                </div>
              )}
              <Button
                onClick={resetGame}
                className="w-full mt-4"
                size="lg"
              >
                New Game
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Game History */}
      {/* <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Recent Games</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide' : 'Show'} History
            </Button>
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {gameHistory.length === 0 ? (
                <div className="text-center text-gray-400 py-4">
                  No games played yet
                </div>
              ) : (
                gameHistory.map((game, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        game.result === 'win' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium text-white">
                          ₹{game.bet} | {game.minesCount} mines
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(game.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${
                        game.result === 'win' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {game.result === 'win' ? '+' : '-'}₹{game.result === 'win' ? game.payout.toFixed(2) : game.bet}
                      </div>
                      {game.result === 'win' && (
                        <div className="text-xs text-gray-400">
                          {game.multiplier.toFixed(2)}x
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card> */}


    </div>
  );
};

export default MinesGame; 