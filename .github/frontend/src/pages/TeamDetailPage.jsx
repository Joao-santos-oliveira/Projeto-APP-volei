import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, UserMinus, Edit2, Play, Trophy, Shield, Users, Award, Activity } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { getInitials, positionBadgeClass, avgTechnical, TECHNICAL_ATTRS, getPlayerProficiencies } from '../utils/constants';
import PlayerRadar from '../components/players/PlayerRadar';
import PositionProficiencyBadge from '../components/players/PositionProficiencyBadge';
import Modal from '../components/ui/Modal';

export default function TeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [team, setTeam] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedView, setSelectedView] = useState('roster'); // 'roster' | 'stats' | 'radar'
  const [highlightPlayer, setHighlightPlayer] = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api.getTeam(id), api.getPlayers()]);
      setTeam(t);
      setAllPlayers(p);
    } catch {
      toast('Time não encontrado', 'error');
      navigate('/teams');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRemovePlayer = async (playerId, playerName) => {
    if (!window.confirm(`Remover ${playerName} do time?`)) return;
    try {
      await api.removePlayerFromTeam(id, playerId);
      toast(`${playerName} removido do time`, 'info');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleAddPlayer = async (playerId) => {
    try {
      await api.addPlayerToTeam(id, playerId);
      toast('Jogador adicionado ao time!', 'success');
      setShowAddPlayer(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const startMatchWithTeam = () => {
    navigate('/matches', { state: { preselectedPlayers: team.players?.map(p => p.id) || [] } });
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!team) return null;

  const color = team.color || '#F5B738';
  const players = team.players || [];
  const availablePlayers = allPlayers.filter(p => !players.some(tp => tp.id === p.id));

  // Média técnica geral do time
  const teamOverallAvg = players.length > 0
    ? (players.reduce((s, p) => s + parseFloat(avgTechnical(p.attributes)), 0) / players.length).toFixed(1)
    : '—';

  // Médias individuais por fundamento
  const teamAvgByAttr = TECHNICAL_ATTRS.map(({ key, label }) => {
    const vals = players.map(p => {
      const v = p.attributes?.[key];
      return typeof v === 'number' ? v : (v ? parseFloat(v) : 5);
    });
    const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 5;
    return { key, label, avg: parseFloat(avg.toFixed(1)) };
  });

  return (
    <div className="page-container">
      {/* ── Top Bar ── */}
      <div className="geo-top-action-bar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/teams')}>
          <ArrowLeft size={14} /> EQUIPES
        </button>
        <div className="geo-action-cluster">
          {players.length > 0 && (
            <button className="btn btn-gold btn-sm" onClick={startMatchWithTeam}>
              <Play size={13} /> INICIAR PARTIDA
            </button>
          )}
        </div>
      </div>

      {/* ── Team Geometric Hero ── */}
      <div className="geo-panel" style={{ borderLeft: `4px solid ${color}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-sm)',
              background: `${color}20`, border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', flexShrink: 0
            }}>
              {team.photo ? (
                <img src={team.photo} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Shield size={28} color={color} />
              )}
            </div>
            <div>
              <div className="geo-eyebrow">FICHA DA EQUIPE</div>
              <h1 className="geo-main-title" style={{ fontSize: 22 }}>{team.name}</h1>
              {team.description && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{team.description}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              padding: '6px 14px', borderRadius: 'var(--radius-xs)', textAlign: 'center'
            }}>
              <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 18, fontWeight: 900, color }}>
                {teamOverallAvg}
              </span>
              <span style={{ display: 'block', fontSize: 8.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                MÉDIA TÉCNICA
              </span>
            </div>
            <div style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              padding: '6px 14px', borderRadius: 'var(--radius-xs)', textAlign: 'center'
            }}>
              <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 18, fontWeight: 900, color: '#FFFFFF' }}>
                {players.length}
              </span>
              <span style={{ display: 'block', fontSize: 8.5, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                ATLETAS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Bar ── */}
      <div className="geo-tabs-bar">
        <button
          className={`geo-tab-btn ${selectedView === 'roster' ? 'active' : ''}`}
          onClick={() => setSelectedView('roster')}
        >
          <Users size={14} /> ELENCO ({players.length})
        </button>
        <button
          className={`geo-tab-btn ${selectedView === 'stats' ? 'active' : ''}`}
          onClick={() => setSelectedView('stats')}
        >
          <Award size={14} /> MÉDIAS POR FUNDAMENTO
        </button>
        <button
          className={`geo-tab-btn ${selectedView === 'radar' ? 'active' : ''}`}
          onClick={() => setSelectedView('radar')}
        >
          <Activity size={14} /> RADAR COLETIVO
        </button>
      </div>

      {/* ── Aba 1: Elenco ── */}
      {selectedView === 'roster' && (
        <div className="geo-panel">
          <div className="geo-panel-header">
            <div>
              <div className="geo-eyebrow">PLANTEL DA EQUIPE</div>
              <h3 className="geo-panel-title">JOGADORES VINCULADOS</h3>
            </div>
            {availablePlayers.length > 0 && (
              <button className="btn btn-gold btn-sm" onClick={() => setShowAddPlayer(true)}>
                <UserPlus size={14} /> ADICIONAR ATLETA
              </button>
            )}
          </div>

          {players.length === 0 ? (
            <div className="geo-empty-panel">
              <Users size={32} className="geo-empty-icon" />
              <div className="geo-empty-title">ELENCO VAZIO</div>
              <div className="geo-empty-desc">Vincule atletas a esta equipe para calcular médias técnicas e iniciar partidas.</div>
              <button className="btn btn-gold btn-sm" style={{ marginTop: 14 }} onClick={() => setShowAddPlayer(true)}>
                <UserPlus size={14} /> ADICIONAR ATLETA
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {players.map(p => {
                const profs = getPlayerProficiencies(p);
                const avg = avgTechnical(p.attributes);

                return (
                  <div
                    key={p.id}
                    className="geo-roster-row-card"
                    onClick={() => navigate(`/players/${p.id}`)}
                  >
                    <div className="roster-avatar-box">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="roster-avatar-img" />
                      ) : (
                        <span className="roster-avatar-initials">{getInitials(p.name)}</span>
                      )}
                      {p.number && <span className="roster-jersey-tag">#{p.number}</span>}
                    </div>

                    <div className="roster-identity-col">
                      <div className="roster-name-row">
                        <span className="roster-player-name">{p.name}</span>
                        {p.nickname && <span className="roster-player-alias">"{p.nickname}"</span>}
                      </div>

                      <div className="roster-positions-row">
                        <span className={positionBadgeClass(p.primary_position)}>
                          {p.primary_position}
                        </span>
                        {p.secondary_positions?.map(sec => (
                          <span key={sec} className="badge badge-default" style={{ opacity: 0.85 }}>
                            {sec}
                          </span>
                        ))}
                      </div>

                      <div className="roster-prof-chips-row">
                        {profs.map(prof => (
                          <div
                            key={prof.position}
                            className="roster-prof-chip"
                            style={{ borderColor: `${prof.tierColor}40` }}
                          >
                            <span className="chip-pos">{prof.position}:</span>
                            <span className="chip-score" style={{ color: prof.tierColor }}>
                              {prof.score.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="roster-stats-col">
                      <div className="roster-score-badge">
                        <span className="score-num">{avg}</span>
                        <span className="score-label">MÉD GER</span>
                      </div>
                      <button
                        type="button"
                        className="geo-delete-match-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePlayer(p.id, p.name);
                        }}
                        title="Remover atleta da equipe"
                      >
                        <UserMinus size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba 2: Atributos / Médias Técnicas ── */}
      {selectedView === 'stats' && (
        <div className="geo-panel">
          <div className="geo-panel-header">
            <div>
              <div className="geo-eyebrow">DESEMPENHO TÉCNICO COLETIVO</div>
              <h3 className="geo-panel-title">MÉDIAS POR FUNDAMENTO DA EQUIPE</h3>
            </div>
          </div>

          {players.length === 0 ? (
            <div className="geo-empty-panel">
              <div className="geo-empty-desc">Adicione atletas à equipe para visualizar o detalhamento técnico.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {teamAvgByAttr.map(({ key, label, avg }) => {
                const barColor = avg >= 7.5 ? '#10B981' : avg >= 5.5 ? 'var(--gold)' : '#EF4444';
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: 'Space Grotesk, monospace', fontWeight: 900, color: barColor, fontSize: 14 }}>
                        {avg.toFixed(1)} / 10
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, avg * 10))}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: 2,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Aba 3: Radar Coletivo ── */}
      {selectedView === 'radar' && (
        <div className="geo-panel">
          <div className="geo-panel-header">
            <div>
              <div className="geo-eyebrow">SOBREPOSIÇÃO POLIGONAL</div>
              <h3 className="geo-panel-title">RADAR MÉDIO DO TIME</h3>
            </div>
          </div>

          {players.length === 0 ? (
            <div className="geo-empty-panel">
              <div className="geo-empty-desc">Adicione atletas para gerar o radar médio coletivo da equipe.</div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <PlayerRadar
                attributes={Object.fromEntries(teamAvgByAttr.map(({ key, avg }) => [key, avg]))}
                color={color}
                size={320}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Modal Adicionar Jogador ── */}
      {showAddPlayer && (
        <Modal title="ADICIONAR ATLETA À EQUIPE" onClose={() => setShowAddPlayer(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
            {availablePlayers.length === 0 ? (
              <div className="geo-empty-panel">
                <div className="geo-empty-desc">Todos os atletas cadastrados já fazem parte desta equipe.</div>
              </div>
            ) : availablePlayers.map(p => (
              <button
                key={p.id}
                type="button"
                className="geo-modal-athlete-btn"
                style={{ flexDirection: 'row', justifyContent: 'space-between', padding: '10px 14px' }}
                onClick={() => handleAddPlayer(p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="athlete-btn-avatar">
                    {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div className="athlete-btn-name">{p.name}</div>
                    <span className="athlete-btn-pos">{p.primary_position}</span>
                  </div>
                </div>
                <UserPlus size={16} color="var(--gold)" />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
