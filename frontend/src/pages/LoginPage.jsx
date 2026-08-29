import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, AVATAR_COLORS } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, LogIn, UserPlus, KeyRound } from 'lucide-react';
import Logo from '../components/ui/Logo';

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'reset'
  const navigate = useNavigate();
  const { login, register, resetPassword } = useAuth();
  const toast = useToast();

  // Login
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register
  const [regForm, setRegForm] = useState({ username: '', display_name: '', password: '', avatar_color: '#3b82f6' });
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Reset Password
  const [resetForm, setResetForm] = useState({ username: '', new_password: '' });
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password) return;
    setLoginLoading(true);
    try {
      await login(loginForm.username, loginForm.password);
      toast('Login realizado com sucesso!', 'success');
      navigate('/');
    } catch (err) {
      toast(err.message || 'Usuário ou senha incorretos', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.username.trim() || !regForm.display_name.trim() || !regForm.password) return;
    if (regForm.password.length < 4) {
      toast('A senha precisa ter no mínimo 4 caracteres', 'error');
      return;
    }
    setRegLoading(true);
    try {
      await register(regForm.username, regForm.display_name, regForm.password, regForm.avatar_color);
      toast('Conta criada com sucesso!', 'success');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setRegLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetForm.username.trim() || !resetForm.new_password) return;
    if (resetForm.new_password.length < 4) {
      toast('A nova senha precisa ter no mínimo 4 caracteres', 'error');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(resetForm.username, resetForm.new_password);
      toast('Senha redefinida com sucesso!', 'success');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setResetLoading(false);
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
        background: 'radial-gradient(ellipse at 20% 50%, rgba(229,169,60,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.06) 0%, transparent 60%)'
      }} />

      {/* Card principal */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 440, padding: '36px 32px',
        position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 26, display: 'flex', justifyContent: 'center' }}>
          <Logo size={46} showText={true} textStyle={{ textAlign: 'left' }} />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
          background: 'var(--bg-elevated)', borderRadius: 8, padding: 3, marginBottom: 24
        }}>
          {[
            { key: 'login',    icon: <LogIn size={13} />,     label: 'ENTRAR' },
            { key: 'register', icon: <UserPlus size={13} />,  label: 'CRIAR' },
            { key: 'reset',    icon: <KeyRound size={13} />,  label: 'REDEFINIR' }
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '8px 6px', borderRadius: 6, fontWeight: 800, fontSize: 11,
                letterSpacing: '0.04em',
                background: tab === t.key ? 'var(--gold)' : 'transparent',
                color: tab === t.key ? '#000000' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Login Form ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">USUÁRIO OU APELIDO</label>
              <input
                className="form-input"
                autoFocus
                autoComplete="username"
                placeholder="Nome de usuário ou apelido"
                value={loginForm.username}
                onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">SENHA</label>
                <button
                  type="button"
                  onClick={() => setTab('reset')}
                  style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.04em' }}
                >
                  ESQUECEU A SENHA?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  autoComplete="current-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Sua senha de acesso"
                  value={loginForm.password}
                  style={{ paddingRight: 44 }}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gold w-full"
              style={{ marginTop: 6, fontSize: 13, padding: '12px' }}
              disabled={loginLoading || !loginForm.username.trim() || !loginForm.password}
            >
              {loginLoading ? 'ENTRANDO...' : <><LogIn size={15} /> ACESSAR SISTEMA</>}
            </button>
          </form>
        )}

        {/* ── Register Form ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">NOME DE USUÁRIO (LOGIN)</label>
              <input
                className="form-input"
                autoFocus
                autoComplete="username"
                placeholder="ex: joao, tecnico_rafa"
                value={regForm.username}
                onChange={e => setRegForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '') }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">COMO QUER SER CHAMADO?</label>
              <input
                className="form-input"
                autoComplete="name"
                placeholder="ex: João Silva"
                value={regForm.display_name}
                onChange={e => setRegForm(f => ({ ...f, display_name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">SENHA</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showRegPwd ? 'text' : 'password'}
                  placeholder="Mínimo 4 caracteres"
                  autoComplete="new-password"
                  value={regForm.password}
                  style={{ paddingRight: 44 }}
                  onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4
                  }}
                >
                  {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Cor do Avatar */}
            <div className="form-group">
              <label className="form-label">COR DO PERFIL</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setRegForm(f => ({ ...f, avatar_color: c }))}
                    style={{
                      width: 24, height: 24, borderRadius: 4,
                      background: c,
                      border: regForm.avatar_color === c ? '2px solid #FFFFFF' : '1px solid var(--border)',
                      cursor: 'pointer', transform: regForm.avatar_color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gold w-full"
              style={{ marginTop: 6, fontSize: 13, padding: '12px' }}
              disabled={regLoading || !regForm.username.trim() || !regForm.display_name.trim() || !regForm.password}
            >
              {regLoading ? 'CADASTRANDO...' : <><UserPlus size={15} /> CRIAR CONTA & ENTRAR</>}
            </button>
          </form>
        )}

        {/* ── Reset Password Form ── */}
        {tab === 'reset' && (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">SEU NOME DE USUÁRIO</label>
              <input
                className="form-input"
                autoFocus
                placeholder="Informe seu usuário ou apelido"
                value={resetForm.username}
                onChange={e => setResetForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">NOVA SENHA</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type={showResetPwd ? 'text' : 'password'}
                  placeholder="Digite sua nova senha"
                  value={resetForm.new_password}
                  style={{ paddingRight: 44 }}
                  onChange={e => setResetForm(f => ({ ...f, new_password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPwd(s => !s)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4
                  }}
                >
                  {showResetPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gold w-full"
              style={{ marginTop: 6, fontSize: 13, padding: '12px' }}
              disabled={resetLoading || !resetForm.username.trim() || !resetForm.new_password}
            >
              {resetLoading ? 'REDEFININDO...' : <><KeyRound size={15} /> SALVAR NOVA SENHA & ENTRAR</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
