import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const drawerLinks = [
  { path: '/admin/', label: 'Dashboard' },
  { path: '/admin/qr-settings', label: 'QR Settings' },
  { path: '/admin/game-mode', label: 'Game Mode' },
  { path: '/admin/analytics', label: 'Analytics' },
  { path: '/admin/support-messages', label: 'Support Messages' },
  // Add more as needed
];

const AdminNavigation = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Hide drawer links for deposit/withdrawal requests
  const isDepositOrWithdraw = location.pathname.includes('/admin/deposit-requests') || location.pathname.includes('/admin/withdrawal-requests');

  return (
    <nav className="w-full flex items-center justify-between px-2 py-2 bg-background border-b border-border/40 sticky top-0 z-50" style={{ minHeight: 56 }}>
      {/* Logo/Brand and Deposit/Withdraw links */}
      <div className="flex items-center gap-2">
        <Link to="/admin/" className="flex items-center gap-2 font-bold text-lg text-gold" style={{ textDecoration: 'none' }}>
          <img src="/logo192.png" alt="Admin" className="w-8 h-8" />
          <span>Admin Panel</span>
        </Link>
        <Link
          to="/admin/deposit-requests"
          className={`ml-2 px-3 py-1 rounded-lg font-semibold text-base transition-all ${location.pathname.includes('/admin/deposit-requests') ? 'bg-gold text-black' : 'bg-secondary/30 text-gold hover:bg-gold/20'}`}
        >
          Deposit Requests
        </Link>
        <Link
          to="/admin/withdrawal-requests"
          className={`ml-2 px-3 py-1 rounded-lg font-semibold text-base transition-all ${location.pathname.includes('/admin/withdrawal-requests') ? 'bg-gold text-black' : 'bg-secondary/30 text-gold hover:bg-gold/20'}`}
        >
          Withdrawal Requests
        </Link>
      </div>
      {/* Only show hamburger if not on deposit/withdrawal requests */}
      {!isDepositOrWithdraw && (
        <button
          className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-yellow-300 shadow-md ml-1"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="w-7 h-7 text-background" />
        </button>
      )}
      {/* Slide Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex">
          <div className="w-64 max-w-[80vw] bg-background h-full shadow-2xl flex flex-col p-4 animate-slide-in-left">
            <button
              className="self-end mb-4 text-2xl text-gold"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            >
              <X className="w-7 h-7" />
            </button>
            <nav className="flex flex-col gap-4 mt-2">
              {drawerLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-lg font-semibold px-3 py-2 rounded-xl ${location.pathname === link.path ? 'bg-gold/20 text-gold' : 'text-foreground hover:bg-gold/10'}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-1" onClick={() => setDrawerOpen(false)} />
        </div>
      )}
      <style>{`
        @keyframes slide-in-left {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.3s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </nav>
  );
};

export default AdminNavigation; 