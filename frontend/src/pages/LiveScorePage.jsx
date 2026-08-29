import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, CheckCircle, Plus, ChevronDown } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { POINT_ACTIONS, getInitials } from '../utils/constants';
import PlayerForm from '../components/players/PlayerForm';
import Modal from '../components/ui/Modal';

export default function LiveScorePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [match, setMatch] = useState(null);
  const [sets, setSets] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pointPanel, setPointPanel] = useState(null); // 'home' | 'away'
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [logging, setLogging] = useState(false);
  const [showNewPlayer, setShowNewPlayer] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getMatch(id);
      setMatch(data);
      setSets(data.sets || []);
      setHomePlayers(data.home_players || []);
    } catch {
      toast('Partida não encontrada', 'error');
      navigate('/matches');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const currentSet = sets.find(s => !s.finished) || sets[sets.length - 1];

  const handlePointClick = (team) => {
    setPointPanel(team);
    setSelectedPlayer(null);
    setSelectedAction(null);
  };

  const handleLogPoint = async () => {
    if (!selectedAction) { toast('Selecione como o ponto ocorreu', 'info'); return; }
    setLogging(true);
    try {
      const res = await api.addPoint(id, {
        team: pointPanel,
        player_id: selectedPlayer || null,
        action: selectedAction
      });
      setSets(res.sets);
      setMatch(res.match);
      setPointPanel(null);

      if (res.matchFinished) {
        toast('🏆 Partida encerrada!', 'success');
      } else if (res.setFinished) {
        toast(`Set ${currentSet?.set_number} encerrado!`, 'info');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLogging(false);
    }
  };

  const handleUndo = async () => {
    try {
      const res = await api.undoPoint(id);
      setSets(res.sets);
      toast('Ponto desfeito', 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleFinish = async () => {
    if (!window.confirm('Finalizar partida?')) return;
    try {
      await api.finishMatch(id);
      toast('Partida finalizada!', 'success');
      navigate(`/history/${id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleNewPlayer = async (data) => {
    try {
      const newP = await api.createPlayer(data);
      toast(`${newP.name} adicionado!`, 'success');
      setShowNewPlayer(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!match) return null;

  const homeScore = currentSet?.home_score ?? 0;
  const awayScore = currentSet?.away_score ?? 0;
  const homeWins = sets.filter(s => s.winner === 'home').length;
  const awayWins = sets.filter(s => s.winner === 'away').length;

  const pointActions = selectedAction
    ? POINT_ACTIONS
    : pointPanel === 'home'
      ? POINT_ACTIONS
      : POINT_ACTIONS;

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-primary)', display:'flex', flexDirection:'column' }}>
      {/* Top bar */}
      <div style={{
        background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)',
        padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between'
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matches')}>← Partidas</button>
        <div style={{ display:'flex', gap:8 }}>
          {match.status === 'live' && (
            <span style={{
              fontSize:11, fontWeight:700, color:'var(--success)', textTransform:'uppercase',
              letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:4
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--success)', display:'inline-block', animation:'pulse 1.5s infinite' }} />
              AO VIVO
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleUndo}>
            <RotateCcw size={14} /> Desfazer
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleFinish}>
            <CheckCircle size={14} /> Encerrar
          </button>
        </div>
      </div>

      {/* Placar principal */}
      <div className="scoreboard" style={{ margin:'20px', flex:'none' }}>
        <div style={{ padding:'12px 20px 8px', textAlign:'center' }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            {match.home_team} vs {match.away_team}
          </div>
        </div>

        {/* Sets ganhos */}
        <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', paddingBottom:8 }}>
          {sets.map((s, i) => {
            const cls = s.finished
              ? (s.winner === 'home' ? 'home-win' : 'away-win')
              : 'current';
            return (
              <div key={s.id} className={`set-badge ${cls}`}>
                Set {s.set_number}: {s.home_score}–{s.away_score}
              </div>
            );
          })}
        </div>

        {/* Placar atual */}
        <div className="score-display">
          <div className="score-team">
            <div className="score-team-name">{match.home_team}</div>
            <div className="score-number home" style={{ fontSize:80 }}>{homeScore}</div>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--home-color)' }}>{homeWins} sets</div>
          </div>
          <div className="score-sep">×</div>
          <div className="score-team">
            <div className="score-team-name">{match.away_team}</div>
            <div className="score-number away" style={{ fontSize:80 }}>{awayScore}</div>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--away-color)' }}>{awayWins} sets</div>
          </div>
        </div>
      </div>

      {/* Botões de ponto — GRANDES para usar em quadra */}
      {match.status === 'live' && !pointPanel && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, margin:'0 20px 20px', flex:1 }}>
          <button
            className="btn"
            style={{
              background:'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.1))',
              border:'2px solid var(--home-color)', color:'var(--home-color)',
              borderRadius:20, fontSize:22, fontWeight:800, minHeight:120,
              flexDirection:'column', gap:8, letterSpacing:0
            }}
            onClick={() => handlePointClick('home')}
          >
            <span style={{ fontSize:32 }}>⬆️</span>
            NOSSO PONTO
          </button>
          <button
            className="btn"
            style={{
              background:'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
              border:'2px solid var(--away-color)', color:'var(--away-color)',
              borderRadius:20, fontSize:22, fontWeight:800, minHeight:120,
              flexDirection:'column', gap:8, letterSpacing:0
            }}
            onClick={() => handlePointClick('away')}
          >
            <span style={{ fontSize:32 }}>⬆️</span>
            PONTO DELES
          </button>
        </div>
      )}

      {/* Painel de detalhamento do ponto */}
      {pointPanel && (
        <div style={{
          margin:'0 20px 20px',
          background:'var(--bg-card)',
          border:'1px solid var(--border)',
          borderRadius:20,
          overflow:'hidden'
        }}>
          {/* Header do painel */}
          <div style={{
            padding:'16px 20px',
            background: pointPanel === 'home' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
            borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between'
          }}>
            <div style={{ fontWeight:700, color: pointPanel === 'home' ? 'var(--home-color)' : 'var(--away-color)' }}>
              {pointPanel === 'home' ? '⬆️ Nosso Ponto' : '⬆️ Ponto do Adversário'}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPointPanel(null)}>Cancelar</button>
          </div>

          <div style={{ padding:20, display:'flex', flexDirection:'column', gap:20 }}>
            {/* Quem fez */}
            {pointPanel === 'home' && homePlayers.length > 0 && (
              <div>
                <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--text-secondary)', marginBottom:10, letterSpacing:'0.06em' }}>
                  Quem fez? (opcional)
                </div>
                <div className="player-selector">
                  {homePlayers.map(p => (
                    <button key={p.id} type="button"
                      className={`player-selector-btn${selectedPlayer === p.id ? ' selected' : ''}`}
                      onClick={() => setSelectedPlayer(selectedPlayer === p.id ? null : p.id)}
                    >
                      <div className="player-selector-avatar">
                        {p.photo ? <img src={p.photo} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} />
                          : getInitials(p.name)}
                      </div>
                      <span>{p.nickname || p.name.split(' ')[0]}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="player-selector-btn"
                    onClick={() => setShowNewPlayer(true)}
                    style={{ borderStyle:'dashed', color:'var(--text-muted)' }}
                  >
                    <div className="player-selector-avatar" style={{ background:'transparent', border:'1px dashed var(--border)' }}>
                      <Plus size={16} />
                    </div>
                    <span>Novo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Como ocorreu */}
            <div>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', color:'var(--text-secondary)', marginBottom:10, letterSpacing:'0.06em' }}>
                Como ocorreu? *
              </div>
              <div className="action-grid">
                {POINT_ACTIONS.map(action => (
                  <button key={action.key} type="button"
                    className={`action-btn ${action.type}${selectedAction === action.key ? ' selected' : ''}`}
                    onClick={() => setSelectedAction(action.key)}
                  >
                    <span style={{ fontSize:20 }}>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmar */}
            <button
              className="btn btn-primary btn-lg btn-full"
              onClick={handleLogPoint}
              disabled={!selectedAction || logging}
            >
              {logging ? 'Registrando...' : '✓ Confirmar Ponto'}
            </button>
          </div>
        </div>
      )}

      {match.status === 'finished' && (
        <div style={{ textAlign:'center', padding:40 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🏆</div>
          <h2 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Partida Encerrada!</h2>
          <p style={{ color:'var(--text-secondary)', marginBottom:20 }}>
            {homeWins > awayWins ? match.home_team : match.away_team} venceu por {homeWins}×{awayWins} sets
          </p>
          <button className="btn btn-primary" onClick={() => navigate(`/history/${id}`)}>
            Ver Detalhes
          </button>
        </div>
      )}

      {/* Modal novo jogador */}
      {showNewPlayer && (
        <Modal title="Novo Jogador (Rápido)" onClose={() => setShowNewPlayer(false)}>
          <PlayerForm isQuick onSave={handleNewPlayer} onCancel={() => setShowNewPlayer(false)} />
        </Modal>
      )}
    </div>
  );
}
