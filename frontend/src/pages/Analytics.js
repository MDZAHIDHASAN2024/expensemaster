import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import API from '../utils/api';
import toast from 'react-hot-toast';

const MONTHS_SHORT = [
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
];

function Spinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '50px',
      }}
    >
      <div className="spinner" />
      <span style={{ color: 'var(--text-light)', fontSize: 14 }}>
        Loading analytics...
      </span>
    </div>
  );
}

export default function Analytics() {
  const [tab, setTab] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [weekly, setWeekly] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [itemComp, setItemComp] = useState({});
  const [monthComp, setMonthComp] = useState([]);
  const [vsData, setVsData] = useState({
    monthly: [],
    totalExpense: 0,
    totalIncome: 0,
    balance: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tab, year, month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'weekly') {
        const { data } = await API.get(
          '/analytics/weekly?month=' + month + '&year=' + year,
        );
        setWeekly(data);
      } else if (tab === 'top') {
        const { data } = await API.get(
          '/analytics/top-items?month=' + month + '&year=' + year,
        );
        setTopItems(data);
      } else if (tab === 'comparison') {
        const { data } = await API.get(
          '/analytics/item-comparison?year=' + year,
        );
        setItemComp(data);
      } else if (tab === 'monthly') {
        const { data } = await API.get('/analytics/month-comparison');
        setMonthComp(data);
      } else if (tab === 'vs') {
        const { data } = await API.get(
          '/analytics/expense-vs-income?year=' + year,
        );
        setVsData(data);
      }
    } catch (e) {}
    setLoading(false);
  };

  // ── Export PDF — Reports.js এর মতো backend API call ──
  const handleExportPDF = () => {
    try {
      const user = JSON.parse(localStorage.getItem('expenseUser') || '{}');
      const baseURL =
        process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      window.open(
        `${baseURL}/analytics/expense-vs-income-pdf?year=${year}&token=${user.token}`,
        '_blank',
      );
      toast.success('PDF exported!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const months = [
    { v: 1, l: 'January' },
    { v: 2, l: 'February' },
    { v: 3, l: 'March' },
    { v: 4, l: 'April' },
    { v: 5, l: 'May' },
    { v: 6, l: 'June' },
    { v: 7, l: 'July' },
    { v: 8, l: 'August' },
    { v: 9, l: 'September' },
    { v: 10, l: 'October' },
    { v: 11, l: 'November' },
    { v: 12, l: 'December' },
  ];
  const compTypes = Object.keys(itemComp);

  const tabs = [
    { k: 'monthly', l: '📅 6-Month Trend' },
    { k: 'weekly', l: '📆 Weekly' },
    { k: 'top', l: '🏆 Top Items' },
    { k: 'comparison', l: '🔄 Category Compare' },
    { k: 'vs', l: '⚖️ Expense vs Income' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>📈 Analytics</h1>
      </div>

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.k}
            className={'tab ' + (tab === t.k ? 'active' : '')}
            onClick={() => setTab(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div
        style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}
      >
        {tab !== 'monthly' && (
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
            {[2022, 2023, 2024, 2025, 2026].map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        )}
        {(tab === 'weekly' || tab === 'top') && (
          <select
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              fontSize: 13,
              background: 'var(--input-bg)',
              color: 'var(--text)',
            }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m.v} value={m.v}>
                {m.l}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="card">
          <Spinner />
        </div>
      ) : null}

      {!loading && tab === 'monthly' && (
        <div className="card">
          <div className="card-header">
            <h3>Last 6 Months Spending Trend</h3>
          </div>
          {monthComp.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No data</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthComp}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: 'var(--text-light)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                    tickFormatter={(v) => '৳' + (v / 1000).toFixed(0) + 'k'}
                  />
                  <Tooltip
                    formatter={(v) => ['৳' + v.toLocaleString(), 'Amount']}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#2b6cb0"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#2b6cb0' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {monthComp.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-light)',
                        marginBottom: 4,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}
                    >
                      ৳{m.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {m.count} items
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && tab === 'weekly' && (
        <div className="card">
          <div className="card-header">
            <h3>Weekly Breakdown</h3>
          </div>
          {weekly.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📆</div>
              <p>No data</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                    tickFormatter={(v) => '৳' + (v / 1000).toFixed(0) + 'k'}
                  />
                  <Tooltip
                    formatter={(v) => ['৳' + v.toLocaleString(), 'Total']}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="total" fill="#2b6cb0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4,1fr)',
                  gap: 10,
                  marginTop: 16,
                }}
              >
                {weekly.map((w, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-light)',
                        marginBottom: 4,
                      }}
                    >
                      {w.label}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}
                    >
                      ৳{w.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {w.count} items
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!loading && tab === 'top' && (
        <div className="card">
          <div className="card-header">
            <h3>Top 10 Spending Items</h3>
          </div>
          {topItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <p>No data</p>
            </div>
          ) : (
            <div>
              {topItems.map((item, i) => {
                const max = topItems[0]?.total || 1;
                const pct = (item.total / max) * 100;
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 5,
                        flexWrap: 'wrap',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            background: 'var(--primary)',
                            color: 'white',
                            borderRadius: '50%',
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                          {item._id}
                        </span>
                        <span className="badge badge-blue">
                          {item.itemType}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--primary)',
                        }}
                      >
                        ৳{item.total.toLocaleString()}{' '}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 400,
                            color: 'var(--text-light)',
                          }}
                        >
                          ({item.count}x)
                        </span>
                      </span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div
                        className="progress-bar"
                        style={{
                          background: COLORS[i % COLORS.length],
                          width: pct + '%',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'comparison' && (
        <div className="card">
          <div className="card-header">
            <h3>Category × Month Comparison — {year}</h3>
          </div>
          {compTypes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔄</div>
              <p>No data</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    {MONTHS_SHORT.map((m) => (
                      <th key={m}>{m}</th>
                    ))}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {compTypes.map((type, i) => {
                    const rowTotal = Object.values(itemComp[type] || {}).reduce(
                      (s, v) => s + v,
                      0,
                    );
                    return (
                      <tr key={i}>
                        <td>
                          <span className="badge badge-blue">{type}</span>
                        </td>
                        {MONTHS_SHORT.map((_, mi) => (
                          <td
                            key={mi}
                            style={{ textAlign: 'right', fontSize: 12 }}
                          >
                            {itemComp[type]?.[mi + 1]
                              ? '৳' + itemComp[type][mi + 1].toLocaleString()
                              : '-'}
                          </td>
                        ))}
                        <td className="amount-cell">
                          ৳{rowTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'vs' && (
        <>
          {/* ── Summary Cards ── */}
          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <div className="stat-card" style={{ borderColor: '#e53e3e' }}>
              <div
                className="stat-icon"
                style={{ background: '#fff5f5', fontSize: 22 }}
              >
                💸
              </div>
              <div className="stat-info">
                <div className="label">Total Expense</div>
                <div className="value" style={{ color: '#e53e3e' }}>
                  ৳{vsData.totalExpense?.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="stat-card" style={{ borderColor: '#38a169' }}>
              <div
                className="stat-icon"
                style={{ background: '#f0fff4', fontSize: 22 }}
              >
                💵
              </div>
              <div className="stat-info">
                <div className="label">Total Income</div>
                <div className="value" style={{ color: '#38a169' }}>
                  ৳{vsData.totalIncome?.toLocaleString()}
                </div>
              </div>
            </div>
            <div
              className="stat-card"
              style={{
                borderColor: vsData.balance >= 0 ? '#38a169' : '#e53e3e',
              }}
            >
              <div
                className="stat-icon"
                style={{
                  background: vsData.balance >= 0 ? '#f0fff4' : '#fff5f5',
                  fontSize: 22,
                }}
              >
                ⚖️
              </div>
              <div className="stat-info">
                <div className="label">Balance</div>
                <div
                  className="value"
                  style={{ color: vsData.balance >= 0 ? '#38a169' : '#e53e3e' }}
                >
                  {vsData.balance >= 0 ? '+' : ''}৳
                  {vsData.balance?.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* ── Chart + Table Card ── */}
          <div className="card">
            <div className="card-header">
              <h3>⚖️ Expense vs Income — {year}</h3>
            </div>

            {vsData.monthly?.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚖️</div>
                <p>No data</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={vsData.monthly}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'var(--text-light)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-light)' }}
                      tickFormatter={(v) => '৳' + (v / 1000).toFixed(0) + 'k'}
                    />
                    <Tooltip
                      formatter={(v, n) => [
                        '৳' + v.toLocaleString(),
                        n === 'expense' ? 'Expense' : 'Income',
                      ]}
                      contentStyle={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#38a169"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="#e53e3e"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>

                {/* ── Export Button above table ── */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: 18,
                    marginBottom: 8,
                  }}
                >
                  <button
                    className="btn"
                    style={{
                      background: 'linear-gradient(135deg,#c53030,#e53e3e)',
                      color: 'white',
                    }}
                    onClick={handleExportPDF}
                    disabled={!vsData.monthly?.length}
                  >
                    📄 Export PDF
                  </button>
                </div>

                {/* ── Monthly Table ── */}
                <div
                  className="table-wrapper"
                  style={{ marginTop: 0, boxShadow: 'none' }}
                >
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Income (৳)</th>
                        <th>Expense (৳)</th>
                        <th>Balance (৳)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vsData.monthly?.map((row, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{row.name}</td>
                          <td style={{ color: '#38a169', fontWeight: 600 }}>
                            ৳{row.income?.toLocaleString()}
                          </td>
                          <td style={{ color: '#e53e3e', fontWeight: 600 }}>
                            ৳{row.expense?.toLocaleString()}
                          </td>
                          <td
                            style={{
                              fontWeight: 700,
                              color: row.balance >= 0 ? '#38a169' : '#e53e3e',
                            }}
                          >
                            {row.balance >= 0 ? '+' : ''}৳
                            {row.balance?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* ── Total Row ── */}
                    <tfoot>
                      <tr
                        style={{
                          background: 'var(--bg)',
                          borderTop: '2px solid var(--border)',
                        }}
                      >
                        <td
                          style={{
                            padding: '12px 14px',
                            fontWeight: 800,
                            color: 'var(--text)',
                            letterSpacing: 0.5,
                          }}
                        >
                          TOTAL
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            color: '#38a169',
                            fontWeight: 800,
                          }}
                        >
                          ৳{(vsData.totalIncome || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            color: '#e53e3e',
                            fontWeight: 800,
                          }}
                        >
                          ৳{(vsData.totalExpense || 0).toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: '12px 14px',
                            fontWeight: 800,
                            color:
                              (vsData.balance || 0) >= 0
                                ? '#38a169'
                                : '#e53e3e',
                          }}
                        >
                          {(vsData.balance || 0) >= 0 ? '+' : ''}৳
                          {(vsData.balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
