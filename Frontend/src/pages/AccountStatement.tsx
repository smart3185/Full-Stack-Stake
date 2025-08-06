import React, { useEffect, useState } from 'react';

const API_BASE = 'https://full-stack-stake.onrender.com';

const AccountStatement: React.FC = () => {
  const [statements, setStatements] = useState<any[]>([]);
  const [gameType, setGameType] = useState('All');
  const [result, setResult] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchStatements = async () => {
    setLoading(true);
    let url = `${API_BASE}/api/account-statement?gameType=${gameType}&result=${result}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    const data = await res.json();
    if (data.success) setStatements(data.statements);
    setLoading(false);
  };

  useEffect(() => { fetchStatements(); }, [gameType, result]);

  return (
    <div className="max-w-5xl mx-auto p-6 mt-8 bg-gradient-to-br from-[#1a1f2b] via-[#2e3a2f] to-[#1a1f2b] rounded-2xl shadow-2xl border-4 border-gold/30">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h2 className="text-3xl font-extrabold text-gold drop-shadow flex items-center gap-2">
          <span className="text-4xl">📜</span> Account Statement
        </h2>
        <div className="flex gap-4 items-center">
          <label className="text-gold font-bold">Game</label>
          <select value={gameType} onChange={e => setGameType(e.target.value)} className="rounded px-3 py-2 bg-black/80 text-gold border-gold/40">
            <option value="All">All</option>
            <option value="Aviator">Aviator</option>
            <option value="Dice">Dice</option>
            <option value="Slots">Slots</option>
            <option value="CoinFlip">CoinFlip</option>
          </select>
          <label className="text-gold font-bold ml-2">Result</label>
          <select value={result} onChange={e => setResult(e.target.value)} className="rounded px-3 py-2 bg-black/80 text-gold border-gold/40">
            <option value="All">All</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gold/20 bg-black/60">
        <table className="min-w-full text-white border-separate border-spacing-y-2">
          <thead>
            <tr className="bg-gold/10 text-gold text-lg">
              <th className="px-4 py-3">Date/Time</th>
              <th className="px-4 py-3">Game</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><span className="animate-spin text-3xl">🎲</span> Loading...</td></tr>
            ) : statements.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gold/80 text-xl">No records found. Play a game to see your statement!</td></tr>
            ) : (
              statements.map((s, idx) => (
                <tr key={idx} className="bg-gradient-to-r from-black/80 to-slate-900/80 rounded-xl shadow-lg">
                  <td className="px-4 py-3 font-mono text-base">{(s.date ?? new Date()).toLocaleString()}</td>
                  <td className="px-4 py-3 font-bold text-lg">
                    {s.gameType === 'Aviator' && <span className="text-pink-400">✈️ Aviator</span>}
                    {s.gameType === 'Dice' && <span className="text-green-400">🎲 Dice</span>}
                    {s.gameType === 'Slots' && <span className="text-purple-400">🎰 Slots</span>}
                    {s.gameType === 'CoinFlip' && <span className="text-yellow-300">🪙 CoinFlip</span>}
                    {s.gameType === 'Mines' && <span className="text-orange-400">💣 Mines</span>}
                    {s.gameType === 'Deposit' && <span className="text-blue-400">💸 Deposit</span>}
                    {s.gameType === 'Withdrawal' && <span className="text-red-400">🏦 Withdrawal</span>}
                    {!['Aviator','Dice','Slots','CoinFlip','Mines','Deposit','Withdrawal'].includes(s.gameType) && s.gameType && <span className="text-gray-300">{s.gameType}</span>}
                  </td>
                  <td className={`px-4 py-3 font-bold text-lg ${s.result === 'win' || s.result === 'profit' ? 'text-casino-green' : 'text-casino-red'}`}>{s.result === 'profit' ? 'Profit' : s.result === 'win' ? 'Win' : 'Loss'}</td>
                  <td className={`px-4 py-3 font-bold text-lg ${s.credit > 0 ? 'text-casino-green' : 'text-casino-red'}`}>{s.credit > 0 ? '+' : ''}{(s.credit ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-base text-gold">{(s.closeBalance ?? 0).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AccountStatement; 