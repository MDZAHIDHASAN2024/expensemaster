import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await API.post('/auth/login', form);
      login(data);
      toast.success(`Welcome back, ${data.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💵</div>
        <h1>Welcome Back</h1>
        <p>Sign in to your ExpenseBook account</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email" required placeholder="you@example.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password" required placeholder="Your password"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : '🔑 Sign In'}
          </button>
        </form>
        <p style={{marginTop:20, textAlign:'center', fontSize:13, color:'#718096'}}>
          Don't have an account? <Link to="/register" style={{color:'#2b6cb0', fontWeight:600}}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
