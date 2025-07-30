import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Gift, TrendingUp } from 'lucide-react';
import { API_BASE } from '@/lib/utils';

// Exported function to trigger bonus refresh from anywhere
export function triggerBonusRefresh() {
  window.dispatchEvent(new Event('bonusRefresh'));
}

const AwaitingBonus: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bonusInfo, setBonusInfo] = useState<{
    awaitingBonus: number;
    firstDepositAmount: number;
    totalBetsAfterFirstDeposit: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBonus = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/user/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (data.success && data.user) {
          setBonusInfo({
            awaitingBonus: data.user.awaitingBonus ?? 0,
            firstDepositAmount: data.user.firstDepositAmount ?? 0,
            totalBetsAfterFirstDeposit: data.user.totalBetsAfterFirstDeposit ?? 0,
          });
        } else {
          setError(data.message || 'Failed to fetch bonus info');
        }
      } catch (err) {
        setError('Server error');
      }
      setLoading(false);
    };
    fetchBonus();
    // Listen for global bonus refresh event
    const handler = () => fetchBonus();
    window.addEventListener('bonusRefresh', handler);
    return () => window.removeEventListener('bonusRefresh', handler);
  }, []);

  let progress = 0;
  if (bonusInfo && bonusInfo.firstDepositAmount > 0) {
    progress = Math.min(
      bonusInfo.totalBetsAfterFirstDeposit / (bonusInfo.firstDepositAmount * 0.5),
      1
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full glass-effect border-border/50 text-center">
        <CardHeader>
          <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-float">
            <Gift className="w-8 h-8 text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">Awaiting Bonus</CardTitle>
          <Badge className="mx-auto bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs mt-2">
            <TrendingUp className="w-4 h-4 mr-1" />
            First Deposit Bonus Progress
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-yellow-400 animate-pulse">Loading bonus info...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : bonusInfo && bonusInfo.firstDepositAmount > 0 ? (
            <>
              <div className="text-lg text-yellow-300 font-semibold">
                Bonus Unlocked: <span className="text-2xl font-bold">₹{bonusInfo.awaitingBonus}</span>
              </div>
              <div className="text-base text-gray-300">
                First Deposit: <span className="font-bold text-yellow-200">₹{bonusInfo.firstDepositAmount}</span>
              </div>
              <div className="text-base text-gray-300">
                Total Bets After First Deposit: <span className="font-bold text-yellow-200">₹{bonusInfo.totalBetsAfterFirstDeposit}</span>
              </div>
              <div className="text-base text-gray-300">
                Required to Unlock Bonus: <span className="font-bold text-yellow-200">₹{(bonusInfo.firstDepositAmount * 0.5).toFixed(2)}</span>
              </div>
              <div className="mt-4">
                <Progress value={progress * 100} className="h-4 bg-yellow-400/10" />
                <div className="text-xs text-gray-400 mt-2">
                  Progress: <span className="font-bold text-yellow-300">{(progress * 100).toFixed(1)}%</span>
                </div>
                {progress >= 1 && bonusInfo.awaitingBonus === 0 && (
                  <div className="text-green-400 font-bold mt-2">Bonus has been credited to your balance!</div>
                )}
                {progress < 1 && bonusInfo.awaitingBonus > 0 && (
                  <div className="text-yellow-300 font-semibold mt-2">Keep betting to unlock your bonus!</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-400">No first deposit bonus info found. Make your first deposit to unlock a bonus!</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AwaitingBonus; 