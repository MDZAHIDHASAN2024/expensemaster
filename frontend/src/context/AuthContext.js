import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('expenseUser');
    if (stored) {
      const userData = JSON.parse(stored);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
      const dm = userData.darkMode || false;
      setDarkMode(dm);
      if (dm) document.body.classList.add('dark');
    }
    setLoading(false);
  }, []);

  const login = async (userData) => {
    setUser(userData);
    localStorage.setItem('expenseUser', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    const dm = userData.darkMode || false;
    setDarkMode(dm);
    if (dm) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    try { await axios.post('/api/recurring/process-due'); } catch(e) {}
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('expenseUser');
    delete axios.defaults.headers.common['Authorization'];
    document.body.classList.remove('dark');
    setDarkMode(false);
  };

  const toggleDarkMode = async () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    if (newVal) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    try {
      await axios.put('/api/settings/profile', { darkMode: newVal });
      const updated = { ...user, darkMode: newVal };
      setUser(updated);
      localStorage.setItem('expenseUser', JSON.stringify(updated));
    } catch(e) {}
  };

  const updateUser = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('expenseUser', JSON.stringify(updated));
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:16,color:'#718096'}}>
      Loading...
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, darkMode, toggleDarkMode, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
