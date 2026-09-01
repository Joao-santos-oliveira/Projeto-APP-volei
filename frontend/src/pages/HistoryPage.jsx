import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/constants';
import { getMatchHighlights, processPopularVotes } from '../utils/matchMvp';
import { History, Calendar, Trophy, ChevronRight, Heart } from 'lucide-react';

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
            const highlights = getMatchHighlights(m);
            const mvp = highlights.mvp;
            const popularData = processPopularVotes(m.votes || [], highlights.playerStats);
            const popularMvp = popularData.popularMvp;

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
                    width: 40, height: 40, borderRadius: 'var(--radius-xs)', background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--gold)', flexShrink: 0
                  }}>
                    <Trophy size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 14, color: '#FFFFFF', letterSpacing: '0.04em' }}>
                        {m.home_team} VS {m.away_team}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {formatDate(m.created_at)} · MD{m.max_sets || 5}
                      </span>

                      {mvp && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: 'rgba(245,183,56,0.12)',
                          color: 'var(--gold)',
                          border: '1px solid rgba(245,183,56,0.3)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          👑 MVP: {mvp.nickname || mvp.name} ({mvp.totalPoints} pts)
                        </span>
                      )}

                      {popularMvp && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          background: 'rgba(236,72,153,0.12)',
                          color: '#F472B6',
                          border: '1px solid rgba(236,72,153,0.3)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Heart size={10} /> Galera: {popularMvp.nickname || popularMvp.name}
                        </span>
                      )}
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
