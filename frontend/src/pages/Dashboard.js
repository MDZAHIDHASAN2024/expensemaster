import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import API from '../utils/api';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const COLORS = [
  '#1a365d',
  '#2b6cb0',
  '#38a169',
  '#d69e2e',
  '#805ad5',
  '#e53e3e',
  '#319795',
  '#ed8936',
  '#667eea',
  '#f687b3',
  '#48bb78',
  '#a0aec0',
];

export default function Dashboard() {
  const [stats, setStats] = useState({ monthlyStats: [], categoryStats: [] });
  const [alerts, setAlerts] = useState([]);
  const [incomeStats, setIncomeStats] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    fetchIncomeStats();
  }, [year]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/expenses/stats?year=' + year);
      setStats(data);
    } catch (e) {}
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try {
      const { data } = await API.get('/budgets/alerts');
      setAlerts(data);
    } catch (e) {}
  };

  const fetchIncomeStats = async () => {
    try {
      const { data } = await API.get('/income/stats?year=' + year);
      setIncomeStats(data);
    } catch (e) {}
  };

  const monthlyData = MONTHS.map((name, i) => {
    const found = stats.monthlyStats.find((s) => s._id.month === i + 1);
    return { name, total: found?.total || 0 };
  });

  const totalYear = stats.monthlyStats.reduce((s, m) => s + m.total, 0);
  const totalIncome = incomeStats.reduce((s, m) => s + m.total, 0);
  const balance = totalIncome - totalYear;
  const avgMonth = totalYear / 12;
  const maxMonth = Math.max(...monthlyData.map((m) => m.total), 0);
  const maxMonthName =
    monthlyData.find((m) => m.total === maxMonth)?.name || '-';
  const years = [];
  for (let y = 2020; y <= new Date().getFullYear() + 1; y++) years.push(y);

  return (
    <div>
      <div className="page-header">
        <h1>📊 Dashboard V:0.01</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              fontSize: 13,
              background: 'var(--input-bg)',
              color: 'var(--text)',
            }}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <Link to="/expenses" className="btn btn-primary btn-sm">
            + Add Expense
          </Link>
        </div>
      </div>

      {/* Budget alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          {alerts.slice(0, 3).map((a, i) => (
            <div
              key={i}
              className={`alert ${a.isOver ? 'alert-danger' : 'alert-warning'}`}
            >
              <span>{a.isOver ? '🚨' : '⚠️'}</span>
              <div style={{ flex: 1 }}>
                <strong>{a.itemType}</strong>: ৳{a.spent.toLocaleString()} / ৳
                {a.limit.toLocaleString()} ({a.percentage}%)
                {a.isOver && (
                  <span className="badge badge-red" style={{ marginLeft: 8 }}>
                    Over Budget!
                  </span>
                )}
              </div>
              <Link
                to="/budget"
                style={{ fontSize: 12, color: 'inherit', fontWeight: 600 }}
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="label">Total Expense</div>
            <div className="value" style={{ color: '#e53e3e' }}>
              ৳{Math.round(totalYear).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-info">
            <div className="label">Total Income</div>
            <div className="value" style={{ color: '#38a169' }}>
              ৳{Math.round(totalIncome).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⚖️</div>
          <div className="stat-info">
            <div className="label">Balance</div>
            <div
              className="value"
              style={{ color: balance >= 0 ? '#38a169' : '#e53e3e' }}
            >
              {balance >= 0 ? '+' : ''}৳{Math.round(balance).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="label">Monthly Avg Expense</div>
            <div className="value">
              ৳{Math.round(avgMonth).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <h3>Monthly Expenses — {year}</h3>
          </div>
          {loading ? (
            <div className="empty-state">
              <p>Loading...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                  tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => [`৳${v.toLocaleString()}`, 'Amount']}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="total" fill="#2b6cb0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>By Category</h3>
          </div>
          {loading || stats.categoryStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🥧</div>
              <p>No data</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.categoryStats}
                  dataKey="total"
                  nameKey="_id"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={({ _id, percent }) =>
                    `${_id} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  fontSize={9}
                >
                  {stats.categoryStats.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => `৳${v.toLocaleString()}`}
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Top Spending Categories</h3>
          <Link
            to="/analytics"
            style={{
              fontSize: 13,
              color: 'var(--primary-light)',
              fontWeight: 600,
            }}
          >
            Full Analytics →
          </Link>
        </div>
        {stats.categoryStats.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>
              No data yet.{' '}
              <Link to="/expenses" style={{ color: 'var(--primary-light)' }}>
                Add expenses
              </Link>
            </p>
          </div>
        ) : (
          <div>
            {stats.categoryStats.slice(0, 8).map((cat, i) => {
              const pct = totalYear > 0 ? (cat.total / totalYear) * 100 : 0;
              return (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      flexWrap: 'wrap',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {cat._id}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      ৳{cat.total.toLocaleString()} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-bar"
                      style={{
                        background: COLORS[i % COLORS.length],
                        width: `${pct}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
