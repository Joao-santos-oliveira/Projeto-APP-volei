import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const PROD_API_URL = 'https://projeto-app-volei.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:3001/api';

const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? LOCAL_API_URL
    : PROD_API_URL
);

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

  // Inicializa usuário admin local se não existir no localStorage
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

  // ── Modo localStore / Offline ──────────────────────────────
  const loginLocal = (cleanUsername, cleanPassword) => {
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    const u = users.find(x =>
      x.username?.toLowerCase() === cleanUsername ||
      x.display_name?.toLowerCase() === cleanUsername
    );
    if (!u) {
      throw new Error('Usuário não encontrado');
    }
    if (u.password !== cleanPassword) {
      throw new Error('Senha incorreta para este usuário');
    }
    const fakeToken = `local_${u.id}_${Date.now()}`;
    saveSession(u, fakeToken);
    return u;
  };

  const registerLocal = (cleanUsername, cleanDisplayName, cleanPassword, avatarColor, explicitId) => {
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    const existingIndex = users.findIndex(x => x.username?.toLowerCase() === cleanUsername);
    
    const newUser = {
      id: explicitId || (existingIndex >= 0 ? users[existingIndex].id : (users.length > 0 ? Math.max(...users.map(x => x.id || 0)) + 1 : 1)),
      username: cleanUsername,
      display_name: cleanDisplayName,
      password: cleanPassword,
      avatar_color: avatarColor || '#3b82f6',
      is_admin: (cleanUsername === 'admin' || users.length === 0) ? 1 : 0,
      created_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }

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

    if (t.startsWith('local_')) {
      const storedUser = localStorage.getItem('volei_local_user');
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch { clearSession(); }
      } else {
        clearSession();
      }
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const u = await res.json();
        setUser(u);
      } else {
        const storedUser = localStorage.getItem('volei_local_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          clearSession();
        }
      }
    } catch {
      const storedUser = localStorage.getItem('volei_local_user');
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch { clearSession(); }
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
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        saveSession(data.user, data.token);
        
        // Sincroniza usuário autenticado com cache local
        try {
          const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
          const idx = users.findIndex(u => u.id === data.user.id || u.username?.toLowerCase() === cleanUser);
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...data.user };
          } else {
            users.push(data.user);
          }
          localStorage.setItem('volei_users', JSON.stringify(users));
        } catch { /* ignore */ }

        return data.user;
      }
    } catch (err) {
      console.warn('[AUTH] Servidor remoto inacessível, tentando credenciais locais...', err);
    }

    return loginLocal(cleanUser, cleanPass);
  };

  const register = async (username, displayName, password, avatarColor) => {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanName = (displayName || '').trim();
    const cleanPass = (password || '').trim();
    const color = avatarColor || '#3b82f6';

    let backendUser = null;
    let backendToken = null;

    // 1. Registra no backend com timeout seguro
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          display_name: cleanName,
          password: cleanPass,
          avatar_color: color
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar usuário');
      }
      backendUser = data.user;
      backendToken = data.token;
    } catch (err) {
      if (err.message && (err.message.includes('já existe') || err.message.includes('obrigatórios'))) {
        throw err;
      }
      console.warn('[AUTH] Falha ao registrar no backend, salvando localmente:', err);
    }

    // 2. Registra e sincroniza sempre no armazenamento local
    const localUser = registerLocal(cleanUser, cleanName, cleanPass, color, backendUser?.id);

    if (backendUser && backendToken) {
      saveSession(backendUser, backendToken);
      return backendUser;
    }

    return localUser;
  };

  const resetPassword = async (username, newPassword) => {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (newPassword || '').trim();

    let backendUser = null;
    let backendToken = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, new_password: cleanPass }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        backendUser = data.user;
        backendToken = data.token;
      }
    } catch (e) {
      // Backend offline
    }

    // Atualiza também no localStore
    const users = JSON.parse(localStorage.getItem('volei_users') || '[]');
    const idx = users.findIndex(x => x.username?.toLowerCase() === cleanUser || x.display_name?.toLowerCase() === cleanUser);
    if (idx >= 0) {
      users[idx].password = cleanPass;
      localStorage.setItem('volei_users', JSON.stringify(users));
      const fakeToken = `local_${users[idx].id}_${Date.now()}`;
      saveSession(users[idx], fakeToken);
      return users[idx];
    }

    if (backendUser && backendToken) {
      saveSession(backendUser, backendToken);
      return backendUser;
    }

    throw new Error('Usuário não encontrado');
  };

  const logout = () => clearSession();

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      resetPassword,
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
