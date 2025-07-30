import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const DepositWithdrawHeader = () => {
  const location = useLocation();
  return (
    <div className="w-full flex justify-center items-center gap-2 py-2 bg-background border-b border-border/30 sticky top-[60px] z-40">
      <Link
        to="/deposit"
        className={`flex-1 max-w-[110px] text-center py-2 rounded-lg font-bold text-base transition-all shadow ${location.pathname === '/deposit' ? 'bg-gold text-black' : 'bg-secondary/30 text-gold hover:bg-gold/20'}`}
        style={{ minWidth: 90 }}
      >
        Deposit
      </Link>
      <Link
        to="/withdraw"
        className={`flex-1 max-w-[110px] text-center py-2 rounded-lg font-bold text-base transition-all shadow ${location.pathname === '/withdraw' ? 'bg-gold text-black' : 'bg-secondary/30 text-gold hover:bg-gold/20'}`}
        style={{ minWidth: 90 }}
      >
        Withdrawal
      </Link>
    </div>
  );
};

export default DepositWithdrawHeader; 