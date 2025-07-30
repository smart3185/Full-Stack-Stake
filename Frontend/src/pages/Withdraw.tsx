import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import WithdrawAccountForm from '../components/WithdrawAccountForm';
import WithdrawAccountList from '../components/WithdrawAccountList';
import AccountStatement from '../components/AccountStatement';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_BASE } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const Withdraw: React.FC = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/accounts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setAccounts(data.accounts || []));
  }, [refresh]);

  useEffect(() => {
    fetch(`${API_BASE}/api/withdraw`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setWithdrawals(data.withdrawals || []));
  }, [refresh]);

  // Real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = io(SOCKET_BASE, { auth: { token } });
    socket.on('withdrawal:update', (withdrawal) => {
      // If the withdrawal belongs to this user, refresh
      if (withdrawal.user === JSON.parse(atob(token.split('.')[1])).userId) {
        setRefresh(r => !r);
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  const handleAccountAdded = () => {
    setShowAddModal(false);
    setRefresh(r => !r);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start pt-4 pb-28 px-2 mobile-safe-area">
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-2xl shadow-lg glass-effect border border-gold/40 text-center p-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          <h2 className="text-2xl font-extrabold text-gold drop-shadow pt-8 pb-4">Withdraw Funds</h2>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 px-2">
            <span className="text-base font-semibold text-yellow-200">Your Bank Accounts</span>
            <Button onClick={() => setShowAddModal(true)} disabled={accounts.length >= 3} className="w-full sm:w-auto h-12 rounded-xl text-lg font-bold bg-gold text-black mt-2 sm:mt-0">
              Add Account
            </Button>
          </div>
          <WithdrawAccountList accounts={accounts} onWithdraw={handleAccountAdded} />
          <WithdrawAccountForm open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={handleAccountAdded} disabled={accounts.length >= 3} />
          <div className="mt-8">
            <AccountStatement filterType="Withdrawal Request" />
          </div>
          {/* Withdrawal Request History */}
          <div className="mt-8 pb-8">
            <h3 className="text-base font-bold text-yellow-200 mb-3">Your Withdrawal Requests</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto px-1">
              {withdrawals.length === 0 && <div className="text-slate-400 text-sm">No withdrawal requests yet.</div>}
              {withdrawals
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((req, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-800 border border-yellow-400/20 flex flex-col gap-1">
                    <div className="text-sm"><b>Amount:</b> ₹{req.amount}</div>
                    <div className="text-sm"><b>Account:</b> {req.account?.name} ({req.account?.accountNumber})</div>
                    <div className="text-sm"><b>Status:</b> <span className={req.status === 'approved' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>{req.status}</span></div>
                    {req.rejectionReason && <div className="text-xs text-red-400">Reason: {req.rejectionReason}</div>}
                    <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Withdraw; 