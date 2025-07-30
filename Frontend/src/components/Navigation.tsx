import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Link, useLocation, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  X,
  Dice6,
  Wallet,
  User,
  LogOut,
  Crown,
  CreditCard,
  History,
  LifeBuoy,
  Gift,
  Target,
} from "lucide-react";

export const Navigation = ({ balance }: { balance: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const textRef = useRef<HTMLSpanElement>(null);
  const [barWidth, setBarWidth] = useState<number>(0);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useLayoutEffect(() => {
    if (textRef.current) {
      setBarWidth(textRef.current.offsetWidth);
    }
  }, []);

  const navItems = [
    { path: "/", label: "Home", icon: Crown },
    { path: "/account-statement", label: "History", icon: History },
    { path: "/deposit", label: "Deposit", icon: CreditCard },
    { path: "/withdraw", label: "Withdraw", icon: CreditCard },
    { path: "/awaiting-bonus", label: "Awaiting Bonus", icon: Gift },
    { path: "/support", label: "Support", icon: LifeBuoy },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("balance");
    setIsAuthenticated(false);
    setUser(null);
    window.location.href = "/auth";
  };

  return (
    <nav className="bg-card/95 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
      <div className="max-w-7xl pl-0 px-0">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Brand */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gold rounded-lg flex items-center justify-center animate-glow">
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
            </Link>
            {/* Golden Bar Brand */}
            <div className="hidden sm:block mr-[15px]">
              <div className="relative flex items-center my-1">
                <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 rounded-lg shadow-lg" style={{ zIndex: 0, width: barWidth ? `${barWidth + 16}px` : 'auto', minWidth: 0, maxWidth: '100%' }}></span>
                <span ref={textRef} className="relative z-10 text-xl md:text-xl font-bold px-4 md:px-8 py-1 md:py-2 tracking-widest font-serif" style={{ letterSpacing: '0.12em', fontFamily: "serif, Georgia, Times, 'Times New Roman', cursive", textAlign: 'center', whiteSpace: 'nowrap', color: 'black', fontSize: 'clamp(1rem, 4vw, 1.25rem)' }}>
                  ROYAL BET
                </span>
              </div>
            </div>
            <div className="block sm:hidden ml-2">
              <div className="relative flex items-center my-1">
                <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 rounded-lg shadow-lg" style={{ zIndex: 0, width: barWidth ? `${barWidth + 16}px` : 'auto', minWidth: 0, maxWidth: '100%' }}></span>
                <span className="relative z-10 text-base font-bold px-2 py-1 tracking-widest font-serif" style={{ letterSpacing: '0.10em', fontFamily: "serif, Georgia, Times, 'Times New Roman', cursive", textAlign: 'center', whiteSpace: 'nowrap', color: 'black', fontSize: 'clamp(0.9rem, 4vw, 1.1rem)' }}>
                  ROYAL BET
                </span>
              </div>
            </div>
          </div>
          {/* Mobile balance display (right of logo/brand, left of menu on mobile) */}
          <div className="flex-1 flex justify-end items-center sm:hidden">
            {isAuthenticated && (
              <div className="flex items-center space-x-2 px-4 py-2 bg-secondary/50 rounded-lg mr-2">
                <Wallet className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-yellow-300" id="mobile-nav-balance">
                  ₹{(balance ?? 0).toLocaleString()}
                </span>
              </div>
            )}
            {/* Mobile menu button (rightmost on mobile) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="focus:outline-none"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "text-gold border-b-2 border-gold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`
                  }
                  end={item.path === "/"}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
          {/* User Actions (desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && (
              <>
                <div className="flex items-center space-x-2 px-4 py-2 bg-secondary/50 rounded-lg">
                  <Wallet className="w-4 h-4 text-gold" />
                  <span className="text-sm font-medium" id="nav-balance">
                    ₹{(balance ?? 0).toLocaleString()}
                  </span>
                </div>
                <span className="bg-slate-800 text-yellow-200 px-3 py-1 rounded">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
            {!isAuthenticated && (
              <Button variant="outline" asChild>
                <Link to="/auth">
                  <User className="w-4 h-4 mr-2" />
                  Login
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-card/95 shadow-2xl rounded-b-2xl border-t border-border/50 z-50 animate-fade-in-down">
          <div className="px-4 pt-4 pb-6 space-y-2 flex flex-col items-center">
            {/* User Info and Balance */}
            {isAuthenticated && (
              <div className="flex flex-col items-center gap-2 w-full mb-2">
                <div className="flex flex-col items-center gap-1 w-full">
                  <span className="text-lg font-bold text-yellow-300">Balance</span>
                  <span className="text-2xl font-extrabold text-green-400" id="mobile-nav-balance">
                    ₹{(balance ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/30 rounded-lg w-full justify-center">
                  <Wallet className="w-4 h-4 text-gold" />
                </div>
                <span className="bg-slate-800 text-yellow-200 px-3 py-1 rounded text-sm">{user?.email}</span>
              </div>
            )}
            {/* Navigation Items */}
            <div className="flex flex-col gap-2 w-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium w-full transition-colors ${
                        isActive
                          ? "text-gold bg-secondary/50"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      }`
                    }
                    onClick={() => setIsOpen(false)}
                    end={item.path === "/"}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            {/* Auth Button */}
            <div className="w-full pt-2 border-t border-border/50 mt-2">
              {isAuthenticated ? (
                <Button onClick={handleLogout} className="w-full py-3 h-12 mt-2" variant="outline">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Button asChild className="w-full py-3 h-12 mt-2">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <User className="w-4 h-4 mr-2" />
                    Login / Sign Up
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
