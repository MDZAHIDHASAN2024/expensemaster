import React, { useState } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

function Spinner({ text }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '40px 20px',
      }}
    >
      <div className="spinner" />
      <span style={{ color: 'var(--text-light)', fontSize: 14 }}>
        {text || 'Loading...'}
      </span>
    </div>
  );
}

export default function Reports() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    month: '',
    year: new Date().getFullYear().toString(),
    itemType: '',
  });
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewQty, setPreviewQty] = useState(0);

  // Yearly summary
  const [yearlyYear, setYearlyYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [yearlySummary, setYearlySummary] = useState([]);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyTotal, setYearlyTotal] = useState({ qty: 0, amount: 0 });

  React.useEffect(() => {
    API.get('/categories/types')
      .then((r) => setTypes(r.data))
      .catch(() => {});
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams();
    if (filters.startDate && filters.endDate) {
      p.set('startDate', filters.startDate);
      p.set('endDate', filters.endDate);
    } else {
      if (filters.month) p.set('month', filters.month);
      if (filters.year) p.set('year', filters.year);
    }
    if (filters.itemType) p.set('itemType', filters.itemType);
    return p.toString();
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/expenses?' + buildParams());
      setPreview(data.expenses);
      setPreviewTotal(data.total);
      setPreviewQty(data.totalQty || 0);
    } catch (err) {
      toast.error('Failed to load preview');
    }
    setLoading(false);
  };

  const exportFile = (type) => {
    try {
      const user = JSON.parse(localStorage.getItem('expenseUser') || '{}');
      const baseURL =
        process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const path = type === 'excel' ? 'reports/excel' : 'reports/pdf';
      const fullURL = `${baseURL}/${path}?${buildParams()}&token=${user.token}`;
      window.open(fullURL, '_blank');
      toast.success(type === 'excel' ? 'Excel exported!' : 'PDF exported!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  // Yearly summary load
  const loadYearlySummary = async () => {
    setYearlyLoading(true);
    try {
      const { data } = await API.get(
        '/reports/yearly-summary?year=' + yearlyYear,
      );
      setYearlySummary(data.rows || []);
      setYearlyTotal({
        qty: data.totalQty || 0,
        amount: data.totalAmount || 0,
      });
    } catch (err) {
      toast.error('Failed to load yearly summary');
    }
    setYearlyLoading(false);
  };

  const exportYearly = (type) => {
    try {
      const user = JSON.parse(localStorage.getItem('expenseUser') || '{}');
      const baseURL =
        process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const path =
        type === 'excel' ? 'reports/yearly-excel' : 'reports/yearly-pdf';
      const fullURL = `${baseURL}/${path}?year=${yearlyYear}&token=${user.token}`;
      window.open(fullURL, '_blank');
      toast.success(type === 'excel' ? 'Excel exported!' : 'PDF exported!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

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

  const formatDate = (d) => {
    const dt = new Date(d);
    return (
      dt.getDate().toString().padStart(2, '0') +
      '/' +
      (dt.getMonth() + 1).toString().padStart(2, '0') +
      '/' +
      dt.getFullYear()
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>📋 Expense Reports</h1>
      </div>

      {/* ── Filtered Report ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>
          🔍 Filter Report
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 14,
          }}
        >
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label>Month</label>
            <select
              value={filters.month}
              onChange={(e) =>
                setFilters({ ...filters, month: e.target.value })
              }
            >
              <option value="">All Months</option>
              {months.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.l}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            >
              {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Item Type</label>
            <select
              value={filters.itemType}
              onChange={(e) =>
                setFilters({ ...filters, itemType: e.target.value })
              }
            >
              <option value="">All Types</option>
              {types.map((t) => (
                <option key={t._id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div
          style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}
        >
          <button
            className="btn btn-primary"
            onClick={loadPreview}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-sm" />
                Loading...
              </>
            ) : (
              '👁️ Preview'
            )}
          </button>
          <button
            className="btn btn-success"
            onClick={() => exportFile('excel')}
          >
            📊 Export Excel
          </button>
          <button
            className="btn"
            style={{
              background: 'linear-gradient(135deg,#c53030,#e53e3e)',
              color: 'white',
            }}
            onClick={() => exportFile('pdf')}
          >
            📄 Export PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="card">
          <Spinner text="Loading preview..." />
        </div>
      )}

      {!loading && preview.length > 0 && (
        <>
          <div
            className="summary-bar"
            style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <span>
              <strong>{preview.length}</strong> records
            </span>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <span>
                Qty Total:{' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {previewQty.toLocaleString()}
                </strong>
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}
              >
                Total: ৳{previewTotal.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Month</th>
                  <th>Year</th>
                  <th>Item Type</th>
                  <th>Item Description</th>
                  <th>Unit</th>
                  <th>Qty</th>
                  <th>Amount (৳)</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((e, i) => (
                  <tr key={e._id}>
                    <td>{i + 1}</td>
                    <td>{formatDate(e.date)}</td>
                    <td>
                      {new Date(e.date).toLocaleString('default', {
                        month: 'short',
                      })}
                    </td>
                    <td>{new Date(e.date).getFullYear()}</td>
                    <td>
                      <span className="badge badge-blue">{e.itemType}</span>
                    </td>
                    <td>{e.itemDescription}</td>
                    <td>{e.unit || '-'}</td>
                    <td>{e.quantity}</td>
                    <td className="amount-cell">
                      ৳{e.amount.toLocaleString()}
                    </td>
                    <td style={{ color: 'var(--text-light)', fontSize: 12 }}>
                      {e.remarks || '-'}
                    </td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={7} style={{ textAlign: 'right' }}>
                    TOTAL
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {previewQty.toLocaleString()}
                  </td>
                  <td className="amount-cell">
                    ৳{previewTotal.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && preview.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>Set filters and click "Preview" to see data</p>
          </div>
        </div>
      )}

      {/* ── Yearly Summary ── */}
      <div className="card" style={{ marginTop: 28 }}>
        <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>
          📅 Yearly Item Summary
        </h3>
        <p
          style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 14 }}
        >
          Selected year এ কোন item কত qty ও কত amount খরচ হয়েছে
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Year</label>
            <select
              value={yearlyYear}
              onChange={(e) => setYearlyYear(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                fontSize: 13,
                background: 'var(--input-bg)',
                color: 'var(--text)',
              }}
            >
              {[2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={loadYearlySummary}
            disabled={yearlyLoading}
          >
            {yearlyLoading ? (
              <>
                <span className="spinner-sm" />
                Loading...
              </>
            ) : (
              '👁️ Preview'
            )}
          </button>
          <button
            className="btn btn-success"
            onClick={() => exportYearly('excel')}
            disabled={yearlyLoading}
          >
            📊 Export Excel
          </button>
          <button
            className="btn"
            style={{
              background: 'linear-gradient(135deg,#c53030,#e53e3e)',
              color: 'white',
            }}
            onClick={() => exportYearly('pdf')}
            disabled={yearlyLoading}
          >
            📄 Export PDF
          </button>
        </div>

        {yearlyLoading && <Spinner text="Loading yearly summary..." />}

        {!yearlyLoading && yearlySummary.length > 0 && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                margin: '16px 0 10px',
              }}
            >
              <span>
                <strong>{yearlySummary.length}</strong> items
              </span>
              <div style={{ display: 'flex', gap: 20 }}>
                <span>
                  Total Qty:{' '}
                  <strong style={{ color: 'var(--primary)' }}>
                    {yearlyTotal.qty.toLocaleString()}
                  </strong>
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--primary)',
                  }}
                >
                  Total: ৳{yearlyTotal.amount.toLocaleString()}
                </span>
              </div>
            </div>
            <div
              className="table-wrapper"
              style={{ boxShadow: 'none', padding: 0 }}
            >
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Type</th>
                    <th>Item Description</th>
                    <th style={{ textAlign: 'right' }}>Total Qty</th>
                    <th style={{ textAlign: 'right' }}>Total Amount (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlySummary.map((row, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>
                        <span className="badge badge-blue">{row.itemType}</span>
                      </td>
                      <td>{row.itemDescription}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.totalQty}
                      </td>
                      <td className="amount-cell">
                        ৳{row.totalAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3} style={{ textAlign: 'right' }}>
                      TOTAL
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: 'var(--primary)',
                      }}
                    >
                      {yearlyTotal.qty.toLocaleString()}
                    </td>
                    <td className="amount-cell">
                      ৳{yearlyTotal.amount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {!yearlyLoading && yearlySummary.length === 0 && (
          <div className="empty-state" style={{ marginTop: 20 }}>
            <div className="empty-icon">📅</div>
            <p>Year select করে Preview চাপুন</p>
          </div>
        )}
      </div>
    </div>
  );
}
