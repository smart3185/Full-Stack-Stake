import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/utils';

const QRSettings: React.FC = () => {
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [adminUtr, setAdminUtr] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetch(`${API_BASE}/api/deposit-settings`)
      .then(res => res.json())
      .then(data => setAdminSettings(data.settings));
  }, [token, navigate]);

  const handleUploadSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUtr && !qrFile) {
      toast.error('Enter UTR or upload QR');
      return;
    }
    setLoading(true);
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
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 mt-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300 drop-shadow">QR Settings</h2>
      <form onSubmit={handleUploadSettings} className="flex flex-col md:flex-row gap-4 items-center mb-4 bg-slate-800 p-4 rounded-xl border border-yellow-400/30">
        <div>
          <label className="block text-yellow-200 font-semibold mb-1">Upload QR Code</label>
          <input type="file" accept="image/*" onChange={e => setQrFile(e.target.files?.[0] || null)} />
        </div>
        <div>
          <label className="block text-yellow-200 font-semibold mb-1">Set Wallet UTR</label>
          <Input value={adminUtr} onChange={e => setAdminUtr(e.target.value)} placeholder="Enter UTR" />
        </div>
        <Button type="submit" className="bg-yellow-500 text-black font-bold" disabled={loading}>{loading ? 'Updating...' : 'Update Settings'}</Button>
        {adminSettings && adminSettings.qrImage && (
          <img src={adminSettings.qrImage} alt="Current QR" className="w-24 h-24 object-contain border border-yellow-400 rounded-lg ml-4" />
        )}
        {adminSettings && adminSettings.utr && (
          <div className="text-yellow-200 font-semibold ml-4">Current UTR: <span className="text-white">{adminSettings.utr}</span></div>
        )}
      </form>
    </div>
  );
};

export default QRSettings; 