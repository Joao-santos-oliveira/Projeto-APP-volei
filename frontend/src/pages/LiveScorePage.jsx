import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, CheckCircle, Plus, ArrowLeft, Shield, Award, AlertCircle, Users, Trophy } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { POINT_ACTIONS, getInitials } from '../utils/constants';
import { getMatchHighlights } from '../utils/matchMvp';
import PlayerForm from '../components/players/PlayerForm';
import Modal from '../components/ui/Modal';

export default function LiveScorePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [match, setMatch] = useState(null);
  const [sets, setSets] = useState([]);
  const [homePlayers, setHomePlayers] = useState([]);
  const [awayPlayers, setAwayPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pointPanel, setPointPanel] = useState(null); // 'home' | 'away'
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [playerTab, setPlayerTab] = useState('home'); // 'home' | 'away'
  const [logging, setLogging] = useState(false);
  const [showNewPlayer, setShowNewPlayer] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getMatch(id);
      setMatch(data);
      setSets(data.sets || []);
      setHomePlayers(data.home_players || []);
      setAwayPlayers(data.away_players || []);
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
    setPlayerTab(team); // default to scoring team
  };

  const handleActionSelect = (actionKey) => {
    setSelectedAction(actionKey);
    const actionObj = POINT_ACTIONS.find(a => a.key === actionKey);

    // Se a ação for de erro (ex: erro de saque, recepção, ataque adversário),
    // troca automaticamente a aba de atletas para o time ADVERSÁRIO para facilitar a escolha do culpado pelo erro!
    if (actionObj?.type === 'error') {
      const opponentTeam = pointPanel === 'home' ? 'away' : 'home';
      setPlayerTab(opponentTeam);
    } else {
      setPlayerTab(pointPanel);
    }
  };

  const handleLogPoint = async () => {
    if (!selectedAction) {
      toast('Selecione o fundamento que gerou o ponto', 'info');
      return;
    }
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
        toast('Partida encerrada automaticamente por pontuação', 'success');
        navigate(`/history/${id}`);
      } else if (res.setFinished) {
        toast(`Set ${currentSet?.set_number} finalizado`, 'info');
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
      toast('Último ponto desfeito', 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const confirmFinishMatch = async () => {
    setFinishing(true);
    try {
      await api.finishMatch(id);
      toast('Partida consolidada e finalizada', 'success');
      setShowFinishConfirm(false);
      navigate(`/history/${id}`);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setFinishing(false);
    }
  };

  const handleNewPlayer = async (data) => {
    try {
      const newP = await api.createPlayer(data);
      toast(`${newP.name} cadastrado`, 'success');
      setShowNewPlayer(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!match) return null;

  const homeScore = currentSet ? currentSet.home_score : 0;
  const awayScore = currentSet ? currentSet.away_score : 0;
  const homeWins  = sets.filter(s => s.finished && s.winner === 'home').length;
  const awayWins  = sets.filter(s => s.finished && s.winner === 'away').length;

  const activePlayersList = playerTab === 'home' ? homePlayers : awayPlayers;
  const isSelectedActionError = POINT_ACTIONS.find(a => a.key === selectedAction)?.type === 'error';

  return (
    <div className="page-container live-score-page">
      {/* ── Top Match Control Bar ── */}
      <div className="geo-top-action-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/matches')}>
            <ArrowLeft size={14} /> PARTIDAS
          </button>
          <div className="geo-live-indicator">
            <span className="geo-live-dot" />
            <span>AO VIVO</span>
          </div>
        </div>

        <div className="geo-action-cluster">
          <button className="btn btn-secondary btn-sm" onClick={handleUndo} title="Desfazer último ponto">
            <RotateCcw size={13} /> DESFAZER
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => setShowFinishConfirm(true)}>
            <CheckCircle size={13} /> ENCERRAR
          </button>
        </div>
      </div>

      {/* ── Scoreboard Digital Pro ── */}
      <div className="geo-scoreboard-panel">
        <div className="geo-scoreboard-top-bar">
          <span className="geo-match-title-track">
            {match.home_team.toUpperCase()} VS {match.away_team.toUpperCase()}
          </span>
          <span className="geo-set-current-tag">
            SET {currentSet ? currentSet.set_number : 1} DE {match.max_sets || 5}
          </span>
        </div>

        {/* Set History Chips */}
        {sets.length > 0 && (
          <div className="geo-set-chips-row">
            {sets.map(s => {
              const isCurrent = s.id === currentSet?.id && !s.finished;
              const isHomeWin = s.finished && s.winner === 'home';
              const isAwayWin = s.finished && s.winner === 'away';

              return (
                <div
                  key={s.id}
                  className={`geo-set-chip ${isCurrent ? 'current' : ''} ${isHomeWin ? 'home-win' : ''} ${isAwayWin ? 'away-win' : ''}`}
                >
                  <span className="set-num">SET {s.set_number}</span>
                  <span className="set-score-digits">{s.home_score} – {s.away_score}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Big Dual Scores */}
        <div className="geo-score-board-grid">
          {/* Home Team */}
          <div className="geo-team-score-column home">
            <span className="geo-team-name-label">{match.home_team}</span>
            <div className="geo-big-point-number home-color">{homeScore}</div>
            <div className="geo-sets-won-tag">{homeWins} SET{homeWins !== 1 ? 'S' : ''} VENCIDO{homeWins !== 1 ? 'S' : ''}</div>
          </div>

          <div className="geo-score-divider-middle">
            <span>VS</span>
          </div>

          {/* Away Team */}
          <div className="geo-team-score-column away">
            <span className="geo-team-name-label">{match.away_team}</span>
            <div className="geo-big-point-number away-color">{awayScore}</div>
            <div className="geo-sets-won-tag">{awayWins} SET{awayWins !== 1 ? 'S' : ''} VENCIDO{awayWins !== 1 ? 'S' : ''}</div>
          </div>
        </div>
      </div>

      {/* ── Large Point Trigger Buttons ── */}
      {match.status === 'live' && !pointPanel && (
        <div className="geo-point-triggers-grid">
          <button
            className="geo-trigger-btn home-trigger"
            onClick={() => handlePointClick('home')}
          >
            <span className="trigger-team-tag">PONTO</span>
            <span className="trigger-team-name">{match.home_team.toUpperCase()}</span>
          </button>

          <button
            className="geo-trigger-btn away-trigger"
            onClick={() => handlePointClick('away')}
          >
            <span className="trigger-team-tag">PONTO</span>
            <span className="trigger-team-name">{match.away_team.toUpperCase()}</span>
          </button>
        </div>
      )}

      {/* ── Point Details Logger Panel ── */}
      {pointPanel && (
        <div className="geo-point-logger-card">
          <div className="geo-logger-header" style={{
            borderLeftColor: pointPanel === 'home' ? 'var(--team-blue)' : 'var(--team-red)'
          }}>
            <div>
              <div className="geo-eyebrow">REGISTRO DE SCOUTING</div>
              <h3 className="geo-panel-title">
                PONTO PARA {pointPanel === 'home' ? match.home_team.toUpperCase() : match.away_team.toUpperCase()}
              </h3>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setPointPanel(null)}>
              CANCELAR
            </button>
          </div>

          <div className="geo-logger-body">
            {/* Fundamento que gerou o ponto */}
            <div className="geo-logger-section">
              <div className="geo-section-sub-label">1. FUNDAMENTO TÁTICO *</div>
              <div className="geo-action-button-grid">
                {POINT_ACTIONS.map(action => {
                  const isSelected = selectedAction === action.key;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      className={`geo-action-tile ${action.type} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleActionSelect(action.key)}
                    >
                      <span className="action-code">{action.code}</span>
                      <span className="action-label">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atleta executor OU que cometeu o erro */}
            <div className="geo-logger-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                <div className="geo-section-sub-label">
                  2. {isSelectedActionError ? 'ATLETA QUE COMETEU O ERRO (OPCIONAL)' : 'ATLETA RESPONSÁVEL PELO PONTO (OPCIONAL)'}
                </div>

                {/* Team Switcher Tabs (Permite selecionar jogador do mandante ou visitante) */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${playerTab === 'home' ? 'btn-gold' : 'btn-secondary'}`}
                    style={{ fontSize: 10, padding: '4px 8px' }}
                    onClick={() => setPlayerTab('home')}
                  >
                    {match.home_team.toUpperCase()} ({homePlayers.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${playerTab === 'away' ? 'btn-gold' : 'btn-secondary'}`}
                    style={{ fontSize: 10, padding: '4px 8px' }}
                    onClick={() => setPlayerTab('away')}
                  >
                    {match.away_team.toUpperCase()} ({awayPlayers.length})
                  </button>
                </div>
              </div>

              {/* Chips de Jogadores da Equipe Selecionada */}
              <div className="geo-player-select-chips">
                {activePlayersList.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '6px 0' }}>
                    Nenhum atleta vinculado a esta equipe nesta partida.
                  </div>
                ) : (
                  activePlayersList.map(p => {
                    const isSelected = selectedPlayer === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`geo-athlete-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedPlayer(isSelected ? null : p.id)}
                      >
                        <div className="geo-chip-avatar">
                          {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                        </div>
                        <div className="geo-chip-meta">
                          <span className="geo-chip-name">{p.nickname || p.name.split(' ')[0]}</span>
                          <span className="geo-chip-pos">{p.primary_position}</span>
                        </div>
                      </button>
                    );
                  })
                )}
                <button
                  type="button"
                  className="geo-athlete-chip add-chip"
                  onClick={() => setShowNewPlayer(true)}
                >
                  <Plus size={14} />
                  <span>CADASTRAR ATLETA</span>
                </button>
              </div>
            </div>

            {/* Botão de Confirmação */}
            <div className="geo-logger-footer">
              <button
                className="btn btn-gold w-full btn-lg"
                onClick={handleLogPoint}
                disabled={!selectedAction || logging}
              >
                {logging ? 'REGISTRANDO...' : 'CONFIRMAR PONTO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmação Encerrar Partida */}
      {showFinishConfirm && (() => {
        const highlights = match ? getMatchHighlights({ ...match, home_players: homePlayers, away_players: awayPlayers }) : null;
        const mvp = highlights?.mvp;

        return (
          <Modal title="CONSOLIDAR E ENCERRAR PARTIDA" onClose={() => setShowFinishConfirm(false)}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(245,183,56,0.15)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 0 20px rgba(245,183,56,0.2)' }}>
                <Trophy size={28} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 17, fontWeight: 900, color: '#FFFFFF', marginBottom: 6, letterSpacing: '0.04em' }}>
                  CONSOLIDAR VITÓRIA & GERAR SCOUT
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  O placar será registrado no histórico e o relatório completo de estatísticas será gerado.
                </p>
              </div>

              {mvp && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245,183,56,0.12), rgba(15,23,42,0.6))',
                  border: '1px solid rgba(245,183,56,0.4)',
                  borderRadius: 12,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'var(--gold)',
                      color: '#0F172A',
                      fontWeight: 900,
                      fontSize: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 12px rgba(245,183,56,0.3)'
                    }}>
                      {getInitials(mvp.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        👑 CRAQUE DA PARTIDA (SCOUT)
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>
                        {mvp.nickname || mvp.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {mvp.team === 'home' ? match.home_team : match.away_team} · {mvp.position}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold)', fontFamily: 'Space Grotesk, monospace' }}>
                      {mvp.totalPoints} PTS
                    </div>
                    <div style={{ fontSize: 10, color: mvp.balance >= 0 ? '#10B981' : 'var(--danger)', fontWeight: 700 }}>
                      Saldo: {mvp.balance >= 0 ? `+${mvp.balance}` : mvp.balance}
                    </div>
                  </div>
                </div>
              )}

              <div style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 11,
                color: '#93C5FD',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                textAlign: 'left'
              }}>
                <span style={{ fontSize: 16 }}>🗳️</span>
                <span>
                  <strong>Votação Popular:</strong> Ao encerrar, a votação do <strong>Craque da Galera</strong> ficará aberta por <strong>2 horas</strong> para a torcida votar.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => setShowFinishConfirm(false)} disabled={finishing}>
                  VOLTAR AO JOGO
                </button>
                <button className="btn btn-gold" onClick={confirmFinishMatch} disabled={finishing}>
                  {finishing ? 'FINALIZANDO...' : 'SIM, CONSOLIDAR E VER SCOUT'}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal Novo Jogador Rápido */}
      {showNewPlayer && (
        <Modal title="CADASTRAR ATLETA RÁPIDO" onClose={() => setShowNewPlayer(false)}>
          <PlayerForm isQuick onSave={handleNewPlayer} onCancel={() => setShowNewPlayer(false)} />
        </Modal>
      )}
    </div>
  );
}
