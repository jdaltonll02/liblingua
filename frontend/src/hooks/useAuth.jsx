import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, ask the server if we have a valid session cookie.
  // No token string to read — the browser sends the httpOnly cookie automatically.
  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))   // 401 = no session; that's fine
      .finally(() => setLoading(false));
  }, []);

  // Called after a successful login or register.
  // The server already set the httpOnly cookie; we just store the profile.
  const login = useCallback((contributor) => {
    setUser(contributor);
  }, []);

  // Ask the server to clear the cookie, then wipe local state.
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
