import React, { useState, useEffect, useMemo } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const UNITS = ['Kg','Gram','Liter','ML','Piece','Dozen','Bundle','Packet','Bottle','Can','Box','Bag','Pair','Set','Month','BDT',''];
const PAGE_SIZE = 20;
const currentDate = () => new Date().toISOString().split('T')[0];

function Spinner() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'50px 20px', gap:16 }}>
      <div className="spinner" />
      <span style={{ color:'var(--text-light)', fontSize:14 }}>Loading expenses...</span>
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [types, setTypes] = useState([]);
  const [descs, setDescs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ startDate:'', endDate:'', month:'', year: new Date().getFullYear().toString(), itemType:'' });
  const [form, setForm] = useState({ date: currentDate(), itemType:'', itemDescription:'', unit:'', quantity:1, amount:'', remarks:'' });

  useEffect(() => { fetchCategories(); fetchExpenses(); }, []);

  const fetchCategories = async () => {
    const [t, d] = await Promise.all([API.get('/categories/types'), API.get('/categories/descriptions')]);
    setTypes(t.data); setDescs(d.data);
  };

  const fetchExpenses = async (f = filters) => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (f.startDate && f.endDate) { p.set('startDate', f.startDate); p.set('endDate', f.endDate); }
      else { if (f.month) p.set('month', f.month); if (f.year) p.set('year', f.year); }
      if (f.itemType) p.set('itemType', f.itemType);
      const { data } = await API.get('/expenses?' + p);
      setExpenses(data.expenses); setTotal(data.total); setTotalQty(data.totalQty || 0); setPage(1);
    } catch(e) {}
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search) return expenses;
    const q = search.toLowerCase();
    return expenses.filter(e =>
      e.itemType?.toLowerCase().includes(q) ||
      e.itemDescription?.toLowerCase().includes(q) ||
      e.remarks?.toLowerCase().includes(q) ||
      e.amount?.toString().includes(q)
    );
  }, [expenses, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const filteredQty = filtered.reduce((s, e) => s + (e.quantity || 0), 0);

  const openAdd = () => {
    setEditItem(null);
    setForm({ date: currentDate(), itemType: types[0]?.name || '', itemDescription:'', unit:'', quantity:1, amount:'', remarks:'' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ date: item.date?.split('T')[0] || currentDate(), itemType: item.itemType, itemDescription: item.itemDescription, unit: item.unit||'', quantity: item.quantity, amount: item.amount, remarks: item.remarks||'' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await API.put('/expenses/' + editItem._id, form); toast.success('Updated!'); }
      else { await API.post('/expenses', form); toast.success('Added!'); }
      setShowModal(false); fetchExpenses();
    } catch(err) { toast.error(err.response?.data?.message || 'Error saving'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete('/expenses/' + id); toast.success('Deleted!'); fetchExpenses(); }
    catch(e) { toast.error('Delete failed'); }
    setDeleteId(null);
  };

  const months = [{v:'1',l:'January'},{v:'2',l:'February'},{v:'3',l:'March'},{v:'4',l:'April'},{v:'5',l:'May'},{v:'6',l:'June'},{v:'7',l:'July'},{v:'8',l:'August'},{v:'9',l:'September'},{v:'10',l:'October'},{v:'11',l:'November'},{v:'12',l:'December'}];
  const fmtDate = (d) => { const dt = new Date(d); return dt.getDate().toString().padStart(2,'0') + '/' + (dt.getMonth()+1).toString().padStart(2,'0') + '/' + dt.getFullYear(); };

  return (
    <div>
      <div className="page-header">
        <h1>💰 Expenses</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Expense</button>
      </div>

      <form className="filter-bar" onSubmit={e => { e.preventDefault(); fetchExpenses(); }}>
        <div className="form-group"><label>Start Date</label><input type="date" value={filters.startDate} onChange={e => setFilters({...filters,startDate:e.target.value})} /></div>
        <div className="form-group"><label>End Date</label><input type="date" value={filters.endDate} onChange={e => setFilters({...filters,endDate:e.target.value})} /></div>
        <div className="form-group"><label>Month</label>
          <select value={filters.month} onChange={e => setFilters({...filters,month:e.target.value})}>
            <option value="">All</option>{months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Year</label>
          <select value={filters.year} onChange={e => setFilters({...filters,year:e.target.value})}>
            {[2020,2021,2022,2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Type</label>
          <select value={filters.itemType} onChange={e => setFilters({...filters,itemType:e.target.value})}>
            <option value="">All Types</option>{types.map(t=><option key={t._id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <button type="submit" className="btn btn-primary">🔍</button>
          <button type="button" className="btn btn-outline" onClick={() => { const r={startDate:'',endDate:'',month:'',year:new Date().getFullYear().toString(),itemType:''}; setFilters(r); fetchExpenses(r); }}>Clear</button>
        </div>
      </form>

      <div style={{display:'flex',gap:10,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
        <div className="search-bar" style={{flex:1,minWidth:200}}>
          <span>🔍</span>
          <input placeholder="Search description, type, remarks..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          {search && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'#718096',fontSize:16}}>✕</button>}
        </div>
        <div className="summary-bar" style={{margin:0,flex:'0 0 auto',gap:18}}>
          <span><strong>{filtered.length}</strong> records</span>
          <span style={{borderLeft:'1px solid #bee3f8',paddingLeft:14}}>Qty: <strong>{filteredQty.toLocaleString()}</strong></span>
          <span className="total">৳{filteredTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr><th>#</th><th>Date</th><th>Month</th><th>Year</th><th>Type</th><th>Description</th><th>Unit</th><th>Qty</th><th>Amount (৳)</th><th>Remarks</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11}><Spinner /></td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={11}><div className="empty-state"><div className="empty-icon">📭</div><p>No expenses found</p></div></td></tr>
            ) : paginated.map((e, i) => (
              <tr key={e._id}>
                <td style={{color:'var(--text-muted)'}}>{(page-1)*PAGE_SIZE+i+1}</td>
                <td>{fmtDate(e.date)}</td>
                <td>{new Date(e.date).toLocaleString('default',{month:'short'})}</td>
                <td>{new Date(e.date).getFullYear()}</td>
                <td><span className="badge badge-blue">{e.itemType}</span></td>
                <td style={{fontWeight:500}}>{e.itemDescription}</td>
                <td>{e.unit||'-'}</td>
                <td>{e.quantity}</td>
                <td className="amount-cell">৳{e.amount.toLocaleString()}</td>
                <td style={{color:'var(--text-light)',fontSize:12}}>{e.remarks||'-'}</td>
                <td><div className="action-btns"><button className="btn btn-outline btn-sm" onClick={()=>openEdit(e)}>✏️</button><button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(e._id)}>🗑️</button></div></td>
              </tr>
            ))}
            {paginated.length > 0 && (
              <tr className="total-row">
                <td colSpan={7} style={{textAlign:'right'}}>PAGE TOTAL</td>
                <td style={{fontWeight:700,color:'var(--primary)'}}>{paginated.reduce((s,e)=>s+(e.quantity||0),0).toLocaleString()}</td>
                <td className="amount-cell">৳{paginated.reduce((s,e)=>s+e.amount,0).toLocaleString()}</td>
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
                let p = page<=3 ? i+1 : page>=totalPages-2 ? totalPages-4+i : page-2+i;
                if(p<1||p>totalPages) return null;
                return <button key={p} className={'page-btn ' + (p===page?'active':'')} onClick={()=>setPage(p)}>{p}</button>;
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
            <h2>{editItem?'✏️ Edit Expense':'➕ Add Expense'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="form-group"><label>Date *</label><input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                <div className="form-group"><label>Item Type *</label>
                  <select required value={form.itemType} onChange={e=>setForm({...form,itemType:e.target.value})}>
                    <option value="">Select</option>{types.map(t=><option key={t._id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Item Description *</label>
                <select required value={form.itemDescription} onChange={e=>setForm({...form,itemDescription:e.target.value})}>
                  <option value="">Select</option>{descs.map(d=><option key={d._id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-grid-3">
                <div className="form-group"><label>Unit</label>
                  <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                    {UNITS.map(u=><option key={u} value={u}>{u||'—'}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Quantity</label><input type="number" min="0" step="0.01" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} /></div>
                <div className="form-group"><label>Amount (৳) *</label><input type="number" required min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Remarks</label><input type="text" placeholder="Optional note" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editItem?'Update':'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:360}}>
            <h2>🗑️ Delete Expense</h2>
            <p style={{color:'var(--text-light)',marginBottom:20}}>This cannot be undone.</p>
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
