import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  TECHNICAL_ATTRS, COMPLEMENTARY_ATTRS, avgTechnical, getInitials,
  positionBadgeClass, getPlayerProficiencies
} from '../utils/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shuffle, BarChart2, Users, Trophy, Activity, Award, ChevronRight, Filter, Shield, Check, CheckSquare, Square, Play } from 'lucide-react';
import PositionProficiencyBadge from '../components/players/PositionProficiencyBadge';

const BAR_COLORS = ['#F5B738', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function DashboardPage() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedDraftPlayerIds, setSelectedDraftPlayerIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestedTeams, setSuggestedTeams] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.getPlayers(), api.getTeams(), api.getMatches()])
      .then(([p, t, m]) => {
        setPlayers(p);
        setTeams(t);
        setMatches(m);
        setSelectedDraftPlayerIds(p.map(x => x.id));
      })
      .catch(() => toast('Erro ao carregar dados de estatísticas', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Filtragem por time selecionado
  const filteredPlayers = selectedTeamId
    ? (() => {
        const teamObj = teams.find(t => t.id === parseInt(selectedTeamId));
        const teamPlayerIds = (teamObj?.players || []).map(p => p.id);
        return players.filter(p => teamPlayerIds.includes(p.id));
      })()
    : players;

  const currentTeamObj = teams.find(t => t.id === parseInt(selectedTeamId));

  // Sincroniza seleção do draft quando o filtro de time muda
  useEffect(() => {
    setSelectedDraftPlayerIds(filteredPlayers.map(p => p.id));
    setSuggestedTeams(null);
  }, [selectedTeamId, players]);

  const toggleDraftPlayer = (id) => {
    setSelectedDraftPlayerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllDraft = () => {
    setSelectedDraftPlayerIds(filteredPlayers.map(p => p.id));
  };

  const clearAllDraft = () => {
    setSelectedDraftPlayerIds([]);
  };

  // ── Algoritmo de Balanceamento Posicional & Técnico ──
  const suggestTeams = () => {
    const availablePlayers = filteredPlayers.filter(p => selectedDraftPlayerIds.includes(p.id));

    if (availablePlayers.length < 2) {
      toast('Selecione ao menos 2 atletas disponíveis para gerar o sorteio balanceado', 'warning');
      return;
    }

    // Posições-chave em ordem tática do voleibol
    const POSITION_ORDER = ['Levantador', 'Líbero', 'Central', 'Ponteiro', 'Oposto'];
    
    // Calcula score geral de cada atleta
    const playersWithScore = availablePlayers.map(p => ({
      ...p,
      score: [...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS].reduce(
        (sum, { key }) => sum + (p.attributes?.[key] ?? 5), 0
      ),
      techAvg: parseFloat(avgTechnical(p.attributes)) || 5
    }));

    // Agrupa por posição primária
    const byPosition = {};
    POSITION_ORDER.forEach(pos => { byPosition[pos] = []; });
    byPosition['Outros'] = [];

    playersWithScore.forEach(p => {
      if (byPosition[p.primary_position]) {
        byPosition[p.primary_position].push(p);
      } else {
        byPosition['Outros'].push(p);
      }
    });

    // Ordena cada grupo de posição por habilidade técnica (maior para menor)
    Object.keys(byPosition).forEach(pos => {
      byPosition[pos].sort((a, b) => b.score - a.score);
    });

    const teamA = [];
    const teamB = [];

    const getTeamTotal = (team) => team.reduce((s, p) => s + p.score, 0);

    // 1. Distribuição posicional balanceada (Snake Draft dentro de cada posição)
    POSITION_ORDER.forEach(pos => {
      const posPlayers = byPosition[pos];
      posPlayers.forEach((p, index) => {
        if (teamA.length < teamB.length) {
          teamA.push(p);
        } else if (teamB.length < teamA.length) {
          teamB.push(p);
        } else {
          // Empate em quantidade de jogadores: dá para o time com menor score acumulado
          if (getTeamTotal(teamA) <= getTeamTotal(teamB)) {
            teamA.push(p);
          } else {
            teamB.push(p);
          }
        }
      });
    });

    // 2. Distribui os atletas restantes (Outros) de forma equilibrada
    byPosition['Outros'].forEach(p => {
      if (teamA.length < teamB.length) {
        teamA.push(p);
      } else if (teamB.length < teamA.length) {
        teamB.push(p);
      } else {
        if (getTeamTotal(teamA) <= getTeamTotal(teamB)) {
          teamA.push(p);
        } else {
          teamB.push(p);
        }
      }
    });

    // 3. Ajuste fino de quantidade
    while (teamA.length - teamB.length > 1) {
      teamB.push(teamA.pop());
    }
    while (teamB.length - teamA.length > 1) {
      teamA.push(teamB.pop());
    }

    setSuggestedTeams({ teamA, teamB });
    toast(`Equipes geradas e balanceadas por posições (${availablePlayers.length} atletas)`, 'success');
  };

  const teamAvgData = filteredPlayers.map(p => ({
    name: p.nickname || p.name.split(' ')[0],
    Técnico: parseFloat(avgTechnical(p.attributes)),
  }));

  const matchesFinished = matches.filter(m => m.status === 'finished');
  const matchesLive = matches.filter(m => m.status === 'live');
  const teamOverallAvg = filteredPlayers.length > 0
    ? (filteredPlayers.reduce((s, p) => s + parseFloat(avgTechnical(p.attributes)), 0) / filteredPlayers.length).toFixed(1)
    : '—';

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="geo-page-header">
        <div className="geo-header-title-block">
          <div className="geo-eyebrow">ANALYTICS & INTELIGÊNCIA COLETIVA</div>
          <h1 className="geo-main-title">PAINEL DE ESTATÍSTICAS</h1>
          <p className="geo-sub-title">MÉTRICAS TÉCNICAS CONSOLIDADAS E BALANCEAMENTO TÁTICO</p>
        </div>
      </div>

      {/* ── Filtro de Equipe ── */}
      <div className="geo-panel" style={{ padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} color="var(--gold)" />
            <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em' }}>
              FILTRAR DASHBOARD POR EQUIPE:
            </span>
          </div>

          <div style={{ minWidth: 260 }}>
            <select
              className="geo-select-input"
              value={selectedTeamId}
              onChange={e => { setSelectedTeamId(e.target.value); setSuggestedTeams(null); }}
              style={{
                borderColor: currentTeamObj?.color || 'var(--border)',
                borderLeftWidth: currentTeamObj ? 4 : 1,
                borderLeftColor: currentTeamObj?.color || 'var(--border)'
              }}
            >
              <option value="">TODAS AS EQUIPES ({players.length} ATLETAS)</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>
                  EQUIPE: {t.name.toUpperCase()} ({t.players?.length || 0} ATLETAS)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Grid de Métricas Principais ── */}
      <div className="geo-stat-metrics-grid">
        <div className="geo-stat-metric-card">
          <div className="metric-header">
            <span className="metric-label">ELENCO ATIVO</span>
            <Users size={14} className="metric-icon" />
          </div>
          <div className="metric-value">{filteredPlayers.length}</div>
          <div className="metric-sub">{selectedTeamId ? `ATLETAS EM ${currentTeamObj?.name?.toUpperCase()}` : 'ATLETAS REGISTRADOS'}</div>
        </div>

        <div className="geo-stat-metric-card">
          <div className="metric-header">
            <span className="metric-label">MÉDIA TÉCNICA GERAL</span>
            <Award size={14} className="metric-icon" />
          </div>
          <div className="metric-value" style={{ color: 'var(--gold)' }}>{teamOverallAvg}</div>
          <div className="metric-sub">ESCALA TÉCNICA DE 0 A 10</div>
        </div>

        <div className="geo-stat-metric-card">
          <div className="metric-header">
            <span className="metric-label">PARTIDAS ENCERRADAS</span>
            <Trophy size={14} className="metric-icon" />
          </div>
          <div className="metric-value">{matchesFinished.length}</div>
          <div className="metric-sub">RELATÓRIOS CONSOLIDADOS</div>
        </div>

        <div className="geo-stat-metric-card">
          <div className="metric-header">
            <span className="metric-label">JOGOS AO VIVO</span>
            <Activity size={14} className="metric-icon" />
          </div>
          <div className="metric-value" style={{ color: matchesLive.length > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>
            {matchesLive.length}
          </div>
          <div className="metric-sub">{matchesLive.length > 0 ? 'PARTIDA EM ANDAMENTO' : 'NENHUM JOGO AO VIVO'}</div>
        </div>
      </div>

      {/* ── Gráfico de Médias Técnicas Individuais ── */}
      <div className="geo-panel">
        <div className="geo-panel-header">
          <div>
            <div className="geo-eyebrow">DISTRIBUIÇÃO INDIVIDUAL</div>
            <h3 className="geo-panel-title">
              MÉDIA TÉCNICA POR ATLETA {currentTeamObj ? `· ${currentTeamObj.name.toUpperCase()}` : ''}
            </h3>
          </div>
        </div>

        {filteredPlayers.length === 0 ? (
          <div className="geo-empty-panel">
            <div className="geo-empty-desc">Nenhum atleta cadastrado nesta equipe.</div>
          </div>
        ) : (
          <div style={{ width: '100%', height: 260, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamAvgData} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                <CartesianGrid stroke="#212B3E" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: '#212B3E' }} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{
                    background: '#0F141F',
                    border: '1px solid #2E3B54',
                    borderRadius: 4,
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontFamily: 'Space Grotesk, sans-serif'
                  }}
                  formatter={(v) => [`${v}/10`, 'Média Técnica']}
                />
                <Bar dataKey="Técnico" radius={[2, 2, 0, 0]}>
                  {teamAvgData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Balanceamento Tático & Sorteio de Equipes ── */}
      <div className="geo-panel">
        <div className="geo-panel-header">
          <div>
            <div className="geo-eyebrow">INTELIGÊNCIA DE ESCALAÇÃO</div>
            <h3 className="geo-panel-title">SORTEIO & GERADOR DE TIMES EQUILIBRADOS</h3>
            <p className="geo-panel-subtitle">
              Distribuição tática garantindo cobertura de posições (Levantador, Líbero, Central, Ponteiro, Oposto) e equilíbrio técnico
            </p>
          </div>

          <button className="btn btn-gold" onClick={suggestTeams} disabled={selectedDraftPlayerIds.length < 2}>
            <Shuffle size={14} /> SORTEAR & EQUILIBRAR ({selectedDraftPlayerIds.length} ATLETAS)
          </button>
        </div>

        {/* ── Seletor de Atletas Disponíveis para o Sorteio ── */}
        <div className="geo-draft-pool-section">
          <div className="geo-draft-pool-header">
            <div className="geo-draft-pool-title-group">
              <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 12, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.05em' }}>
                ATLETAS DISPONÍVEIS NO TREINO / JOGO:
              </span>
              <span className="geo-admin-chip" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                {selectedDraftPlayerIds.length} / {filteredPlayers.length} PRESENTES
              </span>
            </div>

            <div className="geo-draft-pool-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={selectAllDraft}
              >
                <CheckSquare size={12} /> SELECIONAR TODOS
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={clearAllDraft}
              >
                <Square size={12} /> LIMPAR
              </button>
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Nenhum atleta encontrado nesta equipe.
            </div>
          ) : (
            <div className="geo-draft-pool-grid">
              {filteredPlayers.map(p => {
                const isSelected = selectedDraftPlayerIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`geo-draft-athlete-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleDraftPlayer(p.id)}
                  >
                    <div className="geo-draft-check-badge">
                      {isSelected ? <Check size={10} strokeWidth={3} /> : null}
                    </div>
                    <div className="geo-draft-card-avatar">
                      {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                    </div>
                    <span className="geo-draft-card-name">
                      {p.nickname || p.name.split(' ')[0]}
                    </span>
                    <div className="geo-draft-card-meta">
                      <span className={positionBadgeClass(p.primary_position)} style={{ fontSize: 8, padding: '1px 5px' }}>
                        {p.primary_position}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {suggestedTeams ? (
          <div>
            <div className="geo-suggested-teams-grid">
              {/* Time A */}
              <div className="geo-suggested-team-card" style={{ borderLeftColor: 'var(--team-blue)' }}>
                <div className="geo-suggested-team-header">
                  <span className="team-badge" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#60A5FA', borderColor: 'rgba(37, 99, 235, 0.4)' }}>
                    EQUIPE AZUL (A) · {suggestedTeams.teamA.length} ATLETAS
                  </span>
                  <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 900, color: 'var(--gold)' }}>
                    MÉD: {(suggestedTeams.teamA.reduce((s, p) => s + parseFloat(avgTechnical(p.attributes)), 0) / (suggestedTeams.teamA.length || 1)).toFixed(1)}
                  </span>
                </div>

                <div className="geo-suggested-team-roster">
                  {suggestedTeams.teamA.map(p => (
                    <div key={p.id} className="geo-suggested-player-row" onClick={() => navigate(`/players/${p.id}`)}>
                      <div className="player-avatar-mini">
                        {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                      </div>
                      <div className="player-meta-mini">
                        <span className="player-name-text">{p.name}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.primary_position}</span>
                      </div>
                      <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 11, fontWeight: 900, color: 'var(--gold)' }}>
                        {avgTechnical(p.attributes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time B */}
              <div className="geo-suggested-team-card" style={{ borderLeftColor: 'var(--team-red)' }}>
                <div className="geo-suggested-team-header">
                  <span className="team-badge" style={{ background: 'rgba(220, 38, 38, 0.15)', color: '#F87171', borderColor: 'rgba(220, 38, 38, 0.4)' }}>
                    EQUIPE VERMELHA (B) · {suggestedTeams.teamB.length} ATLETAS
                  </span>
                  <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 900, color: 'var(--gold)' }}>
                    MÉD: {(suggestedTeams.teamB.reduce((s, p) => s + parseFloat(avgTechnical(p.attributes)), 0) / (suggestedTeams.teamB.length || 1)).toFixed(1)}
                  </span>
                </div>

                <div className="geo-suggested-team-roster">
                  {suggestedTeams.teamB.map(p => (
                    <div key={p.id} className="geo-suggested-player-row" onClick={() => navigate(`/players/${p.id}`)}>
                      <div className="player-avatar-mini">
                        {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                      </div>
                      <div className="player-meta-mini">
                        <span className="player-name-text">{p.name}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{p.primary_position}</span>
                      </div>
                      <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 11, fontWeight: 900, color: 'var(--gold)' }}>
                        {avgTechnical(p.attributes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button
                className="btn btn-gold"
                onClick={() => navigate('/matches', {
                  state: {
                    preselectedPlayers: suggestedTeams.teamA.map(p => p.id)
                  }
                })}
              >
                <Play size={14} /> INICIAR PARTIDA COM ESTA FORMAÇÃO
              </button>
            </div>
          </div>
        ) : (
          <div className="geo-empty-panel">
            <Shuffle size={32} className="geo-empty-icon" />
            <div className="geo-empty-title">NENHUM SORTEIO GERADO</div>
            <div className="geo-empty-desc">Selecione os atletas presentes acima e clique no botão dourado para gerar duas equipes equilibradas por posições.</div>
          </div>
        )}
      </div>
    </div>
  );
}
