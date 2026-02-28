import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function Spinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '40px',
      }}
    >
      <div className="spinner" />
      <span style={{ color: 'var(--text-light)', fontSize: 14 }}>
        Loading...
      </span>
    </div>
  );
}

const ROLE_BADGES = {
  owner: 'badge-blue',
  admin: 'badge-yellow',
  member: 'badge-green',
  viewer: 'badge-red',
};
const fmtDate = (d) => {
  const dt = new Date(d);
  return (
    dt.getDate().toString().padStart(2, '0') +
    '/' +
    (dt.getMonth() + 1).toString().padStart(2, '0') +
    '/' +
    dt.getFullYear()
  );
};

export default function Family() {
  const { user, updateUser } = useAuth();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [memberExpenses, setMemberExpenses] = useState([]);
  const [memberExpTotal, setMemberExpTotal] = useState(0);
  const [memberExpQty, setMemberExpQty] = useState(0);
  const [expMembers, setExpMembers] = useState([]);
  const [expFilters, setExpFilters] = useState({
    month: '',
    year: new Date().getFullYear().toString(),
    memberId: '',
  });
  const [expLoading, setExpLoading] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);

  useEffect(() => {
    fetchFamily();
  }, []);

  const fetchFamily = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/family/mine');
      setFamily(data);
    } catch (e) {}
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.post('/family/create', { name: createName });
      setFamily(data);
      updateUser({ familyRole: 'owner' });
      toast.success('Family group created!');
      setShowCreate(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await API.post('/family/join', { code: joinCode.toUpperCase() });
      toast.success('Joined family!');
      fetchFamily();
      setShowJoin(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired code');
    }
  };

  const handleLeave = async () => {
    try {
      await API.post('/family/leave');
      setFamily(null);
      updateUser({ familyRole: null, family: null });
      toast.success('Left family group');
    } catch (e) {
      toast.error('Error');
    }
  };

  const generateInvite = async (role = 'member') => {
    try {
      const { data } = await API.post('/family/invite', { role });
      setInvite(data);
      toast.success('Invite code generated!');
    } catch (e) {
      toast.error('Error');
    }
  };

  const removeMember = async (userId, name) => {
    try {
      await API.delete('/family/member/' + userId);
      toast.success(name + ' removed');
      fetchFamily();
    } catch (e) {
      toast.error('Error');
    }
  };

  const updateMemberRole = async (userId, role) => {
    try {
      await API.put('/family/member/' + userId + '/role', { role });
      toast.success('Role updated');
      fetchFamily();
    } catch (e) {
      toast.error('Error');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const loadMemberExpenses = async () => {
    setExpLoading(true);
    try {
      const p = new URLSearchParams();
      if (expFilters.month) p.set('month', expFilters.month);
      if (expFilters.year) p.set('year', expFilters.year);
      if (expFilters.memberId) p.set('memberId', expFilters.memberId);
      const { data } = await API.get('/family/expenses?' + p);
      setMemberExpenses(data.expenses);
      setMemberExpTotal(data.total);
      setMemberExpQty(data.totalQty || 0);
      setExpMembers(data.members || []);
    } catch (e) {
      toast.error('Failed to load');
    }
    setExpLoading(false);
  };

  if (loading)
    return (
      <div className="card">
        <Spinner />
      </div>
    );

  if (!family) {
    return (
      <div>
        <div className="page-header">
          <h1>👨‍👩‍👧 Family Account</h1>
        </div>
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}
        >
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
            <h3 style={{ marginBottom: 8, color: 'var(--primary)' }}>
              Create Family Group
            </h3>
            <p
              style={{
                color: 'var(--text-light)',
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              Create a group and invite family members
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setShowCreate(true)}
            >
              Create Group
            </button>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
            <h3 style={{ marginBottom: 8, color: 'var(--primary)' }}>
              Join Family
            </h3>
            <p
              style={{
                color: 'var(--text-light)',
                marginBottom: 20,
                fontSize: 14,
              }}
            >
              Join an existing family group with invite code
            </p>
            <button
              className="btn btn-outline"
              onClick={() => setShowJoin(true)}
            >
              Join with Code
            </button>
          </div>
        </div>

        {showCreate && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreate(false);
            }}
          >
            <div className="modal" style={{ maxWidth: 400 }}>
              <h2>🏠 Create Family Group</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Group Name *</label>
                  <input
                    required
                    placeholder="e.g., Zahid Family"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showJoin && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowJoin(false);
            }}
          >
            <div className="modal" style={{ maxWidth: 400 }}>
              <h2>🔑 Join Family</h2>
              <form onSubmit={handleJoin}>
                <div className="form-group">
                  <label>Invite Code *</label>
                  <input
                    required
                    placeholder="e.g., A1B2C3D4"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    style={{ textTransform: 'uppercase', letterSpacing: 2 }}
                  />
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowJoin(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Join
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const role = user.familyRole;
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const canManage = isOwner || isAdmin;
  const canSeeOthers = isOwner || isAdmin;
  const months = [
    { v: '1', l: 'January' },
    { v: '2', l: 'February' },
    { v: '3', l: 'March' },
    { v: '4', l: 'April' },
    { v: '5', l: 'May' },
    { v: '6', l: 'June' },
    { v: '7', l: 'July' },
    { v: '8', l: 'August' },
    { v: '9', l: 'September' },
    { v: '10', l: 'October' },
    { v: '11', l: 'November' },
    { v: '12', l: 'December' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>👨‍👩‍👧 Family: {family.name}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <span
            className={'badge ' + (ROLE_BADGES[role] || 'badge-blue')}
            style={{ alignSelf: 'center', padding: '5px 12px', fontSize: 12 }}
          >
            My Role: {role?.toUpperCase()}
          </span>
          <button className="btn btn-danger btn-sm" onClick={handleLeave}>
            Leave Group
          </button>
        </div>
      </div>

      {invite && (
        <div className="alert alert-success" style={{ marginBottom: 18 }}>
          <span>✅</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Invite Code:{' '}
              <span style={{ letterSpacing: 3, fontSize: 20 }}>
                {invite.code}
              </span>
              <button
                onClick={() => copyCode(invite.code)}
                className="btn btn-sm btn-outline"
                style={{ marginLeft: 10 }}
              >
                Copy
              </button>
            </div>
            <div style={{ fontSize: 12 }}>
              Valid 24 hours. Expires:{' '}
              {new Date(invite.expiresAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canManage ? '2fr 1fr' : '1fr',
          gap: 18,
          marginBottom: 18,
        }}
      >
        <div className="card">
          <div className="card-header">
            <h3>👥 Members ({family.members?.length || 0})</h3>
          </div>
          {family.members?.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg,#1a365d,#2b6cb0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 17,
                  flexShrink: 0,
                }}
              >
                {m.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {m.user?.name || 'Unknown'}{' '}
                  {m.user?._id === family.owner?.toString() ||
                  m.role === 'owner'
                    ? '👑'
                    : ''}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  {m.user?.email}
                </div>
              </div>
              <span
                className={'badge ' + (ROLE_BADGES[m.role] || 'badge-blue')}
              >
                {m.role}
              </span>
              {isOwner && m.user?._id !== user._id && (
                <select
                  defaultValue={m.role}
                  onChange={(e) => updateMemberRole(m.user._id, e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              )}
              {canManage && m.user?._id !== user._id && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeMember(m.user._id, m.user.name)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {canManage && (
          <div className="card" style={{ height: 'fit-content' }}>
            <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>
              📨 Invite Member
            </h3>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-light)',
                marginBottom: 14,
              }}
            >
              Generate invite code (valid 24h)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => generateInvite('member')}
              >
                👤 Member Invite
              </button>
              {isOwner && (
                <button
                  className="btn btn-outline"
                  onClick={() => generateInvite('admin')}
                >
                  🔑 Admin Invite
                </button>
              )}
              <button
                className="btn btn-outline"
                onClick={() => generateInvite('viewer')}
              >
                👁️ Viewer Invite
              </button>
            </div>
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: 'var(--bg)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text-light)',
                lineHeight: 2,
              }}
            >
              <div>
                👑 <strong>Owner:</strong> Sees everyone's expenses
              </div>
              <div>
                🔑 <strong>Admin:</strong> Manages all but owner's
              </div>
              <div>
                👤 <strong>Member:</strong> Add/Edit/Delete own
              </div>
              <div>
                👁️ <strong>Viewer:</strong> Read-only
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Family Expenses View - Owner/Admin only */}
      {canSeeOthers && (
        <div className="card">
          <div className="card-header">
            <h3>📊 Family Expenses</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setShowExpenses(!showExpenses);
                if (!showExpenses) loadMemberExpenses();
              }}
            >
              {showExpenses ? 'Hide' : 'View Expenses'}
            </button>
          </div>

          {showExpenses && (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginBottom: 14,
                }}
              >
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    fontSize: 13,
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                  }}
                  value={expFilters.month}
                  onChange={(e) =>
                    setExpFilters({ ...expFilters, month: e.target.value })
                  }
                >
                  <option value="">All Months</option>
                  {months.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.l}
                    </option>
                  ))}
                </select>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    fontSize: 13,
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                  }}
                  value={expFilters.year}
                  onChange={(e) =>
                    setExpFilters({ ...expFilters, year: e.target.value })
                  }
                >
                  {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <select
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    fontSize: 13,
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                  }}
                  value={expFilters.memberId}
                  onChange={(e) =>
                    setExpFilters({ ...expFilters, memberId: e.target.value })
                  }
                >
                  <option value="">All Members</option>
                  {expMembers.length > 0
                    ? expMembers.map((m) => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name}
                        </option>
                      ))
                    : family.members?.map((m) => (
                        <option key={m.user?._id} value={m.user?._id}>
                          {m.user?.name}
                        </option>
                      ))}
                </select>
                <button
                  className="btn btn-primary"
                  onClick={loadMemberExpenses}
                >
                  🔍 Load
                </button>
              </div>

              {expLoading ? (
                <Spinner />
              ) : memberExpenses.length > 0 ? (
                <>
                  <div className="summary-bar" style={{ marginBottom: 14 }}>
                    <span>
                      <strong>{memberExpenses.length}</strong> records
                    </span>
                    <span>
                      Qty: <strong>{memberExpQty.toLocaleString()}</strong>
                    </span>
                    <span className="total">
                      ৳{memberExpTotal.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      overflowX: 'auto',
                      maxHeight: 400,
                      overflowY: 'auto',
                    }}
                  >
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Member</th>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Amount (৳)</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberExpenses.map((e, i) => (
                          <tr key={e._id}>
                            <td>{i + 1}</td>
                            <td>
                              <span className="badge badge-blue">
                                {e.user?.name || '-'}
                              </span>
                            </td>
                            <td>{fmtDate(e.date)}</td>
                            <td>
                              <span className="badge badge-green">
                                {e.itemType}
                              </span>
                            </td>
                            <td>{e.itemDescription}</td>
                            <td>{e.quantity}</td>
                            <td className="amount-cell">
                              ৳{e.amount.toLocaleString()}
                            </td>
                            <td
                              style={{
                                fontSize: 12,
                                color: 'var(--text-light)',
                              }}
                            >
                              {e.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td colSpan={5} style={{ textAlign: 'right' }}>
                            TOTAL
                          </td>
                          <td>{memberExpQty.toLocaleString()}</td>
                          <td className="amount-cell">
                            ৳{memberExpTotal.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <p>Click "Load" to view family expenses</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
