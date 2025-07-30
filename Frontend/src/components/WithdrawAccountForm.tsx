import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSave?: (values: any) => void;
  disabled?: boolean;
  initialValues?: any;
  mode?: 'add' | 'edit';
}

const WithdrawAccountForm: React.FC<Props> = ({ open, onClose, onSuccess, onSave, disabled, initialValues, mode = 'add' }) => {
  const [form, setForm] = useState({ name: '', accountNumber: '', ifsc: '', mobile: '', withdrawPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || '',
        accountNumber: initialValues.accountNumber || '',
        ifsc: initialValues.ifsc || '',
        mobile: initialValues.mobile || '',
        withdrawPassword: initialValues.withdrawPassword || ''
      });
    } else {
      setForm({ name: '', accountNumber: '', ifsc: '', mobile: '', withdrawPassword: '' });
    }
  }, [initialValues, open]);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.accountNumber || !form.ifsc || !form.mobile) {
      toast.error('All fields except password are required');
      return;
    }
    setLoading(true);
    if (mode === 'edit' && onSave) {
      await onSave(form);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account added!');
        setForm({ name: '', accountNumber: '', ifsc: '', mobile: '', withdrawPassword: '' });
        onSuccess && onSuccess();
      } else {
        toast.error(data.message || 'Error adding account');
      }
    } catch {
      toast.error('Server error');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">{mode === 'edit' ? 'Edit Bank Account' : 'Add Bank Account'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" placeholder="Account Holder Name" value={form.name} onChange={handleChange} required disabled={disabled} />
          <Input name="accountNumber" placeholder="Account Number" value={form.accountNumber} onChange={handleChange} required disabled={disabled} />
          <Input name="ifsc" placeholder="IFSC Code" value={form.ifsc} onChange={handleChange} required disabled={disabled} />
          <Input name="mobile" placeholder="Mobile Number" value={form.mobile} onChange={handleChange} required disabled={disabled} />
          <Input name="withdrawPassword" placeholder="Withdraw Password (optional)" value={form.withdrawPassword} onChange={handleChange} type="password" disabled={disabled} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || disabled}>{loading ? (mode === 'edit' ? 'Saving...' : 'Adding...') : (mode === 'edit' ? 'Save' : 'Add Account')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawAccountForm; 