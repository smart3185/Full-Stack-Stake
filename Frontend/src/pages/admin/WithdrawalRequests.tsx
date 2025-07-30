import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/utils';

const WithdrawalRequests: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetch(`${API_BASE}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setWithdrawals(data.withdrawals || []));
  }, [token, navigate]);

  const handleWithdrawAction = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/withdrawals/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: action === 'reject' ? JSON.stringify({ reason }) : undefined
      });
      const data = await res.json();
      if (data.success) {
        setWithdrawals(withdrawals => withdrawals.map(w => w._id === id ? { ...w, status: action === 'approve' ? 'approved' : 'rejected', rejectionReason: reason } : w));
        toast.success(`Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}!`);
      } else {
        toast.error(data.message || 'Action failed');
      }
    } catch {
      toast.error('Server error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300 drop-shadow">Withdrawal Requests</h2>
      {withdrawals.length === 0 && <div className="text-slate-400">No withdrawal requests.</div>}
      {withdrawals.map((req, i) => (
        <div key={i} className="p-4 rounded-lg bg-slate-800 border border-yellow-400/20 flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <div>
            <div><b>User:</b> {req.user?.email || req.user}</div>
            <div><b>Amount:</b> ₹{req.amount}</div>
            <div><b>Account Holder:</b> {req.account?.name}</div>
            <div><b>Account No:</b> {req.account?.accountNumber}</div>
            <div><b>IFSC:</b> {req.account?.ifsc}</div>
            <div><b>Mobile:</b> {req.account?.mobile}</div>
            <div><b>Status:</b> <span className={req.status === 'approved' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>{req.status}</span></div>
            {req.rejectionReason && <div className="text-xs text-red-400">Reason: {req.rejectionReason}</div>}
            <div className="text-xs text-slate-400">{(req.createdAt ?? 0).toLocaleString()}</div>
          </div>
          {req.status === 'pending' && (
            <div className="flex flex-col gap-2">
              <Input type="text" placeholder="Rejection reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="mb-2 px-2 py-1 rounded bg-slate-700 text-white" />
              <div className="flex gap-2">
                <Button onClick={() => handleWithdrawAction(req._id, 'approve')} disabled={loading}>Approve</Button>
                <Button variant="destructive" onClick={() => handleWithdrawAction(req._id, 'reject', reason)} disabled={loading}>Reject</Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WithdrawalRequests; 