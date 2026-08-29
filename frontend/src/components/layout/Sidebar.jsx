import { NavLink, useLocation } from 'react-router-dom';
import {
  Users, Trophy, Activity, BarChart2, GitCompare,
  Menu, X, Star
} from 'lucide-react';
import { useState } from 'react';

const NAV_ITEMS = [
  { to: '/',          icon: Users,     label: 'Jogadores' },
  { to: '/matches',   icon: Trophy,    label: 'Partidas' },
  { to: '/history',   icon: Activity,  label: 'Histórico' },
  { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
  { to: '/compare',   icon: GitCompare,label: 'Comparar' },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile header bar */}
      <div className="mobile-header">
        <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div className="sidebar-logo-icon" style={{ width:32, height:32, fontSize:16 }}>🏐</div>
          <span style={{ fontWeight:800, fontSize:15 }}>Vôlei Manager</span>
        </div>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99 }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🏐</div>
          <div>
            <div className="sidebar-logo-text">Vôlei Manager</div>
            <div className="sidebar-logo-sub">Gestão de Time Amador</div>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft:'auto', display:'none' }}
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menu Principal</div>

          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding:'16px', borderTop:'1px solid var(--border)' }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
            v1.0.0 · Vôlei Manager
          </div>
        </div>
      </aside>
    </>
  );
}
