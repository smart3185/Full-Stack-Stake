import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '@/lib/utils';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
        localStorage.setItem('adminToken', data.token);
        toast.success('Admin login successful!');
        navigate('/admin', { replace: true });
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch {
      toast.error('Server error');
    }
    setLoading(false);
  };

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
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="text-lg font-bold"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <Button type="submit" className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-xl py-3" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
      </form>
    </div>
  );
};

export default AdminLogin; 