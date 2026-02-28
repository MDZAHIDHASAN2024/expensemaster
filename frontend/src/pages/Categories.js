import React, { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

function Spinner() {
  return <div style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></div>;
}

export default function Categories() {
  const [activeTab, setActiveTab] = useState('types');
  const [types, setTypes] = useState([]);
  const [descs, setDescs] = useState([]);
  const [incomeTypes, setIncomeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteItem, setDeleteItem] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, d, it] = await Promise.all([API.get('/categories/types'), API.get('/categories/descriptions'), API.get('/categories/income-types')]);
      setTypes(t.data); setDescs(d.data); setIncomeTypes(it.data);
    } catch(err) {}
    setLoading(false);
  };

  const getConfig = () => {
    if (activeTab === 'types') return { items: types, endpoint: '/categories/types', label: 'Expense Type', icon: '🏷️' };
    if (activeTab === 'descs') return { items: descs, endpoint: '/categories/descriptions', label: 'Item Description', icon: '📝' };
    return { items: incomeTypes, endpoint: '/categories/income-types', label: 'Income Type', icon: '💵' };
  };

  const { items, endpoint, label, icon } = getConfig();
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try { await API.post(endpoint, { name: newName.trim() }); toast.success('Added!'); setNewName(''); fetchAll(); }
    catch(err) { toast.error(err.response?.data?.message || 'Already exists'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try { await API.put(endpoint + '/' + editItem._id, { name: editName.trim() }); toast.success('Updated!'); setEditItem(null); fetchAll(); }
    catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async () => {
    try { await API.delete(endpoint + '/' + deleteItem._id); toast.success('Deleted!'); setDeleteItem(null); fetchAll(); }
    catch(err) { toast.error('Delete failed'); }
  };

  const handleSeedDefaults = async () => {
    try { await API.post('/categories/seed'); toast.success('Defaults loaded!'); fetchAll(); }
    catch(err) { toast.error('Seed failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1>🏷️ Categories</h1>
        <button className="btn btn-outline" onClick={handleSeedDefaults}>🔄 Load Defaults</button>
      </div>

      <div className="tabs">
        <button className={'tab ' + (activeTab==='types'?'active':'')} onClick={()=>{ setActiveTab('types'); setSearch(''); }}>
          Expense Types ({types.length})
        </button>
        <button className={'tab ' + (activeTab==='descs'?'active':'')} onClick={()=>{ setActiveTab('descs'); setSearch(''); }}>
          Descriptions ({descs.length})
        </button>
        <button className={'tab income-tab ' + (activeTab==='income'?'active':'')} onClick={()=>{ setActiveTab('income'); setSearch(''); }}>
          💵 Income Types ({incomeTypes.length})
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:20 }}>
        <div className={'card ' + (activeTab==='income' ? 'income-card' : '')} style={{ height:'fit-content' }}>
          <h3 style={{ marginBottom:16, color: activeTab==='income' ? '#276749' : 'var(--primary)' }}>➕ Add {label}</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" required placeholder={'e.g., ' + (activeTab==='income' ? 'Salary' : activeTab==='types' ? 'Transport' : 'Rickshaw')} value={newName} onChange={e=>setNewName(e.target.value)} />
            </div>
            <button type="submit" className={'btn btn-full ' + (activeTab==='income' ? 'btn-success' : 'btn-primary')}>Add {label}</button>
          </form>
        </div>

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ color: activeTab==='income' ? '#276749' : 'var(--primary)' }}>{icon} {label}s</h3>
            <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{ padding:'7px 12px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:13, width:180 }} />
          </div>
          {loading ? <Spinner /> : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">{icon}</div><p>No items found</p></div>
          ) : (
            <div style={{ maxHeight:'60vh', overflowY:'auto' }}>
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((item, i) => (
                    <tr key={item._id}>
                      <td style={{ color:'var(--text-muted)', width:40 }}>{i+1}</td>
                      <td style={{ fontWeight:500 }}>
                        {activeTab==='income' ? <span className="badge badge-green">{item.name}</span> : item.name}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-outline btn-sm" onClick={()=>{ setEditItem(item); setEditName(item.name); }}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>setDeleteItem(item)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editItem && (
        <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) setEditItem(null); }}>
          <div className="modal" style={{ maxWidth:400 }}>
            <h2>✏️ Edit {label}</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group"><label>Name *</label><input type="text" required value={editName} onChange={e=>setEditName(e.target.value)} /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setEditItem(null)}>Cancel</button>
                <button type="submit" className={'btn ' + (activeTab==='income' ? 'btn-success' : 'btn-primary')}>Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:380 }}>
            <h2>🗑️ Delete {label}</h2>
            <p style={{ color:'var(--text-light)', marginBottom:20 }}>Delete "<strong>{deleteItem.name}</strong>"?</p>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setDeleteItem(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
