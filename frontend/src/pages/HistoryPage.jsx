import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/constants';

export default function HistoryPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    api.getMatches()
      .then(data => setMatches(data.filter(m => m.status === 'finished')))
      .catch(() => toast('Erro ao carregar histórico', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Histórico</h1>
          <p className="page-subtitle">{matches.length} partida{matches.length !== 1 ? 's' : ''} finalizada{matches.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Nenhuma partida finalizada</h3>
          <p>Crie e finalize uma partida para vê-la aqui.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {matches.map(m => {
            const hw = m.sets?.filter(s => s.winner === 'home').length || 0;
            const aw = m.sets?.filter(s => s.winner === 'away').length || 0;
            return (
              <div key={m.id} className="history-item" style={{ cursor:'pointer' }}
                onClick={() => navigate(`/history/${m.id}`)}>
                <div style={{
                  width:48, height:48, borderRadius:12, background:'var(--bg-input)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0
                }}>
                  🏐
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                    {m.home_team} vs {m.away_team}
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>
                    {formatDate(m.created_at)} · {m.home_players?.length || 0} jogadores
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:22, fontWeight:900, color:hw > aw ? 'var(--success)' : 'var(--danger)' }}>{hw}</span>
                  <span style={{ color:'var(--text-muted)' }}>×</span>
                  <span style={{ fontSize:22, fontWeight:900, color:aw > hw ? 'var(--success)' : 'var(--danger)' }}>{aw}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
