import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AVATAR_COLORS } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, LogIn, UserPlus, Shield } from 'lucide-react';
import Logo from '../components/ui/Logo';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const toast = useToast();

  // Login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register
  const [regForm, setRegForm] = useState({ username: '', display_name: '', password: '', avatar_color: '#3b82f6' });
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.password) return;
    setLoginLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
      toast('Bem-vindo!', 'success');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.username || !regForm.display_name || !regForm.password) return;
    if (regForm.password.length < 4) { toast('Senha precisa ter no mínimo 4 caracteres', 'error'); return; }
    setRegLoading(true);
    try {
      await register(regForm.username, regForm.display_name, regForm.password, regForm.avatar_color);
      toast('Conta criada! Bem-vindo!', 'success');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, position: 'relative', overflow: 'hidden'
    }}>
      {/* Fundo decorativo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(245,197,24,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%)'
      }} />

      {/* Card principal */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 24, width: '100%', maxWidth: 440, padding: 40,
        position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28, display: 'flex', justifyContent: 'center' }}>
          <Logo size={48} showText={true} textStyle={{ textAlign: 'left' }} />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
          background: 'var(--bg-elevated)', borderRadius: 12, padding: 4, marginBottom: 28
        }}>
          {[
            { key: 'login', icon: <LogIn size={15} />, label: 'Entrar' },
            { key: 'register', icon: <UserPlus size={15} />, label: 'Criar Conta' }
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                color: tab === t.key ? 'var(--text-accent)' : 'var(--text-muted)',
                border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: tab === t.key ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Login Form ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Usuário</label>
              <input className="form-input" autoFocus autoComplete="username"
                placeholder="Seu nome de usuário"
                value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" autoComplete="current-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={loginForm.password}
                  style={{ paddingRight: 44 }}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4
                  }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: 4, fontSize: 15, padding: '12px' }}
              disabled={loginLoading || !loginForm.username || !loginForm.password}>
              {loginLoading ? 'Entrando...' : <><LogIn size={16} /> Entrar</>}
            </button>
          </form>
        )}

        {/* ── Register Form ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome de usuário</label>
                <input className="form-input" autoFocus autoComplete="username"
                  placeholder="ex: joao_gabriel"
                  value={regForm.username}
                  onChange={e => setRegForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '') }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Como quer ser chamado?</label>
                <input className="form-input" autoComplete="name"
                  placeholder="ex: João"
                  value={regForm.display_name}
                  onChange={e => setRegForm(f => ({ ...f, display_name: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showRegPwd ? 'text' : 'password'}
                  placeholder="Mínimo 4 caracteres" autoComplete="new-password"
                  value={regForm.password}
                  style={{ paddingRight: 44 }}
                  onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} />
                <button type="button" onClick={() => setShowRegPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4
                  }}>
                  {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Cor do avatar */}
            <div className="form-group">
              <label className="form-label">Cor do Avatar</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {AVATAR_COLORS.map(c => (
                  <button key={c} type="button"
                    onClick={() => setRegForm(f => ({ ...f, avatar_color: c }))}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', background: c,
                      border: regForm.avatar_color === c ? '3px solid white' : '2px solid transparent',
                      cursor: 'pointer',
                      boxShadow: regForm.avatar_color === c ? `0 0 0 2px ${c}` : 'none',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>
              {/* Preview do avatar */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: `${regForm.avatar_color}22`,
                  border: `2px solid ${regForm.avatar_color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: regForm.avatar_color
                }}>
                  {regForm.display_name ? regForm.display_name.charAt(0).toUpperCase() : '?'}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {regForm.display_name || 'Seu nome'}
                </span>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: 4, fontSize: 15, padding: '12px' }}
              disabled={regLoading || !regForm.username || !regForm.display_name || !regForm.password}>
              {regLoading ? 'Criando conta...' : <><UserPlus size={16} /> Criar Conta</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
