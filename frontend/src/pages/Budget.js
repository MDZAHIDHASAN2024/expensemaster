import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function Budget() {
  const [budgets, setBudgets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [bvA, setBvA] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({ itemType:'', limit:'', alertAt:80 });

  useEffect(() => { fetchTypes(); }, []);
  useEffect(() => { fetchBudgets(); fetchBvA(); }, [month, year]);
  useEffect(() => { fetchAlerts(); }, []);

  const fetchTypes = async () => { const { data } = await API.get('/categories/types'); setTypes(data); };

  const fetchBudgets = async () => {
    setLoading(true);
    try { const { data } = await API.get(`/budgets?month=${month}&year=${year}`); setBudgets(data); }
    catch(e) {}
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try { const { data } = await API.get('/budgets/alerts'); setAlerts(data); } catch(e) {}
  };

  const fetchBvA = async () => {
    try { const { data } = await API.get(`/analytics/budget-vs-actual?month=${month}&year=${year}`); setBvA(data); }
    catch(e) {}
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await API.post('/budgets', { ...form, month, year });
      toast.success('Budget saved!');
      setShowModal(false);
      setForm({ itemType:'', limit:'', alertAt:80 });
      fetchBudgets(); fetchBvA();
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handleDelete = async (id) => {
    try { await API.delete(`/budgets/${id}`); toast.success('Deleted!'); fetchBudgets(); fetchBvA(); }
    catch(e) { toast.error('Delete failed'); }
    setDeleteId(null);
  };

  const months = [{v:1,l:'January'},{v:2,l:'February'},{v:3,l:'March'},{v:4,l:'April'},{v:5,l:'May'},{v:6,l:'June'},{v:7,l:'July'},{v:8,l:'August'},{v:9,l:'September'},{v:10,l:'October'},{v:11,l:'November'},{v:12,l:'December'}];

  return (
    <div>
      <div className="page-header">
        <h1>🎯 Budget</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Set Budget</button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{marginBottom:18}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:10,color:'var(--danger)'}}>⚠️ Budget Alerts (This Month)</h3>
          {alerts.map((a, i) => (
            <div key={i} className={`alert ${a.isOver ? 'alert-danger' : 'alert-warning'}`}>
              <span>{a.isOver ? '🚨' : '⚠️'}</span>
              <div>
                <strong>{a.itemType}</strong> — Spent ৳{a.spent.toLocaleString()} of ৳{a.limit.toLocaleString()} ({a.percentage}%)
                {a.isOver && <span style={{marginLeft:8}} className="badge badge-red">OVER BUDGET!</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Month/Year filter */}
      <div className="filter-bar" style={{marginBottom:18}}>
        <div className="form-group" style={{margin:0,flex:1,minWidth:140}}>
          <label>Month</label>
          <select value={month} onChange={e=>setMonth(e.target.value)}>
            {months.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div className="form-group" style={{margin:0,flex:1,minWidth:100}}>
          <label>Year</label>
          <select value={year} onChange={e=>setYear(e.target.value)}>
            {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Budget vs Actual Chart */}
      {bvA.length > 0 && (
        <div className="card" style={{marginBottom:20}}>
          <div className="card-header"><h3>📊 Budget vs Actual</h3></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bvA} margin={{top:5,right:10,left:0,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="itemType" tick={{fontSize:11,fill:'var(--text-light)'}} />
              <YAxis tick={{fontSize:11,fill:'var(--text-light)'}} tickFormatter={v=>`৳${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v=>[`৳${v.toLocaleString()}`]} contentStyle={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:8}} />
              <Legend />
              <Bar dataKey="budget" name="Budget" fill="#2b6cb0" radius={[4,4,0,0]} opacity={0.7} />
              <Bar dataKey="actual" name="Actual" fill="#e53e3e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="card"><div className="empty-state"><p>Loading...</p></div></div>
      ) : budgets.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🎯</div><p>No budgets set for this month</p></div></div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          {budgets.map(b => {
            const barClass = b.isOver ? 'progress-red' : b.percentage >= b.alertAt ? 'progress-yellow' : 'progress-green';
            return (
              <div key={b._id} className="card" style={{borderTop:`4px solid ${b.isOver?'#e53e3e':b.percentage>=b.alertAt?'#d69e2e':'#38a169'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>{b.itemType}</div>
                    <div style={{fontSize:12,color:'var(--text-light)'}}>Alert at {b.alertAt}%</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={()=>setDeleteId(b._id)}>🗑️</button>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:13,color:'var(--text-light)'}}>Spent: <strong style={{color:'var(--text)'}}>৳{b.spent.toLocaleString()}</strong></span>
                  <span style={{fontSize:13,color:'var(--text-light)'}}>Limit: <strong style={{color:'var(--primary)'}}>৳{b.limit.toLocaleString()}</strong></span>
                </div>
                <div className="progress-bar-wrap">
                  <div className={`progress-bar ${barClass}`} style={{width:`${Math.min(b.percentage,100)}%`}} />
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>{b.percentage}% used</span>
                  {b.isOver
                    ? <span className="badge badge-red">Over by ৳{(b.spent-b.limit).toLocaleString()}</span>
                    : <span className="badge badge-green">৳{(b.limit-b.spent).toLocaleString()} left</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="modal" style={{maxWidth:420}}>
            <h2>🎯 Set Budget</h2>
            <form onSubmit={handleSave}>
              <div className="form-group"><label>Category *</label>
                <select required value={form.itemType} onChange={e=>setForm({...form,itemType:e.target.value})}>
                  <option value="">Select</option>{types.map(t=><option key={t._id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group"><label>Budget Limit (৳) *</label><input type="number" required min="1" value={form.limit} onChange={e=>setForm({...form,limit:e.target.value})} /></div>
                <div className="form-group"><label>Alert at (%)</label><input type="number" min="10" max="100" value={form.alertAt} onChange={e=>setForm({...form,alertAt:e.target.value})} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{maxWidth:360}}>
            <h2>🗑️ Delete Budget</h2>
            <p style={{color:'var(--text-light)',marginBottom:20}}>Remove this budget limit?</p>
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
