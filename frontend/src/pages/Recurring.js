import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

const UNITS = ['Kg','Gram','Liter','ML','Piece','Dozen','Packet','Bottle','Month','BDT',''];

export default function Recurring() {
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [descs, setDescs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ itemType:'', itemDescription:'', unit:'', quantity:1, amount:'', dayOfMonth:1, remarks:'', isActive:true });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, t, d] = await Promise.all([API.get('/recurring'), API.get('/categories/types'), API.get('/categories/descriptions')]);
      setItems(r.data); setTypes(t.data); setDescs(d.data);
    } catch(e) {}
    setLoading(false);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ itemType: types[0]?.name||'', itemDescription:'', unit:'', quantity:1, amount:'', dayOfMonth:1, remarks:'', isActive:true });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ itemType:item.itemType, itemDescription:item.itemDescription, unit:item.unit||'', quantity:item.quantity, amount:item.amount, dayOfMonth:item.dayOfMonth, remarks:item.remarks||'', isActive:item.isActive });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editItem) { await API.put(`/recurring/${editItem._id}`, form); toast.success('Updated!'); }
      else { await API.post('/recurring', form); toast.success('Added!'); }
      setShowModal(false); fetchAll();
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/recurring/${id}`); toast.success('Deleted!'); fetchAll(); }
    catch(e) { toast.error('Delete failed'); }
    setDeleteId(null);
  };

  const addNow = async (id, name) => {
    try {
      await API.post(`/recurring/${id}/add-now`);
      toast.success(`Added "${name}" to expenses!`);
    } catch(e) { toast.error('Failed'); }
  };

  const toggleActive = async (item) => {
    try {
      await API.put(`/recurring/${item._id}`, { ...item, isActive: !item.isActive });
      toast.success(item.isActive ? 'Paused' : 'Activated');
      fetchAll();
    } catch(e) {}
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : 'Never';

  return (
    <div>
      <div className="page-header">
        <h1>🔁 Recurring Expenses</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Recurring</button>
      </div>

      <div className="alert alert-info" style={{marginBottom:18}}>
        <span>ℹ️</span>
        <div>Recurring expenses auto-add when you login each month. You can also trigger them manually.</div>
      </div>

      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading...</p></div></div>
      ) : items.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🔁</div><p>No recurring expenses yet</p></div></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          {items.map(item => (
            <div key={item._id} className="card" style={{borderLeft:`4px solid ${item.isActive?'#38a169':'#a0aec0'}`,opacity:item.isActive?1:0.7}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{item.itemDescription}</div>
                  <span className="badge badge-blue">{item.itemType}</span>
                </div>
                <div style={{display:'flex',gap:5}}>
                  <button className="btn btn-outline btn-sm" onClick={()=>openEdit(item)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(item._id)}>🗑️</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10,fontSize:13}}>
                <div><span style={{color:'var(--text-light)'}}>Amount: </span><strong>৳{item.amount.toLocaleString()}</strong></div>
                <div><span style={{color:'var(--text-light)'}}>Day: </span><strong>{item.dayOfMonth}{item.dayOfMonth===1?'st':item.dayOfMonth===2?'nd':item.dayOfMonth===3?'rd':'th'}</strong></div>
                <div><span style={{color:'var(--text-light)'}}>Qty: </span>{item.quantity} {item.unit}</div>
                <div><span style={{color:'var(--text-light)'}}>Last: </span>{fmtDate(item.lastAdded)}</div>
              </div>
              {item.remarks && <div style={{fontSize:12,color:'var(--text-light)',marginBottom:10}}>{item.remarks}</div>}
              <div style={{display:'flex',gap:8}}>
                <button className={`btn btn-sm ${item.isActive?'btn-warning':'btn-success'}`} onClick={()=>toggleActive(item)}>
                  {item.isActive?'⏸ Pause':'▶ Activate'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={()=>addNow(item._id, item.itemDescription)}>
                  ➕ Add Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal">
            <h2>{editItem?'✏️ Edit Recurring':'🔁 Add Recurring'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                <div className="form-group"><label>Item Type *</label>
                  <select required value={form.itemType} onChange={e=>setForm({...form,itemType:e.target.value})}>
                    <option value="">Select</option>{types.map(t=><option key={t._id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Day of Month *</label>
                  <input type="number" required min="1" max="28" value={form.dayOfMonth} onChange={e=>setForm({...form,dayOfMonth:e.target.value})} />
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
                <div className="form-group"><label>Amount (৳) *</label><input type="number" required min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} /></div>
              </div>
              <div className="form-group"><label>Remarks</label><input type="text" value={form.remarks} onChange={e=>setForm({...form,remarks:e.target.value})} /></div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                <label className="toggle"><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})} /><span className="toggle-slider"></span></label>
                <span style={{fontSize:13,color:'var(--text)'}}>Active</span>
              </div>
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
            <h2>🗑️ Delete Recurring</h2>
            <p style={{color:'var(--text-light)',marginBottom:20}}>Remove this recurring expense?</p>
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
