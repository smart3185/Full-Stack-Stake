import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Settings, Play, Square, AlertTriangle, Info } from 'lucide-react';
import { API_BASE } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';

interface AutoModeSettings {
  isActive: boolean;
  betAmount: number;
  minesCount: number;
  tilesToReveal: number;
  stopAfterBets: number | null;
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
}

interface MinesAutoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdate: (settings: AutoModeSettings) => void;
  userBalance: number;
}

const MinesAutoModeModal: React.FC<MinesAutoModeModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdate,
  userBalance
}) => {
  const [settings, setSettings] = useState<AutoModeSettings>({
    isActive: false,
    betAmount: 100,
    minesCount: 3,
    tilesToReveal: 3,
    stopAfterBets: null,
    stopOnProfit: null,
    stopOnLoss: null,
    status: 'stopped',
    stopReason: null,
    betsPlaced: 0,
    totalProfit: 0,
    startingBalance: 0,
    currentBalance: 0,
    startedAt: null,
    stoppedAt: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showStopConditions, setShowStopConditions] = useState(false);
  
  const { toast } = useToast();

  // Load settings on modal open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        onSettingsUpdate(data.settings);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load auto mode settings', variant: 'destructive' });
    }
  };

  const updateSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          betAmount: settings.betAmount,
          minesCount: settings.minesCount,
          tilesToReveal: settings.tilesToReveal,
          stopAfterBets: settings.stopAfterBets,
          stopOnProfit: settings.stopOnProfit,
          stopOnLoss: settings.stopOnLoss,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Auto mode settings updated' });
        await loadSettings();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update settings', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoMode = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`${API_BASE}/api/mines/auto/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Auto Mode Started!', description: `First game: ${data.gameResult.result} - ₹${(data.gameResult.payout || 0).toFixed(2)}` });
        await loadSettings();
        onClose();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to start auto mode', variant: 'destructive' });
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Auto Mode Stopped', description: `Total profit: ₹${(data.settings.totalProfit || 0).toFixed(2)}` });
        await loadSettings();
      } else {
        toast({ title: 'Error', description: data.message, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to stop auto mode', variant: 'destructive' });
    } finally {
      setIsStopping(false);
    }
  };

  const validateSettings = () => {
    if (!settings.betAmount || settings.betAmount <= 0 || settings.betAmount > (userBalance || 0)) {
      return 'Invalid bet amount';
    }
    if (!settings.minesCount || settings.minesCount < 1 || settings.minesCount > 24) {
      return 'Mines count must be between 1 and 24';
    }
    if (!settings.tilesToReveal || settings.tilesToReveal < 1 || settings.tilesToReveal > 25) {
      return 'Tiles to reveal must be between 1 and 25';
    }
    if (settings.tilesToReveal + settings.minesCount > 25) {
      return 'Tiles to reveal + mines count cannot exceed 25';
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'stopped': return 'text-red-400';
      case 'paused': return 'text-yellow-400';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Auto Mode Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          {settings.isActive && (
            <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-4 rounded-lg border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold">Auto Mode Active</span>
                <Badge className={`${getStatusColor(settings.status)} bg-transparent border`}>
                  {settings.status.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Bets Placed: <span className="text-yellow-400">{settings.betsPlaced}</span></div>
                <div>Total Profit: <span className={(settings.totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ₹{(settings.totalProfit || 0).toFixed(2)}
                </span></div>
                                  <div>Starting: <span className="text-cyan-400">₹{(settings.startingBalance || 0).toFixed(2)}</span></div>
                  <div>Current: <span className="text-cyan-400">₹{(settings.currentBalance || 0).toFixed(2)}</span></div>
              </div>
              {settings.stopReason && (
                <div className="mt-2 text-xs text-gray-400">
                  Stop Reason: {getStopReasonText(settings.stopReason)}
                </div>
              )}
            </div>
          )}

          {/* Basic Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Game Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="betAmount">Bet Amount (₹)</Label>
              <Input
                id="betAmount"
                type="number"
                value={settings.betAmount}
                onChange={(e) => setSettings(prev => ({ ...prev, betAmount: Number(e.target.value) }))}
                min="1"
                max={userBalance}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <div className="text-xs text-gray-400">
                Available: ₹{(userBalance || 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minesCount">Number of Mines</Label>
              <Input
                id="minesCount"
                type="number"
                value={settings.minesCount}
                onChange={(e) => setSettings(prev => ({ ...prev, minesCount: Number(e.target.value) }))}
                min="1"
                max="24"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tilesToReveal">Tiles to Reveal</Label>
              <Input
                id="tilesToReveal"
                type="number"
                value={settings.tilesToReveal}
                onChange={(e) => setSettings(prev => ({ ...prev, tilesToReveal: Number(e.target.value) }))}
                min="1"
                max="25"
                className="bg-gray-800 border-gray-600 text-white"
              />
              <div className="text-xs text-gray-400">
                Max: {25 - settings.minesCount} tiles
              </div>
            </div>
          </div>

          {/* Stop Conditions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Stop Conditions</h3>
              <Switch
                checked={showStopConditions}
                onCheckedChange={setShowStopConditions}
              />
            </div>

            {showStopConditions && (
              <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div className="space-y-2">
                  <Label htmlFor="stopAfterBets">Stop After N Bets</Label>
                  <Input
                    id="stopAfterBets"
                    type="number"
                    value={settings.stopAfterBets || ''}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      stopAfterBets: e.target.value ? Number(e.target.value) : null 
                    }))}
                    min="1"
                    placeholder="Leave empty for no limit"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stopOnProfit">Stop on Profit (₹)</Label>
                  <Input
                    id="stopOnProfit"
                    type="number"
                    value={settings.stopOnProfit || ''}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      stopOnProfit: e.target.value ? Number(e.target.value) : null 
                    }))}
                    min="0"
                    placeholder="Leave empty for no limit"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stopOnLoss">Stop on Loss (₹)</Label>
                  <Input
                    id="stopOnLoss"
                    type="number"
                    value={settings.stopOnLoss || ''}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      stopOnLoss: e.target.value ? Number(e.target.value) : null 
                    }))}
                    min="0"
                    placeholder="Leave empty for no limit"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation Error */}
          {(() => {
            const error = validateSettings();
            return error ? (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            ) : null;
          })()}

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
            <div className="text-blue-400 text-sm">
              <p>Auto mode will automatically play games with your configured settings.</p>
              <p className="mt-1">Tiles are selected randomly for each game.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {settings.isActive ? (
              <Button
                onClick={stopAutoMode}
                disabled={isStopping}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Square className="w-4 h-4 mr-2" />
                {isStopping ? 'Stopping...' : 'Stop Auto Mode'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={updateSettings}
                  disabled={isLoading || !!validateSettings()}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button
                  onClick={startAutoMode}
                  disabled={isStarting || !!validateSettings()}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isStarting ? 'Starting...' : 'Start Auto Mode'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MinesAutoModeModal; 