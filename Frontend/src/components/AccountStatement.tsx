import React, { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/utils';

interface AccountStatementProps {
  filterType?: string;
}

const AccountStatement: React.FC<AccountStatementProps> = ({ filterType }) => {
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/account-statement`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        let stmts = data.statements || [];
        // Filter for deposits: only show approved/credited
        stmts = stmts.filter((s: any) => {
          if (s.gameType === 'Deposit') {
            return s.transaction === 'Deposit Approved' || s.result === 'credit' || s.credit > 0;
          }
          // For withdrawals, only show if actually processed/approved (not just requested/pending)
          if (s.gameType === 'Withdrawal') {
            // Show if credit is negative (money debited), or if result is 'approved' or 'processed'
            return s.credit < 0 || s.result === 'approved' || s.result === 'processed';
          }
          // For other games, show as before
          return true;
        });
        if (filterType) {
          stmts = stmts.filter((s: any) => s.transaction === filterType);
        }
        setStatements(stmts);
        setLoading(false);
      });
  }, [filterType]);

  if (loading) return <div className="text-slate-400">Loading statement...</div>;
  if (!statements.length) return <div className="text-slate-400">No transactions yet.</div>;

  return (
    <div className="overflow-x-auto">
      <h3 className="text-xl font-bold text-yellow-200 mb-4">Account Statement</h3>
      <table className="min-w-full bg-slate-900 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-slate-800 text-yellow-300">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Balance</th>
          </tr>
        </thead>
        <tbody>
          {statements.map((s, i) => (
            <tr key={i} className="border-b border-slate-700 text-slate-200">
              <td className="px-3 py-2 text-xs">{new Date(s.date).toLocaleString()}</td>
              <td className="px-3 py-2">{s.transaction}</td>
              <td className={`px-3 py-2 font-bold ${s.credit > 0 ? 'text-green-400' : 'text-red-400'}`}>{s.credit > 0 ? '+' : ''}{s.credit}</td>
              <td className="px-3 py-2">
                {s.gameType === 'Deposit' && s.credit > 0 ? 'Profit' : s.credit > 0 ? 'Profit' : s.credit < 0 ? 'Loss' : (s.result ? (String(s.result).toLowerCase() === 'loss' && s.gameType === 'Deposit' && s.credit > 0 ? 'Profit' : s.result) : '-')}
              </td>
              <td className="px-3 py-2">{s.closeBalance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AccountStatement; 