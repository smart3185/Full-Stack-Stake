import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Play, Square, Settings, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { API_BASE } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';

interface AutoModeStatus {
  isActive: boolean;
  status: string;
  stopReason: string | null;
  betsPlaced: number;
  totalProfit: number;
  startingBalance: number;
  currentBalance: number;
  startedAt: string | null;
  stoppedAt: string | null;
  gamesPlayed: Array<{
    gameId: string;
    bet: number;
    result: 'win' | 'loss';
    payout: number;
    multiplier: number;
    tilesRevealed: number;
    createdAt: string;
  }>;
}

interface MinesAutoModeStatusProps {
  onSettingsUpdate: (settings: any) => void;
  onOpenSettings: () => void;
}

const MinesAutoModeStatus: React.FC<MinesAutoModeStatusProps> = ({
  onSettingsUpdate,
  onOpenSettings
}) => {
  const [status, setStatus] = useState<AutoModeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  
  const { toast } = useToast();

  // Load status on mount and set up polling
  useEffect(() => {
    loadStatus();
    
    // Poll for status updates every 2 seconds if auto mode is active
    const interval = setInterval(() => {
      if (status?.isActive) {
        loadStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status?.isActive]);

  const loadStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data);
        onSettingsUpdate(data);
      }
    } catch (error) {
      console.error('Failed to load auto mode status:', error);
    }
  };

  const continueAutoMode = async () => {
    setIsContinuing(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/continue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        if (data.stopped) {
          toast({ 
            title: 'Auto Mode Stopped', 
            description: `Reason: ${data.reason.replace(/_/g, ' ')}` 
          });
        } else {
          toast({ 
            title: 'Game Completed', 
            description: `${data.gameResult.result} - ₹${(data.gameResult.payout || 0).toFixed(2)} (${data.gameResult.multiplier || 0}x)` 
          });
        }
        await loadStatus();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to continue auto mode', variant: 'destructive' });
    } finally {
      setIsContinuing(false);
    }
  };

  const stopAutoMode = async () => {
    setIsStopping(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast({ 
          title: 'Auto Mode Stopped', 
          description: `Total profit: ₹${(data.settings.totalProfit || 0).toFixed(2)}` 
        });
        await loadStatus();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to stop auto mode', variant: 'destructive' });
    } finally {
      setIsStopping(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'stopped': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'paused': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'error': return 'text-red-500 bg-red-900/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getStopReasonText = (reason: string | null) => {
    switch (reason) {
      case 'manual': return 'Manually stopped';
      case 'insufficient_balance': return 'Insufficient balance';
      case 'stop_after_bets': return 'Reached bet limit';
      case 'stop_on_profit': return 'Reached profit target';
      case 'stop_on_loss': return 'Reached loss limit';
      case 'error': return 'Error occurred';
      default: return 'Not stopped';
    }
  };

  const formatDuration = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return '0s';
    
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (!status) {
    return null;
  }

  // Ensure all numeric values have defaults to prevent undefined errors
  const safeStatus = {
    ...status,
    betsPlaced: status.betsPlaced || 0,
    totalProfit: status.totalProfit || 0,
    startingBalance: status.startingBalance || 0,
    currentBalance: status.currentBalance || 0,
    gamesPlayed: status.gamesPlayed || []
  };

  return (
    <Card className="bg-gray-900 border-gray-700 mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Auto Mode</h3>
              <Badge className={getStatusColor(safeStatus.status)}>
                {safeStatus.status.toUpperCase()}
              </Badge>
            </div>
            <Button
              onClick={onOpenSettings}
              variant="outline"
              size="sm"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{safeStatus.betsPlaced}</div>
              <div className="text-xs text-gray-400">Bets Placed</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${safeStatus.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ₹{safeStatus.totalProfit.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">Total Profit</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400">₹{safeStatus.startingBalance.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Starting Balance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-cyan-400">₹{safeStatus.currentBalance.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Current Balance</div>
            </div>
          </div>

          {/* Progress Bar */}
          {safeStatus.isActive && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Session Duration</span>
                <span className="text-white">{formatDuration(safeStatus.startedAt, safeStatus.stoppedAt)}</span>
              </div>
              <Progress 
                value={100} 
                className="h-2 bg-gray-700"
              />
            </div>
          )}

          {/* Recent Games */}
          {safeStatus.gamesPlayed.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300">Recent Games</h4>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                  {safeStatus.gamesPlayed.slice(-5).map((game, index) => (
                  <div
                    key={game.gameId}
                    className={`flex-shrink-0 p-2 rounded-lg border text-xs ${
                      game.result === 'win' 
                        ? 'bg-green-900/20 border-green-500/30 text-green-400' 
                        : 'bg-red-900/20 border-red-500/30 text-red-400'
                    }`}
                  >
                    <div className="font-bold">{game.result.toUpperCase()}</div>
                    <div>₹{(game.payout || 0).toFixed(2)}</div>
                    <div>{game.multiplier}x</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stop Reason */}
          {safeStatus.stopReason && (
            <div className="flex items-center gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                {getStopReasonText(safeStatus.stopReason)}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          {safeStatus.isActive ? (
            <div className="flex gap-2">
              <Button
                onClick={continueAutoMode}
                disabled={isContinuing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                {isContinuing ? 'Continuing...' : 'Continue Next Game'}
              </Button>
              <Button
                onClick={stopAutoMode}
                disabled={isStopping}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Square className="w-4 h-4 mr-2" />
                {isStopping ? 'Stopping...' : 'Stop Now'}
              </Button>
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm">
              Auto mode is not currently running
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MinesAutoModeStatus; 