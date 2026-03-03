import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const TIMEOUT_MS = 20 * 60 * 1000;
const LAST_ACTIVE_KEY = 'expenseLastActive';
const SESSION_ALIVE_KEY = 'expenseSessionAlive';
const DARK_MODE_KEY = 'expenseDarkMode'; // ✅ dark mode আলাদা key এ রাখা হবে

// ✅ Page load এর সাথে সাথে dark mode apply করো — flicker এড়াতে
const initDarkMode = () => {
  const saved = localStorage.getItem(DARK_MODE_KEY);
  if (saved === 'true') {
    document.body.classList.add('dark');
    return true;
  }
  document.body.classList.remove('dark');
  return false;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // ✅ localStorage থেকে সরাসরি initial value নাও
  const [darkMode, setDarkMode] = useState(() => initDarkMode());
  const timerRef = useRef(null);

  const doLogout = useCallback((redirect = true) => {
    setUser(null);
    localStorage.removeItem('expenseUser');
    localStorage.removeItem(LAST_ACTIVE_KEY);
    sessionStorage.removeItem(SESSION_ALIVE_KEY);
    delete axios.defaults.headers.common['Authorization'];
    // ✅ logout এ dark mode localStorage টিকে থাকবে — reset করব না
    if (timerRef.current) clearTimeout(timerRef.current);
    if (redirect) window.location.href = '/login';
  }, []);

  const updateLastActive = useCallback(() => {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }, []);

  const isExpired = useCallback(() => {
    const last = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!last) return false;
    return Date.now() - parseInt(last) > TIMEOUT_MS;
  }, []);

  const scheduleCheck = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isExpired()) doLogout(true);
    }, TIMEOUT_MS + 1000);
  }, [isExpired, doLogout]);

  const onActivity = useCallback(() => {
    updateLastActive();
    scheduleCheck();
  }, [updateLastActive, scheduleCheck]);

  useEffect(() => {
    if (!user) return;
    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    return () =>
      events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [user, onActivity]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!user) return;
      if (document.visibilityState === 'hidden') {
        updateLastActive();
      } else if (document.visibilityState === 'visible') {
        if (isExpired()) {
          doLogout(true);
          return;
        }
        scheduleCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [user, isExpired, doLogout, updateLastActive, scheduleCheck]);

  // Initial load
  useEffect(() => {
    const sessionAlive = sessionStorage.getItem(SESSION_ALIVE_KEY);

    if (!sessionAlive) {
      localStorage.removeItem('expenseUser');
      localStorage.removeItem(LAST_ACTIVE_KEY);
      // ✅ dark mode localStorage টিকে থাকবে এখানেও
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem('expenseUser');
    if (stored) {
      if (isExpired()) {
        localStorage.removeItem('expenseUser');
        localStorage.removeItem(LAST_ACTIVE_KEY);
        setLoading(false);
        return;
      }
      const userData = JSON.parse(stored);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] =
        `Bearer ${userData.token}`;
      // ✅ dark mode localStorage থেকে নাও — user data থেকে নয়
      const dm = localStorage.getItem(DARK_MODE_KEY) === 'true';
      setDarkMode(dm);
      if (dm) document.body.classList.add('dark');
      else document.body.classList.remove('dark');
      updateLastActive();
      scheduleCheck();
    }
    setLoading(false);
  }, []); // eslint-disable-line

  const login = async (userData) => {
    sessionStorage.setItem(SESSION_ALIVE_KEY, 'true');
    setUser(userData);
    localStorage.setItem('expenseUser', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    // ✅ login এ user এর DB darkMode preference নাও, localStorage এ save করো
    const dm = userData.darkMode || false;
    setDarkMode(dm);
    localStorage.setItem(DARK_MODE_KEY, dm.toString());
    if (dm) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    updateLastActive();
    scheduleCheck();
    try {
      await axios.post('/api/recurring/process-due');
    } catch (e) {}
  };

  const logout = useCallback(() => doLogout(false), [doLogout]);

  const toggleDarkMode = async () => {
    const newVal = !darkMode;
    setDarkMode(newVal);
    // ✅ আলাদা key এ save — session এর সাথে যুক্ত নয়
    localStorage.setItem(DARK_MODE_KEY, newVal.toString());
    if (newVal) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    // ✅ user object ও update করো
    const updated = { ...user, darkMode: newVal };
    setUser(updated);
    localStorage.setItem('expenseUser', JSON.stringify(updated));
    try {
      await axios.put('/api/settings/profile', { darkMode: newVal });
    } catch (e) {}
  };

  const updateUser = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('expenseUser', JSON.stringify(updated));
  };

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          fontSize: 16,
          color: '#718096',
        }}
      >
        Loading...
      </div>
    );

  return (
    <AuthContext.Provider
      value={{ user, login, logout, darkMode, toggleDarkMode, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
