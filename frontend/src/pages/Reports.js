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
    </div>
  );
}
