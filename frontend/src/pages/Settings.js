import React, { useState, useRef } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, updateUser, darkMode, toggleDarkMode, logout } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [restoreData, setRestoreData] = useState(null);
  const [restoreOverwrite, setRestoreOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.put('/settings/profile', profile);
      updateUser({ name: data.name, email: data.email });
      toast.success('Profile updated!');
    } catch(err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Min 6 characters'); return; }
    try {
      await API.put('/settings/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed!');
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch(err) { toast.error(err.response?.data?.message || 'Wrong password'); }
  };

  const handleBackup = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem('expenseUser') || '{}');
      const res = await fetch('/api/settings/backup', { headers: { Authorization: `Bearer ${userData.token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success('Backup downloaded!');
    } catch(e) { toast.error('Backup failed'); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setRestoreData(data);
        toast.success(`Loaded ${data.totalRecords} records`);
      } catch { toast.error('Invalid backup file'); }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!restoreData) return;
    setLoading(true);
    try {
      const { data } = await API.post('/settings/restore', { expenses: restoreData.expenses, overwrite: restoreOverwrite });
      toast.success(data.message);
      setRestoreData(null);
    } catch(err) { toast.error('Restore failed'); }
    setLoading(false);
  };

  return (
    <div>
      <div className="page-header"><h1>⚙️ Settings</h1></div>

      <div className="tabs">
        {[{k:'profile',l:'👤 Profile'},{k:'password',l:'🔒 Password'},{k:'appearance',l:'🎨 Appearance'},{k:'backup',l:'💾 Backup'}].map(t=>(
          <button key={t.k} className={`tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* Profile */}
      {tab === 'profile' && (
        <div className="card" style={{maxWidth:480}}>
          <div className="card-header"><h3>👤 Profile Information</h3></div>
          <form onSubmit={handleProfileSave}>
            <div className="form-group"><label>Full Name</label><input type="text" required value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})} /></div>
            <div className="form-group"><label>Email Address</label><input type="email" required value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})} /></div>
            <div style={{background:'var(--bg)',borderRadius:8,padding:'12px 16px',marginBottom:16,fontSize:13,color:'var(--text-light)'}}>
              <div>Account created: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</div>
              <div>Family role: {user?.familyRole || 'Personal account'}</div>
            </div>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </form>
        </div>
      )}

      {/* Password */}
      {tab === 'password' && (
        <div className="card" style={{maxWidth:480}}>
          <div className="card-header"><h3>🔒 Change Password</h3></div>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group"><label>Current Password</label><input type="password" required value={pwForm.currentPassword} onChange={e=>setPwForm({...pwForm,currentPassword:e.target.value})} /></div>
            <div className="form-group"><label>New Password</label><input type="password" required minLength={6} placeholder="Min 6 characters" value={pwForm.newPassword} onChange={e=>setPwForm({...pwForm,newPassword:e.target.value})} /></div>
            <div className="form-group"><label>Confirm New Password</label><input type="password" required value={pwForm.confirm} onChange={e=>setPwForm({...pwForm,confirm:e.target.value})} /></div>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>
      )}

      {/* Appearance */}
      {tab === 'appearance' && (
        <div className="card" style={{maxWidth:480}}>
          <div className="card-header"><h3>🎨 Appearance</h3></div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 0',borderBottom:'1px solid var(--border)'}}>
            <div>
              <div style={{fontWeight:600,marginBottom:4}}>Dark Mode</div>
              <div style={{fontSize:13,color:'var(--text-light)'}}>Use dark theme for better night viewing</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div style={{padding:'16px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{fontWeight:600,marginBottom:8}}>Current Theme</div>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1,padding:16,borderRadius:10,background:darkMode?'#2d3748':'white',border:`2px solid ${darkMode?'var(--primary)':'var(--border)'}`,textAlign:'center',fontSize:13,cursor:'pointer'}} onClick={()=>darkMode&&toggleDarkMode()}>
                ☀️ Light Mode
              </div>
              <div style={{flex:1,padding:16,borderRadius:10,background:darkMode?'#1a202c':'#f0f4f8',border:`2px solid ${darkMode?'var(--primary)':'var(--border)'}`,textAlign:'center',fontSize:13,cursor:'pointer',color:darkMode?'white':'inherit'}} onClick={()=>!darkMode&&toggleDarkMode()}>
                🌙 Dark Mode
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup */}
      {tab === 'backup' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          <div className="card">
            <div className="card-header"><h3>📤 Export Backup</h3></div>
            <p style={{fontSize:13,color:'var(--text-light)',marginBottom:16}}>Download all your expense data as JSON file.</p>
            <div className="alert alert-info" style={{marginBottom:16}}>
              <span>ℹ️</span>
              <div style={{fontSize:12}}>Backup includes all expenses. Keep it safe for data recovery.</div>
            </div>
            <button className="btn btn-primary btn-full" onClick={handleBackup}>📥 Download Backup</button>
          </div>

          <div className="card">
            <div className="card-header"><h3>📥 Restore Backup</h3></div>
            <p style={{fontSize:13,color:'var(--text-light)',marginBottom:16}}>Restore from a previously exported JSON backup.</p>
            <div className="form-group">
              <label>Select Backup File (.json)</label>
              <input type="file" accept=".json" ref={fileRef} onChange={handleFileSelect} />
            </div>
            {restoreData && (
              <div className="alert alert-success" style={{marginBottom:12}}>
                <span>✅</span>
                <div style={{fontSize:12}}>
                  <div><strong>{restoreData.totalRecords}</strong> records ready</div>
                  <div>Exported by: {restoreData.user?.name}</div>
                  <div>Date: {new Date(restoreData.exportedAt).toLocaleDateString()}</div>
                </div>
              </div>
            )}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <label className="toggle">
                <input type="checkbox" checked={restoreOverwrite} onChange={e=>setRestoreOverwrite(e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Overwrite existing data</div>
                <div style={{fontSize:12,color:'var(--danger)'}}>Warning: deletes all current expenses!</div>
              </div>
            </div>
            <button className="btn btn-warning btn-full" onClick={handleRestore} disabled={!restoreData || loading}>
              {loading ? 'Restoring...' : '🔄 Restore Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
