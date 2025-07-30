import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE } from '@/lib/utils';

interface SupportMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: 'open' | 'closed';
  createdAt: string;
}

const AdminSupportMessages: React.FC = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/admin/support-messages`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to fetch messages.');
        setLoading(false);
        return;
      }
      setMessages(data.messages);
      setLoading(false);
    } catch (err) {
      setError('Network error.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleStatusChange = async (id: string, status: 'open' | 'closed') => {
    setUpdating(id);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/admin/support-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to update status.');
        setUpdating(null);
        return;
      }
      setMessages((msgs) => msgs.map((msg) => (msg._id === id ? { ...msg, status: data.message.status } : msg)));
      setUpdating(null);
    } catch (err) {
      setError('Network error.');
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-4 sm:p-8">
      <Card className="max-w-4xl mx-auto shadow-2xl bg-white/5 backdrop-blur-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-indigo-400">User Support Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-400 text-center mb-4">{error}</div>}
          {loading ? (
            <div className="text-center text-yellow-300 animate-pulse">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-purple-200">No support messages found.</div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg._id} className="bg-gradient-to-r from-slate-800/60 to-purple-900/60 rounded-xl p-4 shadow flex flex-col sm:flex-row sm:items-center gap-4 border border-purple-700/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4 text-yellow-300" />
                      <span className="font-semibold text-yellow-200">{msg.email}</span>
                      <Badge className={msg.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-300'}>{msg.status.toUpperCase()}</Badge>
                    </div>
                    <div className="text-white font-bold text-lg mb-1">{msg.name}</div>
                    <div className="text-purple-200 text-sm whitespace-pre-line mb-2">{msg.message}</div>
                    <div className="text-xs text-gray-400">{(msg.createdAt ?? 0).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[120px]">
                    {msg.status === 'open' ? (
                      <Button
                        variant="default"
                        className="bg-gradient-to-r from-green-400 to-green-600 text-white font-bold"
                        onClick={() => handleStatusChange(msg._id, 'closed')}
                        disabled={updating === msg._id}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Mark Closed
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="text-gray-400 border-gray-600"
                        onClick={() => handleStatusChange(msg._id, 'open')}
                        disabled={updating === msg._id}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSupportMessages; 