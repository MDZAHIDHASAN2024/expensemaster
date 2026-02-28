import React, { useState, useEffect, useMemo } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 20;
const currentDate = () => new Date().toISOString().split('T')[0];

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, padding:'50px 20px' }}>
      <div className="spinner" />
      <span style={{ color:'var(--text-light)', fontSize:14 }}>Loading income...</span>
    </div>
  );
}

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [incomeTypes, setIncomeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ startDate:'', endDate:'', month:'', year:new Date().getFullYear().toString(), incomeType:'' });
  const [form, setForm] = useState({ date:currentDate(), incomeType:'', description:'', quantity:1, amount:'', remarks:'' });

  useEffect(() => { fetchIncomeTypes(); fetchIncomes(); }, []);

  const fetchIncomeTypes = async () => {
    try { const { data } = await API.get('/categories/income-types'); setIncomeTypes(data); } catch(e) {}
  };

  const fetchIncomes = async (f = filters) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (f.startDate && f.endDate) { p.set('startDate', f.startDate); p.set('endDate', f.endDate); }
      else { if (f.month) p.set('month', f.month); if (f.year) p.set('year', f.year); }
      if (f.incomeType) p.set('incomeType', f.incomeType);
      const { data } = await API.get('/income?' + p);
      setIncomes(data.incomes); setTotal(data.total); setTotalQty(data.totalQty || 0); setPage(1);
    } catch(e) {}
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search) return incomes;
    const q = search.toLowerCase();
    return incomes.filter(i => i.incomeType?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.remarks?.toLowerCase().includes(q));
  }, [incomes, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((s, i) => s + i.amount, 0);
  const filteredQty = filtered.reduce((s, i) => s + (i.quantity || 0), 0);

  const openAdd = () => {
    setEditItem(null);
    setForm({ date:currentDate(), incomeType:incomeTypes[0]?.name||'', description:'', quantity:1, amount:'', remarks:'' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ date:item.date?.split('T')[0]||currentDate(), incomeType:item.incomeType, description:item.description, quantity:item.quantity, amount:item.amount, remarks:item.remarks||'' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await API.put('/income/' + editItem._id, form); toast.success('Updated!'); }
      else { await API.post('/income', form); toast.success('Added!'); }
      setShowModal(false); fetchIncomes();
    } catch(err) { toast.error(err.response?.data?.message || 'Error saving'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete('/income/' + id); toast.success('Deleted!'); fetchIncomes(); }
    catch(e) { toast.error('Delete failed'); }
    setDeleteId(null);
  };

  const exportFile = async (type) => {
    setExporting(type);
    try {
      const user = JSON.parse(localStorage.getItem('expenseUser') || '{}');
      const p = new URLSearchParams();
      if (filters.startDate && filters.endDate) { p.set('startDate', filters.startDate); p.set('endDate', filters.endDate); }
      else { if (filters.month) p.set('month', filters.month); if (filters.year) p.set('year', filters.year); }
      if (filters.incomeType) p.set('incomeType', filters.incomeType);
      const url = type === 'excel' ? '/api/income/report/excel' : '/api/income/report/pdf';
      const response = await fetch(url + '?' + p, { headers: { Authorization: 'Bearer ' + user.token } });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const link = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = link;
      a.download = 'income_' + Date.now() + (type === 'excel' ? '.xlsx' : '.pdf');
      a.click();
      toast.success(type === 'excel' ? 'Excel exported!' : 'PDF exported!');
    } catch(err) { toast.error('Export failed'); }
    setExporting('');
  };

  const months = [{v:'1',l:'January'},{v:'2',l:'February'},{v:'3',l:'March'},{v:'4',l:'April'},{v:'5',l:'May'},{v:'6',l:'June'},{v:'7',l:'July'},{v:'8',l:'August'},{v:'9',l:'September'},{v:'10',l:'October'},{v:'11',l:'November'},{v:'12',l:'December'}];
  const fmtDate = (d) => { const dt = new Date(d); return dt.getDate().toString().padStart(2,'0') + '/' + (dt.getMonth()+1).toString().padStart(2,'0') + '/' + dt.getFullYear(); };

  return (
    <div>
      <div className="page-header">
        <h1>💵 Income</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-success" onClick={()=>exportFile('excel')} disabled={!!exporting}>
            {exporting==='excel' ? '⏳ Exporting...' : '📊 Excel'}
          </button>
          <button className="btn" style={{ background:'linear-gradient(135deg,#c53030,#e53e3e)', color:'white' }} onClick={()=>exportFile('pdf')} disabled={!!exporting}>
            {exporting==='pdf' ? '⏳ Exporting...' : '📄 PDF'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Income</button>
        </div>
      </div>

      <form className="filter-bar" onSubmit={e=>{ e.preventDefault(); fetchIncomes(); }}>
        <div className="form-group"><label>Start Date</label><input type="date" value={filters.startDate} onChange={e=>setFilters({...filters,startDate:e.target.value})} /></div>
        <div className="form-group"><label>End Date</label><input type="date" value={filters.endDate} onChange={e=>setFilters({...filters,endDate:e.target.value})} /></div>
        <div className="form-group"><label>Month</label>
          <select value={filters.month} onChange={e=>setFilters({...filters,month:e.target.value})}>
            <option value="">All</option>{months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Year</label>
          <select value={filters.year} onChange={e=>setFilters({...filters,year:e.target.value})}>
            {[2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Income Type</label>
          <select value={filters.incomeType} onChange={e=>setFilters({...filters,incomeType:e.target.value})}>
            <option value="">All Types</option>{incomeTypes.map(t=><option key={t._id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <button type="submit" className="btn btn-primary">🔍</button>
          <button type="button" className="btn btn-outline" onClick={()=>{ const r={startDate:'',endDate:'',month:'',year:new Date().getFullYear().toString(),incomeType:''}; setFilters(r); fetchIncomes(r); }}>Clear</button>
        </div>
      </form>

      <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <div className="search-bar" style={{ flex:1, minWidth:200 }}>
          <span>🔍</span>
          <input placeholder="Search type, description, remarks..." value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }} />
          {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#718096', fontSize:16 }}>✕</button>}
        </div>
        <div className="summary-bar income-summary" style={{ margin:0, flex:'0 0 auto', gap:18 }}>
          <span><strong>{filtered.length}</strong> records</span>
          <span style={{ borderLeft:'1px solid #c6f6d5', paddingLeft:14 }}>Qty: <strong>{filteredQty.toLocaleString()}</strong></span>
          <span className="total" style={{ color:'#276749' }}>৳{filteredTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Month</th><th>Year</th><th>Income Type</th><th>Description</th><th>Qty</th><th>Amount (৳)</th><th>Remarks</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><Spinner /></td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">💵</div><p>No income records found</p></div></td></tr>
            ) : paginated.map((inc, i) => (
              <tr key={inc._id}>
                <td style={{ color:'var(--text-muted)' }}>{(page-1)*PAGE_SIZE+i+1}</td>
                <td>{fmtDate(inc.date)}</td>
                <td>{new Date(inc.date).toLocaleString('default',{month:'short'})}</td>
                <td>{new Date(inc.date).getFullYear()}</td>
                <td><span className="badge badge-green">{inc.incomeType}</span></td>
                <td style={{ fontWeight:500 }}>{inc.description}</td>
                <td>{inc.quantity}</td>
                <td className="amount-cell income-amount">৳{inc.amount.toLocaleString()}</td>
                <td style={{ color:'var(--text-light)', fontSize:12 }}>{inc.remarks||'-'}</td>
                <td><div className="action-btns"><button className="btn btn-outline btn-sm" onClick={()=>openEdit(inc)}>✏️</button><button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(inc._id)}>🗑️</button></div></td>
              </tr>
            ))}
            {paginated.length > 0 && (
              <tr className="total-row income-total-row">
                <td colSpan={6} style={{ textAlign:'right' }}>PAGE TOTAL</td>
                <td style={{ fontWeight:700, color:'#276749' }}>{paginated.reduce((s,i)=>s+(i.quantity||0),0).toLocaleString()}</td>
                <td className="amount-cell" style={{ color:'#276749' }}>৳{paginated.reduce((s,i)=>s+i.amount,0).toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <div className="pagination-info">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</div>
            <div className="pagination-btns">
              <button className="page-btn" onClick={()=>setPage(1)} disabled={page===1}>«</button>
              <button className="page-btn" onClick={()=>setPage(p=>p-1)} disabled={page===1}>‹</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                let p = page<=3?i+1:page>=totalPages-2?totalPages-4+i:page-2+i;
                if(p<1||p>totalPages) return null;
                return <button key={p} className={'page-btn '+(p===page?'active':'')} onClick={()=>setPage(p)}>{p}</button>;
              })}
              <button className="page-btn" onClick={()=>setPage(p=>p+1)} disabled={page===totalPages}>›</button>
              <button className="page-btn" onClick={()=>setPage(totalPages)} disabled={page===totalPages}>»</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal">
            <h2>{editItem?'✏️ Edit Income':'➕ Add Income'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="form-group"><label>Date *</label><input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                <div className="form-group"><label>Income Type *</label>
                  <select required value={form.incomeType} onChange={e=>setForm({...form,incomeType:e.target.value})}>
                    <option value="">Select Type</option>{incomeTypes.map(t=><option key={t._id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Description *</label>
                <input type="text" required placeholder="e.g., Monthly Salary" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <div className="form-grid-2">
                <div className="form-group"><label>Quantity</label><input type="number" min="0" step="0.01" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></div>
                <div className="form-group"><label>Amount (৳) *</label><input type="number" required min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Remarks</label><input type="text" placeholder="Optional note" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success">{editItem?'Update':'Add Income'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:360 }}>
            <h2>🗑️ Delete Income</h2>
            <p style={{ color:'var(--text-light)', marginBottom:20 }}>This cannot be undone.</p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
