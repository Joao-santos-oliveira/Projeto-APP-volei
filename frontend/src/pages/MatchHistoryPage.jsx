import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../utils/constants';

const ACTION_LABELS = {
  attack_point: 'Ataque ✓', attack_error: 'Ataque ✗',
  serve_ace: 'Ace ✓', serve_error: 'Saque ✗',
  block_point: 'Bloqueio ✓', block_error: 'Bloqueio ✗',
  reception_error: 'Recepção ✗', setting_error: 'Levantamento ✗',
  fault: 'Falta', opponent_error: 'Erro Adv.'
};

export default function MatchHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMatch(id)
      .then(setMatch)
      .catch(() => { toast('Partida não encontrada', 'error'); navigate('/history'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!match) return null;

  const homeWins = match.sets?.filter(s => s.winner === 'home').length || 0;
  const awayWins = match.sets?.filter(s => s.winner === 'away').length || 0;

  return (
    <div className="page-container">
      <button className="btn btn-ghost" onClick={() => navigate('/history')} style={{ marginBottom:16 }}>
        <ArrowLeft size={16} /> Histórico
      </button>

      <div className="card" style={{ marginBottom:24, textAlign:'center' }}>
        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
          {formatDate(match.created_at)}
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, marginBottom:12 }}>
          {match.home_team} vs {match.away_team}
        </h1>
        <div style={{ display:'flex', justifyContent:'center', gap:24, marginBottom:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:56, fontWeight:900, color:'var(--home-color)', lineHeight:1 }}>{homeWins}</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{match.home_team}</div>
          </div>
          <div style={{ fontSize:36, fontWeight:300, color:'var(--text-muted)', alignSelf:'center' }}>×</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:56, fontWeight:900, color:'var(--away-color)', lineHeight:1 }}>{awayWins}</div>
            <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{match.away_team}</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
          {match.sets?.map(s => (
            <div key={s.id} className={`set-badge ${s.winner === 'home' ? 'home-win' : s.winner === 'away' ? 'away-win' : 'current'}`}>
              Set {s.set_number}: {s.home_score}–{s.away_score}
            </div>
          ))}
        </div>
      </div>

      {/* Jogadores escalados */}
      {match.home_players?.length > 0 && (
        <div className="card" style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-secondary)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Jogadores Escalados
          </h3>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {match.home_players.map(p => (
              <div key={p.id} style={{
                background:'var(--bg-elevated)', border:'1px solid var(--border)',
                borderRadius:8, padding:'6px 12px', fontSize:13, fontWeight:600, color:'var(--text-primary)'
              }}>
                {p.name} <span style={{ fontSize:11, color:'var(--text-muted)' }}>({p.primary_position})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log de pontos por set */}
      {match.sets?.map(set => {
        const setPoints = (match.points || []).filter(p => p.set_id === set.id);
        return (
          <div key={set.id} className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
                Set {set.set_number}
              </h3>
              <div style={{ display:'flex', gap:8 }}>
                <span style={{ fontSize:24, fontWeight:900, color:'var(--home-color)' }}>{set.home_score}</span>
                <span style={{ fontSize:24, fontWeight:300, color:'var(--text-muted)' }}>–</span>
                <span style={{ fontSize:24, fontWeight:900, color:'var(--away-color)' }}>{set.away_score}</span>
              </div>
            </div>

            {setPoints.length === 0 ? (
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhum ponto registrado neste set.</p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:300, overflowY:'auto' }}>
                {setPoints.map((pt, i) => (
                  <div key={pt.id} style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'8px 12px', borderRadius:8,
                    background: pt.team === 'home' ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)',
                    borderLeft: `3px solid ${pt.team === 'home' ? 'var(--home-color)' : 'var(--away-color)'}`,
                  }}>
                    <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:20 }}>#{i+1}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
                      {ACTION_LABELS[pt.action] || pt.action}
                      {pt.player_name && <span style={{ fontWeight:400, color:'var(--text-secondary)' }}> — {pt.player_nickname || pt.player_name}</span>}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700 }}>
                      <span style={{ color:'var(--home-color)' }}>{pt.home_score_after}</span>
                      <span style={{ color:'var(--text-muted)', margin:'0 4px' }}>–</span>
                      <span style={{ color:'var(--away-color)' }}>{pt.away_score_after}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
