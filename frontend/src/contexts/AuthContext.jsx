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

  // Verificar token salvo ao carregar
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    verifyToken(token);
  }, []);

  const verifyToken = useCallback(async (t) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
      } else {
        clearSession();
      }
    } catch {
      // Backend offline — tentar localStore
      const storedUser = localStorage.getItem('volei_local_user');
      if (storedUser && t === localStorage.getItem('volei_token')) {
        setUser(JSON.parse(storedUser));
      } else {
        clearSession();
      }
    } finally {
      setLoading(false);
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

  const login = async (username, password) => {
    // Tenta backend primeiro
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao fazer login');
      saveSession(data.user, data.token);
      return data.user;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        // Modo offline — localStore
        return loginLocal(username, password);
      }
      throw err;
    }
  };

  const register = async (username, displayName, password, avatarColor) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, display_name: displayName, password, avatar_color: avatarColor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
      saveSession(data.user, data.token);
      return data.user;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        return registerLocal(username, displayName, password, avatarColor);
      }
      throw err;
    }
  };

  const logout = () => clearSession();

  // ── Modo offline (localStorage) ──────────────────────────────
  const loginLocal = (username, password) => {
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    const u = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!u || u.password !== password) throw new Error('Usuário ou senha incorretos');
    const fakeToken = `local_${u.id}_${Date.now()}`;
    saveSession(u, fakeToken);
    return u;
  };

  const registerLocal = (username, displayName, password, avatarColor) => {
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Nome de usuário já existe');
    }
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username: username.toLowerCase(),
      display_name: displayName,
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

  // Inicializa usuário admin local se não existir (modo offline)
  useEffect(() => {
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.is_admin === 1 }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
