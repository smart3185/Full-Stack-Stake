import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/utils";

const AdminDashboard = () => {
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      fetch(`${API_BASE}/api/admin/online-users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setOnlineUsers(data.count || 0));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/login";
  };

  return (
    <div className="max-w-xl mx-auto mt-16 p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl shadow-2xl text-center">
      <h2 className="text-3xl font-bold text-yellow-300 mb-6">Admin Dashboard</h2>
      <div className="mb-6">
        <span className="text-lg text-yellow-200 font-semibold">Current Online Users: </span>
        <span className="text-2xl text-green-400 font-bold">{onlineUsers !== null ? onlineUsers : "Loading..."}</span>
      </div>
      <Button onClick={handleLogout} className="bg-yellow-500 text-black font-bold px-8 py-3 rounded-lg">
        Logout
      </Button>
    </div>
  );
};

export default AdminDashboard; 