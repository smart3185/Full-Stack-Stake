import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Casino from "./pages/Casino";
import Sportsbook from "./pages/Sportsbook";
import Wallet from "./pages/Wallet";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AccountStatement from "./pages/AccountStatement";
import { Navigation } from "@/components/Navigation";
import { useState, useEffect, useRef } from "react";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import { API_BASE } from '@/lib/utils';
import  AdminNavigation  from "@/components/AdminNavigation";
import AdminLogin from "./pages/admin/AdminLogin";
import DepositRequests from "./pages/admin/DepositRequests";
import WithdrawalRequests from "./pages/admin/WithdrawalRequests";
import QRSettings from "./pages/admin/QRSettings";
import GameMode from "./pages/admin/GameMode";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalyticsDashboard from "./pages/admin/AdminAnalyticsDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Support from "./pages/Support";
import AdminSupportMessages from "./pages/admin/AdminSupportMessages";
import Maintenance from "./pages/Maintenance";
import AwaitingBonus from './pages/awaiting-bonus';
import MinesAutoMode from './pages/MinesAutoMode';
import Banner from "@/components/Banner";
import { BannerProvider } from "@/components/BannerContext";
import DepositWithdrawHeader from "@/components/DepositWithdrawHeader";
import WhatsAppSupport from "@/components/WhatsAppSupport";

function useAutoLogout() {
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    window.location.href = '/auth';
  };

  useEffect(() => {
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };
    // Listen to user activity
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('mousedown', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);
    // Set initial activity
    updateActivity();
    // Check inactivity every 30 seconds
    const interval = setInterval(() => {
      const last = parseInt(localStorage.getItem('lastActivity') || '0', 10);
      if (last && Date.now() - last > 60 * 60 * 1000) {
        logout();
      }
    }, 30000);
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('mousedown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(interval);
    };
  }, []);

  // Intercept fetch to auto-logout on 401
  useEffect(() => {
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await origFetch(...args);
      if (response.status === 401) {
        logout();
      }
      return response;
    };
    return () => {
      window.fetch = origFetch;
    };
  }, []);
}

function Layout() {
  useAutoLogout();
  const [balance, setBalance] = useState<number>(0);
  const [maintenance, setMaintenance] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Expose setBalance globally for Auth login callback
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.__setLayoutBalance = setBalance;
  }

  useEffect(() => {
    // Try to get balance from localStorage first
    const stored = localStorage.getItem("balance");
    if (stored) setBalance(Number(stored));
    // Optionally, fetch from API for real-time accuracy
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_BASE}/api/user/balance`, {
        headers: { Authorization: `Bearer ${token}` },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setBalance(data.balance);
        })
        .catch((err) => {
          console.error('Error fetching balance in App.tsx:', err);
          
          // Handle specific network errors
          if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
            console.log('Network error in App.tsx - server might be down or unreachable');
            return;
          }
          
          // Handle timeout errors
          if (err.name === 'AbortError') {
            console.log('Request timeout in App.tsx - server is slow or unreachable');
            return;
          }
          
          // For other errors, check if it's a network issue
          if (err instanceof TypeError) {
            console.log('Network connection issue detected in App.tsx');
            return;
          }
        });
    }
  }, []);

  useEffect(() => {
    // Check maintenance mode on mount and on route change
    const checkMaintenance = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/site-maintenance`);
        const data = await res.json();
        setMaintenance(data.siteMaintenance);
      } catch {
        setMaintenance(false);
      }
    };
    checkMaintenance();
  }, [location.pathname]);

  if (maintenance && !isAdminRoute) {
    return <Maintenance />;
  }

  return (
    <>
      {!isAdminRoute && <Navigation balance={balance} />}
      {!isAdminRoute && location.pathname !== '/auth' && location.pathname !== '/forgot-password' && <DepositWithdrawHeader />}
      <Outlet context={{ setBalance }} />
      {!isAdminRoute && location.pathname !== '/auth' && location.pathname !== '/forgot-password' && <WhatsAppSupport />}
    </>
  );
}

function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('adminToken');
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AdminLayout() {
  // Only show AdminNavigation if authenticated
  const isAuthenticated = typeof window !== 'undefined' && localStorage.getItem('adminToken');
  return (
    <>
      {isAuthenticated && <AdminNavigation />}
      <Outlet />
    </>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BannerProvider>
        <BrowserRouter>
          <Routes>
            {/* User layout and routes */}
            <Route element={<Layout />}>
              <Route path="/" element={<Casino />} />
              <Route path="/auth" element={<Auth onLoginSuccess={(bal) => {
                const event = new CustomEvent('balanceUpdate', { detail: bal });
                window.dispatchEvent(event);
              }} />} />
              <Route path="/casino" element={<Navigate to="/casino/slots" replace />} />
              <Route path="/casino/:game" element={<Casino />} />
              <Route path="/sportsbook" element={<Sportsbook />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/history" element={<Dashboard />} />
              <Route path="/account-statement" element={<AccountStatement />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/support" element={<Support />} />
              <Route path="/awaiting-bonus" element={<AwaitingBonus />} />
              <Route path="/mines-auto" element={<MinesAutoMode />} />
              {/* Admin layout and routes */}
              <Route path="/admin/*" element={<AdminLayout />}>
                <Route path="login" element={<AdminLogin />} />
                <Route
                  index
                  element={
                    <RequireAdminAuth>
                      <AdminDashboard />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="deposit-requests"
                  element={
                    <RequireAdminAuth>
                      <DepositRequests />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="withdrawal-requests"
                  element={
                    <RequireAdminAuth>
                      <WithdrawalRequests />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="qr-settings"
                  element={
                    <RequireAdminAuth>
                      <QRSettings />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="game-mode"
                  element={
                    <RequireAdminAuth>
                      <GameMode />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <RequireAdminAuth>
                      <AdminAnalyticsDashboard />
                    </RequireAdminAuth>
                  }
                />
                <Route
                  path="support-messages"
                  element={
                    <RequireAdminAuth>
                      <AdminSupportMessages />
                    </RequireAdminAuth>
                  }
                />
              </Route>
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BannerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Listen for balance updates from Auth
if (typeof window !== 'undefined') {
  window.addEventListener('balanceUpdate', (e: any) => {
    if (e.detail !== undefined) {
      // Find the Layout's setBalance and update
      // This is a workaround for prop drilling
      // In a real app, use context or a global store
      // @ts-ignore
      if (window.__setLayoutBalance) window.__setLayoutBalance(e.detail);
    }
  });
}

export default App;
