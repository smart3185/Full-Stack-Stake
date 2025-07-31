import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import WithdrawAccountForm from './WithdrawAccountForm';
import { API_BASE } from '@/lib/utils';

interface Props {
  accounts: any[];
  onWithdraw: () => void;
}

const WithdrawAccountList: React.FC<Props> = ({ accounts, onWithdraw }) => {
  const [amounts, setAmounts] = useState<string[]>(accounts.map(() => ''));
  const [passwords, setPasswords] = useState<string[]>(accounts.map(() => ''));
  const [loading, setLoading] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleAmountChange = (i: number, value: string) => {
    const arr = [...amounts];
    arr[i] = value;
    setAmounts(arr);
  };
  const handlePasswordChange = (i: number, value: string) => {
    const arr = [...passwords];
    arr[i] = value;
    setPasswords(arr);
  };

  const handleWithdraw = async (i: number) => {
    if (!amounts[i] || isNaN(Number(amounts[i])) || Number(amounts[i]) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    
    if (Number(amounts[i]) < 200) {
      toast.error('Minimum withdrawal amount is ₹200');
      return;
    }
    
    // Debug logging
    console.log('Withdraw attempt:', {
      accountIndex: i,
      amount: Number(amounts[i]),
      accounts: accounts,
      accountExists: accounts[i],
      userBalance: localStorage.getItem('balance')
    });
    
    setLoading(i);
    try {
      const payload = {
        accountIndex: i,
        amount: Number(amounts[i]),
        withdrawPassword: passwords[i] || undefined
      };
      console.log('Withdraw payload:', payload);
      
      const res = await fetch(`${API_BASE}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Withdraw error response:', errorData);
        toast.error(errorData.message || `Error: ${res.status}`);
        return;
      }
      
      const data = await res.json();
      if (data.success) {
        toast.success('Withdrawal request submitted!');
        setAmounts(accounts.map(() => ''));
        setPasswords(accounts.map(() => ''));
        onWithdraw();
      } else {
        toast.error(data.message || 'Error submitting withdrawal');
      }
    } catch (err) {
      console.error('Withdraw request error:', err);
      toast.error('Server error');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (i: number) => {
    if (!window.confirm('Delete this account?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${i}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account deleted');
        onWithdraw();
      } else {
        toast.error(data.message || 'Error deleting account');
      }
    } catch {
      toast.error('Server error');
    }
  };

  const handleEdit = (i: number) => {
    setEditIndex(i);
    setEditOpen(true);
  };

  const handleSaveEdit = async (values: any) => {
    if (editIndex === null) return;
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${editIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account updated');
        setEditOpen(false);
        setEditIndex(null);
        onWithdraw();
      } else {
        toast.error(data.message || 'Error updating account');
      }
    } catch {
      toast.error('Server error');
    }
  };

  if (!accounts.length) return <div className="text-slate-400 mb-6">No bank accounts added yet.</div>;

  return (
    <div className="space-y-6 mb-8">
      {accounts.map((acc, i) => (
        <div key={i} className="bg-slate-800 rounded-lg p-4 shadow border border-yellow-400/20 flex flex-col gap-2">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <div className="font-bold text-yellow-200">{acc.name}</div>
              <div className="text-slate-300 text-sm">A/C: {acc.accountNumber}</div>
              <div className="text-slate-300 text-sm">IFSC: {acc.ifsc}</div>
              <div className="text-slate-300 text-sm">Mobile: {acc.mobile}</div>
            </div>
            <form className="flex gap-2 items-center" onSubmit={e => { e.preventDefault(); handleWithdraw(i); }}>
              <Input type="number" min={200} placeholder="Amount" value={amounts[i] || ''} onChange={e => handleAmountChange(i, e.target.value)} className="w-28" required />
              {acc.withdrawPassword && (
                <Input type="password" placeholder="Password" value={passwords[i] || ''} onChange={e => handlePasswordChange(i, e.target.value)} className="w-32" required />
              )}
              <Button type="submit" disabled={loading === i}>{loading === i ? 'Withdrawing...' : 'Withdraw'}</Button>
            </form>
            <div className="flex flex-col gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={() => handleEdit(i)}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(i)}>Delete</Button>
            </div>
          </div>
        </div>
      ))}
      <WithdrawAccountForm
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditIndex(null); }}
        onSave={handleSaveEdit}
        initialValues={editIndex !== null ? accounts[editIndex] : undefined}
        mode="edit"
      />
    </div>
  );
};

export default WithdrawAccountList; 