import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/utils';

const DepositRequests: React.FC = () => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetch(`${API_BASE}/api/admin/deposit-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setDeposits(data.deposits || []));
  }, [token, navigate]);

  const handleDepositAction = async (id: string, action: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/deposit-request/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, adminReason: reason })
      });
      const data = await res.json();
      if (data.success) {
        setDeposits(deposits => deposits.map(d => d._id === id ? { ...d, status: action, adminReason: reason } : d));
        toast.success(`Deposit ${action}!`);
        setReason('');
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
      <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300 drop-shadow">Deposit Requests</h2>
      {deposits.length === 0 && <div className="text-slate-400">No deposit requests.</div>}
      {deposits
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((req, i) => (
          <div key={i} className="p-4 rounded-lg bg-slate-800 border border-yellow-400/20 flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div>
              <div><b>User:</b> {req.user?.email || req.user}</div>
              <div><b>Amount:</b> ₹{req.amount}</div>
              <div><b>Method:</b> {req.method}</div>
              <div><b>User UTR:</b> {req.utr || '-'}</div>
              <div><b>Status:</b> <span className={req.status === 'approved' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>{req.status}</span></div>
              {req.proof && <a href={req.proof && req.proof.startsWith('http') ? req.proof : `${API_BASE}/${req.proof.replace('backend/', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Proof</a>}
              {req.adminReason && <div className="text-xs text-red-400">Admin: {req.adminReason}</div>}
              <div className="text-xs text-slate-400">{(req.createdAt ?? 0).toLocaleString()}</div>
            </div>
            {req.status === 'pending' && (
              <div className="flex flex-col gap-2">
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="mb-2" />
                <div className="flex gap-2">
                  <Button onClick={() => handleDepositAction(req._id, 'approved')} disabled={loading}>Approve</Button>
                  <Button variant="destructive" onClick={() => handleDepositAction(req._id, 'rejected')} disabled={loading}>Reject</Button>
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default DepositRequests; 