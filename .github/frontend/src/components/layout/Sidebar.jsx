import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, Trophy, Activity, BarChart2, GitCompare,
  Menu, X, UsersRound, LogOut, Shield, UserCheck
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';
import UserManagerModal from '../modals/UserManagerModal';

const NAV_ITEMS = [
  { to: '/',          icon: Users,       label: 'ATLETAS',    mobileLabel: 'ATLETAS' },
  { to: '/teams',     icon: UsersRound,  label: 'TIMES',      mobileLabel: 'TIMES' },
  { to: '/matches',   icon: Trophy,      label: 'PARTIDAS',   mobileLabel: 'JOGOS' },
  { to: '/history',   icon: Activity,    label: 'HISTÓRICO',  mobileLabel: 'HISTÓRICO' },
  { to: '/dashboard', icon: BarChart2,   label: 'DASHBOARD',  mobileLabel: 'STATS' },
  { to: '/compare',   icon: GitCompare,  label: 'COMPARAR',   mobileLabel: 'COMPARAR' },
];

export default function Sidebar() {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userManagerOpen, setUserManagerOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin = user?.is_admin === 1 || user?.username?.toLowerCase() === 'admin';

  return (
    <>
      <UserManagerModal isOpen={userManagerOpen} onClose={() => setUserManagerOpen(false)} />

      {/* ── Mobile Top Header Bar ── */}
      <header className="geo-mobile-header">
        <Logo size={24} showText={true} />

        {user && (
          <button
            className="geo-mobile-user-trigger"
            onClick={() => setMobileDrawerOpen(true)}
            title="Menu do Perfil"
          >
            <div
              className="geo-user-dot"
              style={{
                backgroundColor: `${user.avatar_color || '#E5A93C'}30`,
                borderColor: user.avatar_color || '#E5A93C',
                color: user.avatar_color || '#E5A93C'
              }}
            >
              {user.display_name?.charAt(0).toUpperCase()}
            </div>
          </button>
        )}
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileDrawerOpen && (
        <div
          className="geo-drawer-backdrop"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div className={`geo-mobile-drawer ${mobileDrawerOpen ? 'is-open' : ''}`}>
        <div className="geo-drawer-header">
          <div className="geo-drawer-user">
            <div
              className="geo-user-dot"
              style={{
                backgroundColor: `${user?.avatar_color || '#E5A93C'}30`,
                borderColor: user?.avatar_color || '#E5A93C',
                color: user?.avatar_color || '#E5A93C'
              }}
            >
              {user?.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="geo-drawer-user-info">
              <span className="geo-drawer-name">{user?.display_name}</span>
              <span className="geo-drawer-role">
                @{user?.username} {isAdmin && '· ADMIN'}
              </span>
            </div>
          </div>
          <button className="geo-drawer-close" onClick={() => setMobileDrawerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="geo-drawer-nav">
          <div className="geo-drawer-section">MÓDULOS</div>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `geo-drawer-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileDrawerOpen(false)}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="geo-drawer-section" style={{ marginTop: '16px' }}>ADMINISTRAÇÃO</div>
              <button
                className="geo-drawer-link"
                style={{ width: '100%', justifyContent: 'flex-start', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setUserManagerOpen(true);
                }}
              >
                <UserCheck size={16} className="text-gold" />
                <span>GERENCIAR USUÁRIOS</span>
              </button>
            </>
          )}
        </nav>

        <div className="geo-drawer-footer">
          <button className="btn btn-danger w-full btn-sm" onClick={logout}>
            <LogOut size={14} /> ENCERRAR SESSÃO
          </button>
        </div>
      </div>

      {/* ── Desktop Geometric Sidebar ── */}
      <aside className="geo-desktop-sidebar">
        {/* Brand Header */}
        <div className="geo-sidebar-brand">
          <Logo size={32} showText={true} />
        </div>

        {/* Links Navigation */}
        <nav className="geo-sidebar-nav">
          <div className="geo-nav-heading">MENU DO SISTEMA</div>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `geo-sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} className="geo-link-icon" />
              <span className="geo-link-text">{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="geo-nav-heading" style={{ marginTop: '20px' }}>ADMINISTRAÇÃO</div>
              <button
                className="geo-sidebar-link"
                style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => setUserManagerOpen(true)}
              >
                <UserCheck size={16} className="geo-link-icon text-gold" />
                <span className="geo-link-text">USUÁRIOS</span>
              </button>
            </>
          )}
        </nav>

        {/* User Card Footer */}
        {user && (
          <div className="geo-sidebar-user-block">
            <div
              className="geo-user-profile-row"
              onClick={() => isAdmin && setUserManagerOpen(true)}
              style={{ cursor: isAdmin ? 'pointer' : 'default' }}
              title={isAdmin ? 'Clique para gerenciar usuários' : ''}
            >
              <div
                className="geo-sidebar-avatar"
                style={{
                  backgroundColor: `${user.avatar_color || '#E5A93C'}20`,
                  borderColor: user.avatar_color || '#E5A93C',
                  color: user.avatar_color || '#E5A93C'
                }}
              >
                {user.display_name?.charAt(0).toUpperCase()}
              </div>
              <div className="geo-user-text-col">
                <span className="geo-user-fullname">{user.display_name}</span>
                <span className="geo-user-role-tag">
                  {isAdmin ? 'COMISSÃO TÉCNICA' : 'SCOUT / ATLETA'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="geo-sidebar-logout-btn"
              title="Encerrar Sessão"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Mobile Bottom Navigation Bar (Fixed - All 6 Modules) ── */}
      <nav className="geo-mobile-bottom-bar">
        {NAV_ITEMS.map(({ to, icon: Icon, mobileLabel }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `geo-bottom-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            <span className="geo-bottom-label">{mobileLabel}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
