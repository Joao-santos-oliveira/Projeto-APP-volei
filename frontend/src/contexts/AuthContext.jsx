import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Cores de avatar disponíveis para usuários
export const AVATAR_COLORS = [
  '#f5c518', '#3b82f6', '#22c55e', '#f97316',
  '#a855f7', '#ef4444', '#06b6d4', '#ec4899',
  '#84cc16', '#ffffff'
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('volei_token'));
  const [loading, setLoading] = useState(true);

  // Inicializa usuário admin local se não existir no localStorage (modo offline/Vercel)
  useEffect(() => {
    try {
      const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
      if (users.length === 0) {
        const adminUser = {
          id: 1,
          username: 'admin',
          display_name: 'Admin',
          password: 'admin123',
          avatar_color: '#f5c518',
          is_admin: 1,
          created_at: new Date().toISOString()
        };
        localStorage.setItem('volei_users', JSON.stringify([adminUser]));
      }
    } catch (e) {
      console.warn('Erro ao inicializar users no storage:', e);
    }
  }, []);

  const saveSession = (userData, tokenValue) => {
    localStorage.setItem('volei_token', tokenValue);
    localStorage.setItem('volei_local_user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
  };

  const clearSession = () => {
    localStorage.removeItem('volei_token');
    localStorage.removeItem('volei_local_user');
    setToken(null);
    setUser(null);
  };

  // ── Modo offline / localStore ──────────────────────────────
  const loginLocal = (username, password) => {
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    const u = users.find(x => x.username.toLowerCase() === username.trim().toLowerCase());
    if (!u || u.password !== password) {
      throw new Error('Usuário ou senha incorretos');
    }
    const fakeToken = `local_${u.id}_${Date.now()}`;
    saveSession(u, fakeToken);
    return u;
  };

  const registerLocal = (username, displayName, password, avatarColor) => {
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    const cleanUsername = username.trim().toLowerCase();
    if (users.some(x => x.username.toLowerCase() === cleanUsername)) {
      throw new Error('Nome de usuário já cadastrado');
    }
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(x => x.id)) + 1 : 1,
      username: cleanUsername,
      display_name: displayName.trim(),
      password,
      avatar_color: avatarColor || '#3b82f6',
      is_admin: users.length === 0 ? 1 : 0,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('volei_users', JSON.stringify(users));
    const fakeToken = `local_${newUser.id}_${Date.now()}`;
    saveSession(newUser, fakeToken);
    return newUser;
  };

  const verifyToken = useCallback(async (t) => {
    if (!t) {
      setLoading(false);
      return;
    }

    // Se for token local, valida direto
    if (t.startsWith('local_')) {
      const storedUser = localStorage.getItem('volei_local_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        clearSession();
      }
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const u = await res.json();
        setUser(u);
      } else {
        clearSession();
      }
    } catch {
      // Backend inacessível, restaura sessão salva
      const storedUser = localStorage.getItem('volei_local_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        clearSession();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyToken(token);
  }, [token, verifyToken]);

  const login = async (username, password) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
      saveSession(data.user, data.token);
      return data.user;
    } catch (err) {
      // Se for erro de conexão/rede/timeout, usa o login local
      const isNetworkError =
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message.includes('fetch') ||
        err.message.includes('Network') ||
        err.message.includes('Load failed') ||
        err.message.includes('Failed');

      if (isNetworkError) {
        return loginLocal(username, password);
      }
      throw err;
    }
  };

  const register = async (username, displayName, password, avatarColor) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim(),
          password,
          avatar_color: avatarColor
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
      saveSession(data.user, data.token);
      return data.user;
    } catch (err) {
      const isNetworkError =
        err.name === 'AbortError' ||
        err.name === 'TypeError' ||
        err.message.includes('fetch') ||
        err.message.includes('Network') ||
        err.message.includes('Load failed') ||
        err.message.includes('Failed');

      if (isNetworkError) {
        return registerLocal(username, displayName, password, avatarColor);
      }
      throw err;
    }
  };

  const logout = () => clearSession();

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAdmin: user?.is_admin === 1
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return ctx;
}
