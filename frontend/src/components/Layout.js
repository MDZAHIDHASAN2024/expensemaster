import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout, darkMode, toggleDarkMode } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { to: '/', icon: '📊', label: 'Dashboard', end: true },
    { to: '/expenses', icon: '💰', label: 'Expenses' },
    { to: '/income', icon: '💵', label: 'Income' },
    { to: '/analytics', icon: '📈', label: 'Analytics' },
    { to: '/need-items-analytics', icon: '🛒', label: "Need Item's Analytics" },
    { to: '/budget', icon: '🎯', label: 'Budget' },
    { to: '/recurring', icon: '🔁', label: 'Recurring' },
    { to: '/reports', icon: '📋', label: 'Reports' },
    { to: '/categories', icon: '🏷️', label: 'Categories' },
    { to: '/family', icon: '👨‍👩‍👧', label: 'Family' },
    { to: '/settings', icon: '⚙️', label: 'Settings' },
    ...(user?.isAdmin ? [{ to: '/admin', icon: '🛡️', label: 'Admin' }] : []),
  ];

  return (
    <div>
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <h2>💵 ExpenseBook</h2>
        <button className="hamburger-btn" onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h2>
            <span>💵</span> ExpenseBook
          </h2>
        </div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.label === 'Admin' && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    background: 'rgba(245,158,11,0.2)',
                    color: '#f59e0b',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                  }}
                >
                  ADMIN
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div
              className="user-avatar"
              style={{
                background: user?.isAdmin
                  ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                  : undefined,
              }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-details">
              <div className="name">
                {user?.name}
                {user?.isAdmin && (
                  <span
                    style={{
                      fontSize: 9,
                      marginLeft: 5,
                      background: 'rgba(245,158,11,0.2)',
                      color: '#f59e0b',
                      padding: '1px 4px',
                      borderRadius: 3,
                      fontWeight: 700,
                    }}
                  >
                    ADMIN
                  </span>
                )}
              </div>
              <div className="role">{user?.familyRole || 'Personal'}</div>
            </div>
            <button
              onClick={toggleDarkMode}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
