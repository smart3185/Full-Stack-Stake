import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_BASE } from '@/lib/utils';

const Admin: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [adminUtr, setAdminUtr] = useState('');
  const [reason, setReason] = useState('');
  const [volatilityMode, setVolatilityMode] = useState("normal");
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [onlineUsersList, setOnlineUsersList] = useState<any[]>([]);

  // Admin login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('adminToken', data.token);
        toast.success('Admin login successful!');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch {
      toast.error('Server error');
    }
    setLoading(false);
  };

  // Fetch requests
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/admin/deposit-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setDeposits(data.deposits || []));
    fetch(`${API_BASE}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setWithdrawals(data.withdrawals || []));
    fetch(`${API_BASE}/api/deposit-settings`)
      .then(res => res.json())
      .then(data => setAdminSettings(data.settings));
    fetch(`${API_BASE}/api/admin/volatility-mode`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.mode) setVolatilityMode(data.mode);
      });
    
    // Fetch online users
    fetchOnlineUsers();
    
    // Real-time updates
    const socket = io(SOCKET_BASE, { auth: { token } });
    socket.on('withdrawal:new', (withdrawal) => {
      setWithdrawals(wds => [withdrawal, ...wds]);
    });
    socket.on('withdrawal:update', (withdrawal) => {
      setWithdrawals(wds => wds.map(w => w._id === withdrawal._id ? withdrawal : w));
    });
    socket.on('onlineUsers:update', (data) => {
      setOnlineUsersCount(data.count);
    });
    return () => { socket.disconnect(); };
  }, [token]);

  // Fetch online users function
  const fetchOnlineUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/online-users`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (data.success) {
        setOnlineUsersCount(data.count);
        setOnlineUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching online users:', err);
    }
  };

  // Admin actions
  const handleUploadSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUtr && !qrFile) {
      toast.error('Enter UTR or upload QR');
      return;
    }
    const formData = new FormData();
    if (adminUtr) formData.append('utr', adminUtr);
    if (qrFile) formData.append('qrImage', qrFile);
    try {
      const res = await fetch(`${API_BASE}/api/admin/deposit-settings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings updated!');
        setAdminSettings(data.settings);
        setAdminUtr('');
        setQrFile(null);
      } else {
        toast.error(data.message || 'Error updating settings');
      }
    } catch {
      toast.error('Server error');
    }
  };

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

  if (!token) {
    return (
      <div className="max-w-sm mx-auto p-8 mt-16 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300 drop-shadow">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-yellow-200 font-semibold mb-2">Username</label>
            <Input value={username} onChange={e => setUsername(e.target.value)} className="text-lg font-bold" required />
          </div>
          <div>
            <label className="block text-yellow-200 font-semibold mb-2">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="text-lg font-bold" required />
          </div>
          <Button type="submit" className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-xl py-3" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300 drop-shadow">Admin Panel</h2>
      
      {/* Online Users Display */}
      <div className="flex items-center justify-between mb-6 p-4 bg-slate-800 rounded-xl border border-yellow-400/30">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-yellow-200 font-semibold text-sm">Online Users</div>
            <div className="text-white font-bold text-2xl">{onlineUsersCount}</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-semibold text-sm">Active</div>
            <div className="text-green-400 font-bold text-lg">🟢</div>
          </div>
        </div>
        <Button 
          onClick={fetchOnlineUsers} 
          className="bg-yellow-500 text-black font-bold hover:bg-yellow-400"
        >
          Refresh
        </Button>
      </div>
      
      <div className="flex gap-4 mb-6 justify-center">
        <Button variant={tab === 'deposit' ? 'default' : 'outline'} onClick={() => setTab('deposit')}>Deposit Requests</Button>
        <Button variant={tab === 'withdraw' ? 'default' : 'outline'} onClick={() => setTab('withdraw')}>Withdrawal Requests</Button>
        <Button variant="outline" onClick={() => { setToken(null); localStorage.removeItem('adminToken'); }}>Logout</Button>
      </div>
      {tab === 'deposit' ? (
        <div className="space-y-4">
          <form onSubmit={handleUploadSettings} className="flex flex-col md:flex-row gap-4 items-center mb-4 bg-slate-800 p-4 rounded-xl border border-yellow-400/30">
            <div>
              <label className="block text-yellow-200 font-semibold mb-1">Upload QR Code</label>
              <input type="file" accept="image/*" onChange={e => setQrFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <label className="block text-yellow-200 font-semibold mb-1">Set Wallet UTR</label>
              <Input value={adminUtr} onChange={e => setAdminUtr(e.target.value)} placeholder="Enter UTR" />
            </div>
            <Button type="submit" className="bg-yellow-500 text-black font-bold">Update Settings</Button>
            {adminSettings && adminSettings.qrImage && (
              <img src={adminSettings.qrImage} alt="Current QR" className="w-24 h-24 object-contain border border-yellow-400 rounded-lg ml-4" />
            )}
            {adminSettings && adminSettings.utr && (
              <div className="text-yellow-200 font-semibold ml-4">Current UTR: <span className="text-white">{adminSettings.utr}</span></div>
            )}
          </form>

          {/* Game Mode Selection */}
          <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-yellow-400/30">
            <label className="text-yellow-200 font-semibold">Game Mode:</label>
            <select
              className="bg-slate-800 border border-yellow-400 text-white px-4 py-2 rounded"
              value={volatilityMode}
              onChange={async (e) => {
                const newMode = e.target.value;
                setVolatilityMode(newMode);
                const res = await fetch(`${API_BASE}/api/admin/volatility-mode`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                  },
                  body: JSON.stringify({ mode: newMode })
                });
                const data = await res.json();
                if (data.success) {
                  toast.success('Volatility mode updated!');
                } else {
                  toast.error(data.message || 'Failed to update mode');
                }
              }}
            >
              <option value="normal">Normal</option>
              <option value="mild">Mild</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {deposits.length === 0 && <div className="text-slate-400">No deposit requests.</div>}
          {deposits.map((req, i) => (
            <div key={i} className="p-4 rounded-lg bg-slate-800 border border-yellow-400/20 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div><b>User:</b> {req.user?.email || req.user}</div>
                <div><b>Amount:</b> ₹{req.amount}</div>
                <div><b>Method:</b> {req.method}</div>
                <div><b>User UTR:</b> {req.utr || '-'}</div>
                <div><b>Status:</b> <span className={req.status === 'approved' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>{req.status}</span></div>
                {req.proof && <a href={`${API_BASE}/${req.proof.replace('backend/', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">View Proof</a>}
                {req.adminReason && <div className="text-xs text-red-400">Admin: {req.adminReason}</div>}
                <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleString()}</div>
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
      ) : (
        <div className="space-y-4">
          {withdrawals.length === 0 && <div className="text-slate-400">No withdrawal requests.</div>}
          {withdrawals.map((req, i) => (
            <div key={i} className="p-4 rounded-lg bg-slate-800 border border-yellow-400/20 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div><b>User:</b> {req.user?.email || req.user}</div>
                <div><b>Amount:</b> ₹{req.amount}</div>
                <div><b>Account Holder:</b> {req.account?.name}</div>
                <div><b>Account No:</b> {req.account?.accountNumber}</div>
                <div><b>IFSC:</b> {req.account?.ifsc}</div>
                <div><b>Mobile:</b> {req.account?.mobile}</div>
                <div><b>Status:</b> <span className={req.status === 'approved' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>{req.status}</span></div>
                {req.rejectionReason && <div className="text-xs text-red-400">Reason: {req.rejectionReason}</div>}
                <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleString()}</div>
              </div>
              {req.status === 'pending' && (
                <div className="flex flex-col gap-2">
                  <input type="text" placeholder="Rejection reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="mb-2 px-2 py-1 rounded bg-slate-700 text-white" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleWithdrawAction(req._id, 'approve')} disabled={loading}>Approve</Button>
                    <Button variant="destructive" onClick={() => handleWithdrawAction(req._id, 'reject', reason)} disabled={loading}>Reject</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin; 