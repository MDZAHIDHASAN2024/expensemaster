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

const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const LAST_ACTIVE_KEY = 'expenseLastActive';
const TAB_CLOSED_KEY = 'expenseTabClosed';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const timerRef = useRef(null);

  const doLogout = useCallback((redirect = true) => {
    setUser(null);
    localStorage.removeItem('expenseUser');
    localStorage.removeItem(LAST_ACTIVE_KEY);
    delete axios.defaults.headers.common['Authorization'];
    document.body.classList.remove('dark');
    setDarkMode(false);
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

  // Desktop timer — mobile এ pause হয়, তাই visibilitychange দিয়েও check করা হয়
  const scheduleCheck = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (isExpired()) doLogout(true);
    }, TIMEOUT_MS + 1000);
  }, [isExpired, doLogout]);

  // Activity handler
  const onActivity = useCallback(() => {
    updateLastActive();
    scheduleCheck();
  }, [updateLastActive, scheduleCheck]);

  // Activity events
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

  // visibilitychange — mobile app switch / tab switch
  // mobile এ setTimeout কাজ করে না, তাই ফিরে এলে timestamp check করা হয়
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

  // Tab/browser close detection
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) sessionStorage.setItem(TAB_CLOSED_KEY, 'true');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Initial load
  useEffect(() => {
    // Tab বন্ধ করে নতুন session খুললে logout
    const tabClosed = sessionStorage.getItem(TAB_CLOSED_KEY);
    if (tabClosed) {
      sessionStorage.removeItem(TAB_CLOSED_KEY);
      localStorage.removeItem('expenseUser');
      localStorage.removeItem(LAST_ACTIVE_KEY);
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
      const dm = userData.darkMode || false;
      setDarkMode(dm);
      if (dm) document.body.classList.add('dark');
      updateLastActive();
      scheduleCheck();
    }
    setLoading(false);
  }, []); // eslint-disable-line

  const login = async (userData) => {
    setUser(userData);
    localStorage.setItem('expenseUser', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
    const dm = userData.darkMode || false;
    setDarkMode(dm);
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
    if (newVal) document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    try {
      await axios.put('/api/settings/profile', { darkMode: newVal });
      const updated = { ...user, darkMode: newVal };
      setUser(updated);
      localStorage.setItem('expenseUser', JSON.stringify(updated));
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
