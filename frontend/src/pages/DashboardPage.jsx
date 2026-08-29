import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  TECHNICAL_ATTRS, COMPLEMENTARY_ATTRS, avgTechnical, getInitials,
  positionBadgeClass, getPlayerProficiencies
} from '../utils/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shuffle, BarChart2, Users, Trophy, Activity, Award, ChevronRight, Filter, Shield } from 'lucide-react';
import PositionProficiencyBadge from '../components/players/PositionProficiencyBadge';

const BAR_COLORS = ['#F5B738', '#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function DashboardPage() {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [suggestedTeams, setSuggestedTeams] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.getPlayers(), api.getTeams(), api.getMatches()])
      .then(([p, t, m]) => { setPlayers(p); setTeams(t); setMatches(m); })
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

  // Algoritmo Snake Draft para balanceamento
  const suggestTeams = () => {
    if (filteredPlayers.length < 2) {
      toast('Selecione uma equipe com ao menos 2 atletas para gerar escalações balanceadas', 'info');
      return;
    }

    const scored = filteredPlayers.map(p => ({
      ...p,
      score: [...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS].reduce((sum, { key }) => sum + (p.attributes?.[key] ?? 5), 0)
    })).sort((a, b) => b.score - a.score);

    const teamA = [], teamB = [];
    scored.forEach((p, i) => {
      const round = Math.floor(i / 2);
      const isEven = round % 2 === 0;
      const posInRound = i % 2;
      if (isEven ? posInRound === 0 : posInRound === 1) teamA.push(p);
      else teamB.push(p);
    });

    setSuggestedTeams({ teamA, teamB });
    toast('Equipes equilibradas geradas com sucesso', 'success');
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

      {/* ── Balanceamento Tático (Snake Draft) ── */}
      <div className="geo-panel">
        <div className="geo-panel-header">
          <div>
            <div className="geo-eyebrow">INTELIGÊNCIA DE ESCALAÇÃO</div>
            <h3 className="geo-panel-title">GERADOR DE TIMES EQUILIBRADOS</h3>
            <p className="geo-panel-subtitle">
              Distribuição por algoritmo Snake Draft ponderando todas as notas técnicas {currentTeamObj ? `de ${currentTeamObj.name}` : 'do elenco'}
            </p>
          </div>

          <button className="btn btn-gold" onClick={suggestTeams}>
            <Shuffle size={14} /> GERAR ESCALAÇÃO EQUILIBRADA
          </button>
        </div>

        {suggestedTeams ? (
          <div className="geo-suggested-teams-grid">
            {/* Time A */}
            <div className="geo-suggested-team-card" style={{ borderLeftColor: 'var(--team-blue)' }}>
              <div className="geo-suggested-team-header">
                <span className="team-badge" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#60A5FA', borderColor: 'rgba(37, 99, 235, 0.4)' }}>
                  EQUIPE MANDANTE (A)
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
                  EQUIPE VISITANTE (B)
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
        ) : (
          <div className="geo-empty-panel">
            <Shuffle size={32} className="geo-empty-icon" />
            <div className="geo-empty-title">NENHUMA ESCALAÇÃO GERADA</div>
            <div className="geo-empty-desc">Clique no botão acima para gerar duas equipes equilibradas instantaneamente.</div>
          </div>
        )}
      </div>
    </div>
  );
}
