import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Mail, MessageCircle, Send, Phone, CheckCircle } from 'lucide-react';
import { API_BASE } from '@/lib/utils';

const SUPPORT_EMAIL = 'gv020@stmaryrajkot.org';
const WHATSAPP_LINK = 'https://wa.me/+12163153582?text=Hello! I need support with the casino games.';

const Support: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/support-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Failed to send message.');
        setLoading(false);
        return;
      }
      setLoading(false);
      setSent(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center p-2 sm:p-6 relative overflow-hidden">
      {/* Futuristic Glow & Animated Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-3xl animate-pulse-slow -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-yellow-400/10 rounded-full blur-2xl animate-pulse-glow" />
        <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-indigo-400/20 rounded-full blur-2xl animate-float" />
      </div>
      <Card className="relative z-10 w-full max-w-lg mx-auto glass-effect border-0 shadow-2xl backdrop-blur-xl bg-white/5">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-indigo-400 animate-fade-in">Support & Help Center</CardTitle>
          <p className="mt-2 text-purple-200 text-sm sm:text-base animate-fade-in-delay">We're here to help! Choose a way to reach us or fill out the form below.</p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-delay">
            <a 
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-400/20 to-green-600/20 text-green-300 font-semibold shadow hover:from-green-400/30 hover:to-green-600/30 transition-all duration-300 cursor-pointer"
            >
              <Phone className="w-5 h-5" /> WhatsApp Support
            </a>
          </div>
          <div className="relative animate-fade-in">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input name="name" placeholder="Your Name" value={form.name} onChange={handleChange} className="bg-white/10 text-white" required />
                <Input name="email" type="email" placeholder="Your Email" value={form.email} onChange={handleChange} className="bg-white/10 text-white" required />
              </div>
              <textarea name="message" placeholder="Describe your issue or question..." value={form.message} onChange={handleChange} className="w-full min-h-[100px] rounded-lg bg-white/10 text-white p-3 resize-none" required />
              {error && <div className="text-red-400 text-sm font-semibold text-center">{error}</div>}
              <Button type="submit" className="w-full bg-gradient-to-r from-yellow-400 to-purple-500 text-black font-bold text-lg py-3 flex items-center justify-center gap-2" disabled={loading || sent}>
                {sent ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Send className="w-5 h-5" />}
                {sent ? 'Message Sent!' : loading ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
            {sent && (
              <div className="mt-4 text-center text-green-400 font-semibold animate-fade-in">Thank you! Our team will get back to you soon.</div>
            )}
          </div>
          <div className="text-center text-xs text-purple-200/80 mt-4 animate-fade-in-delay">For urgent issues, email us directly or use WhatsApp for instant support.</div>
        </CardContent>
      </Card>
      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.6; } }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes fade-in { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 1.2s ease-out; }
        @keyframes fade-in-delay { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-delay { animation: fade-in-delay 2s ease-out 0.5s both; }
        .glass-effect { background: linear-gradient(120deg, rgba(255,255,255,0.08) 0%, rgba(147,51,234,0.08) 100%); box-shadow: 0 8px 32px 0 rgba(31,38,135,0.18); border-radius: 24px; border: 1.5px solid rgba(255,255,255,0.12); }
      `}</style>
    </div>
  );
};

export default Support; 