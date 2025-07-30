import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { API_BASE } from '@/lib/utils';

const Deposit: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('IMPS');
  const [utr, setUtr] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const { setBalance } = useOutletContext() as { setBalance: (bal: number) => void };

  useEffect(() => {
    fetch(`${API_BASE}/api/deposit-settings`)
      .then(res => res.json())
      .then(data => setAdminSettings(data.settings));
    fetch(`${API_BASE}/api/deposit-requests`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setRequests(data.deposits || []);
        // Fetch latest balance after deposit requests update
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`${API_BASE}/api/user/balance`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) setBalance(data.balance);
            });
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert and round to 2 decimal places to ensure precision
    const depositAmount = Math.round(parseFloat(amount) * 100) / 100;
    
    if (!amount || isNaN(depositAmount) || depositAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    
    if (depositAmount < 300) {
      toast.error('Minimum deposit amount is ₹300');
      return;
    }
    
    if (depositAmount > 10000) {
      toast.error('Maximum deposit amount is ₹10,000');
      return;
    }
    
    if (!utr) {
      toast.error('Enter your UTR/Reference number');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('amount', depositAmount.toString());
    formData.append('method', method);
    formData.append('utr', utr);
    if (proof) formData.append('proof', proof);
    try {
      const res = await fetch(`${API_BASE}/api/deposit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Deposit request submitted!');
        setAmount('');
        setUtr('');
        setProof(null);
        setRequests([data.deposit, ...requests]);
      } else {
        toast.error(data.message || 'Error submitting deposit');
      }
    } catch {
      toast.error('Server error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-3 sm:p-6 mt-4 sm:mt-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 text-yellow-300 drop-shadow">Deposit Funds</h2>
      
      {/* First Deposit Bonus Notification */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-green-900/50 to-emerald-900/50 rounded-xl border border-green-400/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">🎁</span>
          </div>
          <span className="text-green-300 font-semibold text-sm sm:text-base">First Deposit Bonus</span>
        </div>
        <p className="text-green-200 text-xs sm:text-sm">
          New users get a <span className="font-bold text-green-300">10% bonus</span> on their first deposit! 
          For example, deposit ₹1000 and get ₹1100 credited to your account.
        </p>
        <p className="text-green-200 text-xs mt-1">
          Deposit limits: ₹300 - ₹10,000
        </p>
      </div>
      
      {adminSettings && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-800 rounded-xl border border-yellow-400/30 flex flex-col items-center">
          {/* WhatsApp chat link instead of QR image */}
          <a
            href="https://wa.me/+12163153582?text=Hello! I want to deposit money to my account. Please provide me with the account details."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow hover:bg-green-600 transition mb-2"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A12.07 12.07 0 0012 0C5.37 0 0 5.37 0 12c0 2.12.55 4.19 1.6 6.01L0 24l6.18-1.62A12.07 12.07 0 0012 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.23-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.23-1.44l-.37-.22-3.67.96.98-3.58-.24-.37A9.94 9.94 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.6c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.34-.26.27-1 1-.97 2.43.03 1.43 1.03 2.81 1.18 3 .15.19 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z"/></svg>
            Click here
          </a>
          <div className="text-yellow-200 font-semibold text-sm sm:text-base">Get account details on WhatsApp</div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-yellow-200 font-semibold mb-2 text-sm sm:text-base">Amount (INR)</label>
          <Input 
            type="number" 
            min={300} 
            max={10000}
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            className="text-base sm:text-lg font-bold h-12" 
            placeholder="Enter amount between ₹300 - ₹10,000"
            required 
          />
          <div className="text-xs text-slate-400 mt-1">
            Minimum: ₹300 | Maximum: ₹10,000
          </div>
        </div>
        <div>
          <label className="block text-yellow-200 font-semibold mb-2 text-sm sm:text-base">Deposit Method</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className="w-full p-3 sm:p-2 rounded bg-slate-800 text-yellow-200 font-bold border border-yellow-400/40 h-12">
            <option value="IMPS">IMPS</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="UPI">UPI</option>
            <option value="CRYPTO">Crypto</option>
          </select>
        </div>
        <div>
          <label className="block text-yellow-200 font-semibold mb-2 text-sm sm:text-base">Your UTR/Reference Number</label>
          <Input value={utr} onChange={e => setUtr(e.target.value)} className="text-base sm:text-lg font-bold h-12" required />
        </div>
        <div>
          <label className="block text-yellow-200 font-semibold mb-2 text-sm sm:text-base">Upload Payment Proof (required)</label>
          <input type="file" accept="image/*,application/pdf" onChange={e => setProof(e.target.files?.[0] || null)} className="w-full p-2 border border-yellow-400/40 rounded bg-slate-800 text-yellow-200" required />
        </div>
        <Button type="submit" className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-lg sm:text-xl py-3 h-12" disabled={loading}>{loading ? 'Submitting...' : 'Submit Deposit Request'}</Button>
      </form>
      <div className="mt-8 sm:mt-10">
        <h3 className="text-lg sm:text-xl font-bold text-yellow-200 mb-3 sm:mb-4">Your Deposit Requests</h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {requests.length === 0 && <div className="text-slate-400 text-sm sm:text-base">No deposit requests yet.</div>}
          {requests.map((req, i) => (
            <div key={i} className="p-3 rounded-lg bg-slate-800 border border-yellow-400/20 flex flex-col gap-1">
              <div className="text-sm sm:text-base"><b>Amount:</b> ₹{req.amount}</div>
              <div className="text-sm sm:text-base"><b>Method:</b> {req.method}</div>
              <div className="text-sm sm:text-base"><b>Your UTR:</b> {req.utr || '-'}</div>
              <div className="text-sm sm:text-base"><b>Status:</b> <span className={req.status === 'approved' ? 'text-green-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-300'}>{req.status}</span></div>
              {req.proof && <a href={`${API_BASE}/${req.proof.replace('backend/', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-sm sm:text-base">View Proof</a>}
              {req.adminReason && <div className="text-xs text-red-400">Admin: {req.adminReason}</div>}
              <div className="text-xs text-slate-400">{(req.createdAt ?? 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Deposit; 