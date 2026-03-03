import React, { useState, useEffect, useCallback } from 'react';
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
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
        Loading...
      </span>
    </div>
  );
}

export default function NeedItemsAnalytics() {
  const [days, setDays] = useState(30);
  const [groupBy, setGroupBy] = useState('month');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDesc, setSelectedDesc] = useState('');
  const [data, setData] = useState([]);
  const [allTypes, setAllTypes] = useState([]);
  const [allDescs, setAllDescs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState('totalAmount');
  const [sortDir, setSortDir] = useState(-1);

  const [targets, setTargets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('needItemTargets') || '{}');
    } catch {
      return {};
    }
  });
  const [editingTarget, setEditingTarget] = useState('');
  const [targetInput, setTargetInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ groupBy, days });
      if (selectedType) params.append('itemType', selectedType);
      if (selectedDesc) params.append('itemDescription', selectedDesc);
      const { data: res } = await API.get(
        '/analytics/need-items?' + params.toString(),
      );
      setData(res.rows || []);
      setAllTypes(res.itemTypes || []);
      setAllDescs(res.itemDescs || []);
    } catch (e) {}
    setLoading(false);
  }, [groupBy, days, selectedType, selectedDesc]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDescs = selectedType
    ? allDescs
        .filter((d) => d.itemType === selectedType)
        .map((d) => d.description)
    : allDescs.map((d) => d.description);
  const uniqueDescs = [...new Set(filteredDescs)].sort();

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d * -1);
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
    return (av - bv) * sortDir;
  });

  const arrow = (key) =>
    sortKey === key ? (sortDir === -1 ? ' ▼' : ' ▲') : '';

  const periodLabel = (row) => {
    if (groupBy === 'month')
      return (MONTHS[row.period - 1] || row.period) + ' ' + (row.year || '');
    if (groupBy === 'week')
      return 'Wk ' + row.period + (row.year ? ' (' + row.year + ')' : '');
    if (groupBy === 'day') return DAYS[row.period - 1] || row.period;
    return row.period;
  };

  const fmtNum = (n) => {
    if (n === null || n === undefined) return '-';
    const f = parseFloat(n);
    if (isNaN(f)) return '-';
    return Number.isInteger(f)
      ? f.toString()
      : parseFloat(f.toFixed(3)).toString();
  };

  const saveTarget = (desc) => {
    const val = parseFloat(targetInput);
    if (isNaN(val) || val <= 0) {
      setEditingTarget('');
      return;
    }
    const updated = { ...targets, [desc]: val };
    setTargets(updated);
    localStorage.setItem('needItemTargets', JSON.stringify(updated));
    setEditingTarget('');
    setTargetInput('');
  };

  const removeTarget = (desc) => {
    const updated = { ...targets };
    delete updated[desc];
    setTargets(updated);
    localStorage.setItem('needItemTargets', JSON.stringify(updated));
  };

  // Summary totals
  const totalAmt = data.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalQtyS = data.reduce((s, r) => s + (r.totalQty || 0), 0);
  const totalCount = data.reduce((s, r) => s + (r.count || 0), 0);

  // Per day averages
  const avgPerDayAmt = days ? Math.round(totalAmt / days) : 0;
  const avgPerDayQty = days ? parseFloat((totalQtyS / days).toFixed(2)) : 0;

  const savingsSummary = (() => {
    let saved = 0,
      over = 0,
      hasTarget = false;
    data.forEach((row) => {
      const t = targets[row.itemDescription];
      if (!t) return;
      hasTarget = true;
      const diff = t - row.avgAmount;
      if (diff > 0) saved += diff;
      else over += Math.abs(diff);
    });
    return { saved, over, hasTarget };
  })();

  const btnStyle = (active) => ({
    padding: '7px 16px',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
    background: active ? 'var(--primary)' : 'var(--input-bg)',
    color: active ? 'white' : 'var(--text)',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.15s',
  });

  return (
    <div>
      <div className="page-header">
        <h1>🛒Item's Analytics</h1>
        <p style={{ color: 'var(--text-light)', fontSize: 13, marginTop: 4 }}>
          Item Type ও Description অনুযায়ী Qty ও Amount এর গড় বিশ্লেষণ
        </p>
      </div>

      {/* Summary Cards */}
      {!loading && data.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 18 }}>
          {/* মোট খরচ */}
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: '#ebf8ff', fontSize: 22 }}
            >
              💰
            </div>
            <div className="stat-info">
              <div className="label">মোট খরচ</div>
              <div className="value">৳{totalAmt.toLocaleString()}</div>
            </div>
          </div>

          {/* মোট Qty */}
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: '#f0fff4', fontSize: 22 }}
            >
              📦
            </div>
            <div className="stat-info">
              <div className="label">মোট Qty</div>
              <div className="value">{fmtNum(totalQtyS)}</div>
            </div>
          </div>

          {/* Avg Per Day (৳) — days এর উপর base করে */}
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: '#fefcbf', fontSize: 22 }}
            >
              📊
            </div>
            <div className="stat-info">
              <div className="label">Avg Per Day (৳)</div>
              <div className="value">৳{avgPerDayAmt.toLocaleString()}</div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-light)',
                  marginTop: 2,
                }}
              >
                শেষ {days} দিনের গড়
              </div>
            </div>
          </div>

          {/* Avg Per Day Qty — days এর উপর base করে */}
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{ background: '#e9d8fd', fontSize: 22 }}
            >
              📈
            </div>
            <div className="stat-info">
              <div className="label">Avg Per Day Qty</div>
              <div className="value">{avgPerDayQty.toLocaleString()}</div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-light)',
                  marginTop: 2,
                }}
              >
                শেষ {days} দিনের গড়
              </div>
            </div>
          </div>

          {/* লক্ষ্য তুলনায় */}
          {savingsSummary.hasTarget && (
            <div className="stat-card">
              <div
                className="stat-icon"
                style={{
                  background:
                    savingsSummary.saved >= savingsSummary.over
                      ? '#f0fff4'
                      : '#fff5f5',
                  fontSize: 22,
                }}
              >
                {savingsSummary.saved >= savingsSummary.over ? '🎯' : '⚠️'}
              </div>
              <div className="stat-info">
                <div className="label">লক্ষ্য তুলনায়</div>
                <div className="value" style={{ fontSize: 14 }}>
                  {savingsSummary.saved > 0 && (
                    <span
                      style={{
                        color: '#38a169',
                        display: 'block',
                        fontSize: 13,
                      }}
                    >
                      ✅ ৳{savingsSummary.saved.toLocaleString()} কম
                    </span>
                  )}
                  {savingsSummary.over > 0 && (
                    <span
                      style={{
                        color: '#e53e3e',
                        display: 'block',
                        fontSize: 13,
                      }}
                    >
                      ⬆ ৳{savingsSummary.over.toLocaleString()} বেশি
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div
          style={{
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          {/* Days filter — 7 দিন যোগ করা হয়েছে */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-light)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              সময়সীমা
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[7, 30, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  style={btnStyle(days === d)}
                >
                  {d} দিন
                </button>
              ))}
            </div>
          </div>

          {/* Item Type */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-light)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              ITEM TYPE
            </div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setSelectedDesc('');
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                fontSize: 13,
                background: 'var(--input-bg)',
                color: 'var(--text)',
                minWidth: 140,
              }}
            >
              <option value="">All Types</option>
              {allTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-light)',
                marginBottom: 6,
                fontWeight: 600,
              }}
            >
              DESCRIPTION
            </div>
            <select
              value={selectedDesc}
              onChange={(e) => setSelectedDesc(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                fontSize: 13,
                background: 'var(--input-bg)',
                color: 'var(--text)',
                minWidth: 160,
              }}
            >
              <option value="">All Descriptions</option>
              {uniqueDescs.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {(selectedType || selectedDesc) && (
            <button
              onClick={() => {
                setSelectedType('');
                setSelectedDesc('');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 12,
                cursor: 'pointer',
                border: '1.5px solid var(--border)',
                background: 'var(--input-bg)',
                color: 'var(--text-light)',
                marginTop: 18,
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h3>
            {groupBy === 'month' && '📅 মাসভিত্তিক'}
            {groupBy === 'week' && '📆 সপ্তাহভিত্তিক'}
            {groupBy === 'day' && '📅 দিনভিত্তিক'}
            {' — '}
            {selectedDesc || selectedType || 'সব Item'}
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'var(--text-light)',
                marginLeft: 8,
              }}
            >
              (শেষ {days} দিন)
            </span>
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
            Column click করে sort করুন
          </span>
        </div>

        {loading ? (
          <Spinner />
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>কোনো data নেই</p>
          </div>
        ) : (
          <div
            className="table-wrapper"
            style={{ boxShadow: 'none', padding: 0 }}
          >
            <table>
              <thead>
                <tr>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('period')}
                  >
                    Period{arrow('period')}
                  </th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('itemType')}
                  >
                    Type{arrow('itemType')}
                  </th>
                  <th
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleSort('itemDescription')}
                  >
                    Description{arrow('itemDescription')}
                  </th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => handleSort('totalQty')}
                  >
                    Total Qty{arrow('totalQty')}
                  </th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => handleSort('avgQty')}
                  >
                    Avg Qty{arrow('avgQty')}
                  </th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total (৳){arrow('totalAmount')}
                  </th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => handleSort('avgAmount')}
                  >
                    Avg Amt (৳){arrow('avgAmount')}
                  </th>
                  <th
                    style={{ cursor: 'pointer', textAlign: 'right' }}
                    onClick={() => handleSort('count')}
                  >
                    Count{arrow('count')}
                  </th>
                  <th style={{ textAlign: 'right' }}>Target (৳)</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const target = targets[row.itemDescription];
                  const diff = target ? target - row.avgAmount : null;
                  const isOver = diff !== null && diff < 0;
                  const isUnder = diff !== null && diff >= 0;
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {periodLabel(row)}
                      </td>
                      <td>
                        <span className="badge badge-blue">{row.itemType}</span>
                      </td>
                      <td
                        style={{
                          maxWidth: 180,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.itemDescription}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {fmtNum(row.totalQty)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: 'var(--text-light)',
                        }}
                      >
                        {fmtNum(row.avgQty)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: 'var(--primary)',
                        }}
                      >
                        ৳{(row.totalAmount || 0).toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: isOver
                            ? '#e53e3e'
                            : isUnder
                              ? '#38a169'
                              : 'var(--text-light)',
                          fontWeight: target ? 600 : 400,
                        }}
                      >
                        ৳{(row.avgAmount || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>{row.count}</td>

                      {/* লক্ষ্য cell */}
                      <td style={{ textAlign: 'right', minWidth: 120 }}>
                        {editingTarget === row.itemDescription + '_' + i ? (
                          <div
                            style={{
                              display: 'flex',
                              gap: 4,
                              justifyContent: 'flex-end',
                            }}
                          >
                            <input
                              type="number"
                              value={targetInput}
                              onChange={(e) => setTargetInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter')
                                  saveTarget(row.itemDescription);
                                if (e.key === 'Escape') setEditingTarget('');
                              }}
                              autoFocus
                              placeholder="৳"
                              style={{
                                width: 80,
                                padding: '3px 6px',
                                borderRadius: 6,
                                border: '1.5px solid var(--primary)',
                                fontSize: 12,
                                background: 'var(--input-bg)',
                                color: 'var(--text)',
                              }}
                            />
                            <button
                              onClick={() => saveTarget(row.itemDescription)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingTarget('')}
                              style={{
                                padding: '3px 7px',
                                borderRadius: 6,
                                background: 'var(--border)',
                                color: 'var(--text)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 11,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              gap: 4,
                              justifyContent: 'flex-end',
                              alignItems: 'center',
                            }}
                          >
                            {target ? (
                              <>
                                <span
                                  style={{ fontWeight: 600, color: '#805ad5' }}
                                >
                                  ৳{target.toLocaleString()}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingTarget(
                                      row.itemDescription + '_' + i,
                                    );
                                    setTargetInput(target.toString());
                                  }}
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: 5,
                                    background: 'none',
                                    border: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    color: 'var(--text-light)',
                                  }}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() =>
                                    removeTarget(row.itemDescription)
                                  }
                                  style={{
                                    padding: '2px 6px',
                                    borderRadius: 5,
                                    background: 'none',
                                    border: '1px solid #fed7d7',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    color: '#e53e3e',
                                  }}
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingTarget(
                                    row.itemDescription + '_' + i,
                                  );
                                  setTargetInput('');
                                }}
                                style={{
                                  padding: '3px 10px',
                                  borderRadius: 6,
                                  background: 'none',
                                  border: '1.5px dashed var(--border)',
                                  cursor: 'pointer',
                                  fontSize: 11,
                                  color: 'var(--text-light)',
                                }}
                              >
                                + Set
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* অবস্থা cell */}
                      <td style={{ textAlign: 'right' }}>
                        {target && diff !== null ? (
                          isOver ? (
                            <div>
                              <span
                                style={{
                                  background: '#fff5f5',
                                  color: '#e53e3e',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: 'block',
                                }}
                              >
                                ⬆ বেশি
                              </span>
                              <span style={{ fontSize: 10, color: '#e53e3e' }}>
                                ৳{Math.abs(diff).toLocaleString()} বাড়তি
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span
                                style={{
                                  background: '#f0fff4',
                                  color: '#38a169',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  display: 'block',
                                }}
                              >
                                ✓ লক্ষ্যে
                              </span>
                              <span style={{ fontSize: 10, color: '#38a169' }}>
                                ৳{Math.abs(diff).toLocaleString()} কম
                              </span>
                            </div>
                          )
                        ) : (
                          <span
                            style={{ color: 'var(--text-light)', fontSize: 11 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
