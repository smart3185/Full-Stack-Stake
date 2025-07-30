import React, { useEffect, useState } from "react";
import Table from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const API = "https://stake-ny3s.onrender.com/api/admin";

const AdminAnalyticsDashboard = () => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userStatement, setUserStatement] = useState<any[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineLoading, setOnlineLoading] = useState(true);

  // Fetch today's profit/loss summary
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/today-profit-loss-summary`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSummary(data.summary);
        else toast.error("Failed to load summary");
        setLoading(false);
      });
  }, []);

  // Fetch online users (poll every 10s)
  useEffect(() => {
    const fetchOnline = () => {
      setOnlineLoading(true);
      fetch(`${API}/online-users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setOnlineUsers(data.users);
          else toast.error("Failed to load online users");
          setOnlineLoading(false);
        });
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch user statement for today
  const openUserStatement = (user: any) => {
    setSelectedUser(user);
    setStatementLoading(true);
    fetch(`${API}/user-today-statement/${user.userId || user._id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUserStatement(data.statements);
        else toast.error("Failed to load user statement");
        setStatementLoading(false);
      });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-8">
      {/* Profit & Loss Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Profit & Loss Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Total Bet</th>
                  <th>Total Winnings</th>
                  <th>Net P/L</th>
                  <th>Status</th>
                  <th>Games Played</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((user: any) => (
                  <tr
                    key={user._id}
                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => openUserStatement(user)}
                  >
                    <td>{user.username || "-"}</td>
                    <td>{user.email}</td>
                    <td>₹{user.totalBets}</td>
                    <td>₹{user.totalWins}</td>
                    <td className={user.netResult >= 0 ? "text-green-600 whitespace-nowrap min-w-[90px] font-bold" : "text-red-600 whitespace-nowrap min-w-[90px] font-bold"}>
                      ₹{user.netResult}
                    </td>
                    <td>{user.status}</td>
                    <td>{user.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Online Users */}
      <Card>
        <CardHeader>
          <CardTitle>Current Online Players</CardTitle>
        </CardHeader>
        <CardContent>
          {onlineLoading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Current Game</th>
                  <th>Login Time</th>
                  <th>Last Active</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {onlineUsers.map((user: any, i: number) => (
                  <tr key={user.userId || user.email || i}>
                    <td>{user.username || "-"}</td>
                    <td>{user.email}</td>
                    <td>{user.currentGame || "-"}</td>
                    <td>{user.loginTime ? (user.loginTime ?? 0).toLocaleString() : "-"}</td>
                    <td>{user.lastActive ? (user.lastActive ?? 0).toLocaleTimeString() : "-"}</td>
                    <td>{user.ip || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Statement Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>
            {selectedUser ? `Today's Statement for ${selectedUser.username || selectedUser.email}` : "User Statement"}
          </DialogTitle>
          {statementLoading ? (
            <div>Loading...</div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Bet</th>
                  <th>Result</th>
                  <th>Payout</th>
                  <th>Date & Time</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {userStatement.map((s: any, i: number) => (
                  <tr key={i}>
                    <td>{s.gameType || '-'}</td>
                    <td>₹{s.betAmount}</td>
                    <td>{s.result}</td>
                    <td>₹{s.payout}</td>
                    <td>{s.date ? (s.date ?? 0).toLocaleString() : '-'}</td>
                    <td>₹{s.closeBalance}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnalyticsDashboard; 