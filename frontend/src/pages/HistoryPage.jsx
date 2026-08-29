import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/constants';
import { History, Calendar, Trophy, ChevronRight } from 'lucide-react';

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
      <div className="geo-page-header">
        <div className="geo-header-title-block">
          <div className="geo-eyebrow">REGISTRO DE CONFRONTOS</div>
          <h1 className="geo-main-title">HISTÓRICO DE PARTIDAS</h1>
          <p className="geo-sub-title">
            {matches.length} CONFRONTO{matches.length !== 1 ? 'S' : ''} CONCLUÍDO{matches.length !== 1 ? 'S' : ''}
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="geo-empty-panel">
          <History size={36} className="geo-empty-icon" />
          <div className="geo-empty-title">NENHUMA PARTIDA CONCLUÍDA</div>
          <div className="geo-empty-desc">Quando uma partida ao vivo for finalizada e consolidada, o relatório técnico completo ficará arquivado aqui.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {matches.map(m => {
            const hw = m.sets?.filter(s => s.winner === 'home').length || 0;
            const aw = m.sets?.filter(s => s.winner === 'away').length || 0;
            return (
              <div
                key={m.id}
                className="geo-panel"
                style={{
                  cursor: 'pointer', padding: '14px 18px', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 14,
                  transition: 'border-color 0.15s ease'
                }}
                onClick={() => navigate(`/history/${m.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-xs)', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--gold)', flexShrink: 0
                  }}>
                    <Trophy size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 14, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                      {m.home_team} VS {m.away_team}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {formatDate(m.created_at)} · MD{m.max_sets || 5} · {m.home_players?.length || 0} ATLETAS ESCALADOS
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'Space Grotesk, monospace', fontSize: 18, fontWeight: 900,
                    color: hw > aw ? '#10B981' : '#EF4444',
                    background: 'var(--bg-secondary)', padding: '4px 10px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)'
                  }}>
                    {hw} – {aw}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
