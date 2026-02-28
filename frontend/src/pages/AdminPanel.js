import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const formatAmount = (n) => `৳${Math.round(n || 0).toLocaleString()}`;

const timeSince = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'আজকে';
  if (days === 1) return 'গতকাল';
  if (days < 7) return `${days} দিন আগে`;
  if (days < 30) return `${Math.floor(days / 7)} সপ্তাহ আগে`;
  return `${Math.floor(days / 30)} মাস আগে`;
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Admin data load করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId, name, isBanned) => {
    setActionLoading(userId + '-ban');
    try {
      const { data } = await API.put(`/admin/users/${userId}/ban`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: data.isBanned } : u));
      toast.success(`${name} ${data.isBanned ? 'banned ✅' : 'unbanned ✅'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error হয়েছে');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId, name) => {
    setActionLoading(userId + '-del');
    try {
      await API.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers - 1 }));
      toast.success(`${name} deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error হয়েছে');
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="card">
      <div className="empty-state"><p>Loading admin panel...</p></div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1>🛡️ Admin Panel</h1>
        <button className="btn btn-outline btn-sm" onClick={loadData}>🔄 Refresh</button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="label">মোট User</div>
            <div className="value">{stats?.totalUsers || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="label">Active User</div>
            <div className="value">{stats?.activeUsers || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <div className="label">মোট Expense</div>
            <div className="value">{stats?.totalExpenses || 0}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="label">মোট Amount</div>
            <div className="value">{formatAmount(stats?.totalAmount)}</div>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Header */}
        <div className="card-header" style={{ padding: '16px 20px' }}>
          <h3>👤 User List ({filtered.length} জন)</h3>
          <input
            type="text"
            placeholder="🔍 নাম বা email খুঁজুন..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1.5px solid var(--border)', fontSize: 13,
              background: 'var(--input-bg)', color: 'var(--text)', width: 240
            }}
          />
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                {['User', 'Role', 'Join Date', 'Last Login', 'Expenses', 'Amount', 'Status', 'Action'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: 11,
                    color: 'var(--text-light)', textTransform: 'uppercase',
                    letterSpacing: 1, fontWeight: 600, whiteSpace: 'nowrap'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)' }}>
                    কোনো user পাওয়া যায়নি
                  </td>
                </tr>
              ) : filtered.map((u) => (
                <tr key={u._id} style={{
                  borderBottom: '1px solid var(--border)',
                  opacity: u.isBanned ? 0.6 : 1,
                  transition: 'background 0.15s'
                }}>
                  {/* User */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: u.isAdmin
                          ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                          : `hsl(${u.name.charCodeAt(0) * 7 % 360}, 55%, 45%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700, fontSize: 14
                      }}>
                        {u.name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {u.name}
                          {u.isAdmin && (
                            <span style={{ fontSize: 9, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                              ADMIN
                            </span>
                          )}
                          {u._id === user?._id && (
                            <span style={{ fontSize: 9, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '1px 5px', borderRadius: 3 }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 1 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${u.familyRole === 'owner' || u.familyRole === 'admin' ? 'badge-blue' : 'badge-green'}`}
                      style={{ fontSize: 11 }}>
                      {u.familyRole === 'none' ? '—' : u.familyRole}
                    </span>
                  </td>

                  {/* Join Date */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Last Login */}
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-light)', whiteSpace: 'nowrap' }}>
                    {timeSince(u.lastLogin)}
                  </td>

                  {/* Expense count */}
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span className="badge badge-blue" style={{ fontSize: 12 }}>{u.totalCount}</span>
                  </td>

                  {/* Amount */}
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--primary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {formatAmount(u.totalAmount)}
                  </td>

                  {/* Status */}
                  <td style={{ padding: '12px 16px' }}>
                    {u.isBanned ? (
                      <span className="badge badge-red" style={{ fontSize: 11 }}>Banned</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: 11 }}>Active</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px' }}>
                    {u.isAdmin || u._id === user?._id ? (
                      <span style={{ color: 'var(--text-light)', fontSize: 12 }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleBan(u._id, u.name, u.isBanned)}
                          disabled={actionLoading === u._id + '-ban'}
                          className={`btn btn-sm ${u.isBanned ? 'btn-outline' : 'btn-outline'}`}
                          style={{
                            fontSize: 11, padding: '4px 10px',
                            color: u.isBanned ? '#38a169' : '#e53e3e',
                            borderColor: u.isBanned ? '#38a169' : '#e53e3e'
                          }}
                        >
                          {actionLoading === u._id + '-ban' ? '...' : u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          disabled={actionLoading === u._id + '-del'}
                          className="btn btn-sm btn-danger"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-light)' }}>
          মোট {filtered.length} জন user • এই মাসে নতুন: {stats?.newUsersThisMonth || 0} জন
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h2>🗑️ User Delete করবেন?</h2>
            <p style={{ color: 'var(--text-light)', marginBottom: 8, fontSize: 14 }}>
              <strong>{confirmDelete.name}</strong> ({confirmDelete.email})
            </p>
            <p style={{ color: '#e53e3e', fontSize: 13, marginBottom: 20 }}>
              ⚠️ এই user এর সব {confirmDelete.totalCount} টা expense ও permanently delete হয়ে যাবে!
            </p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(confirmDelete._id, confirmDelete.name)}
                disabled={actionLoading === confirmDelete._id + '-del'}
              >
                {actionLoading === confirmDelete._id + '-del' ? 'Deleting...' : 'হ্যাঁ, Delete করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
