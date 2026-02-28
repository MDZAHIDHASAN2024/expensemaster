import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      // Seed default categories
      await API.post(
        '/categories/seed',
        {},
        { headers: { Authorization: `Bearer ${data.token}` } },
      );
      login(data);
      toast.success('Account created! Welcome!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">💵</div>
        <h1>Create Account</h1>
        <p>Start managing your expenses today</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              required
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              placeholder="Your Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              placeholder="Min 6 characters"
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              required
              placeholder="Repeat password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : '✅ Create Account'}
          </button>
        </form>
        <p
          style={{
            marginTop: 20,
            textAlign: 'center',
            fontSize: 13,
            color: '#718096',
          }}
        >
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2b6cb0', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
