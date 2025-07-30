import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/utils';

const GameMode: React.FC = () => {
  const [volatilityMode, setVolatilityMode] = useState('normal');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  const [siteMaintenance, setSiteMaintenance] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetch(`${API_BASE}/api/admin/volatility-mode`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.mode) setVolatilityMode(data.mode);
      });
  }, [token, navigate]);

  useEffect(() => {
    // Fetch maintenance mode
    const fetchMaintenance = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE}/api/admin/site-maintenance`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setSiteMaintenance(data.siteMaintenance);
      } catch {}
    };
    fetchMaintenance();
  }, []);

  const handleModeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value;
    setVolatilityMode(newMode);
    setLoading(true);
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
    setLoading(false);
  };

  const handleMaintenanceToggle = async () => {
    setLoadingMaintenance(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/admin/site-maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ siteMaintenance: !siteMaintenance }),
      });
      const data = await res.json();
      if (data.success) setSiteMaintenance(data.siteMaintenance);
    } catch {}
    setLoadingMaintenance(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6 mt-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl">
      <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300 drop-shadow">Game Mode</h2>
      <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-yellow-400/30">
        <label className="text-yellow-200 font-semibold">Game Mode:</label>
        <select
          className="bg-slate-800 border border-yellow-400 text-white px-4 py-2 rounded"
          value={volatilityMode}
          onChange={handleModeChange}
          disabled={loading}
        >
          <option value="normal">Normal</option>
          <option value="mild">Mild</option>
          <option value="hard">Hard</option>
        </select>
        {loading && <span className="text-yellow-300 ml-2">Updating...</span>}
      </div>
      {/* Below game mode controls */}
      <div className="mt-8 p-4 bg-black/30 rounded-xl border border-purple-700/30 flex items-center gap-4">
        <span className="text-lg font-bold text-yellow-300">Site Maintenance Mode</span>
        <button
          onClick={handleMaintenanceToggle}
          className={`relative inline-flex items-center h-6 rounded-full w-12 transition-colors focus:outline-none ${siteMaintenance ? 'bg-red-500' : 'bg-green-500'}`}
          disabled={loadingMaintenance}
          aria-pressed={siteMaintenance}
        >
          <span
            className={`inline-block w-6 h-6 transform bg-white rounded-full shadow transition-transform ${siteMaintenance ? 'translate-x-6' : 'translate-x-0'}`}
          />
        </button>
        <span className={`ml-2 font-semibold ${siteMaintenance ? 'text-red-400' : 'text-green-400'}`}>{siteMaintenance ? 'ON' : 'OFF'}</span>
      </div>
    </div>
  );
};

export default GameMode; 