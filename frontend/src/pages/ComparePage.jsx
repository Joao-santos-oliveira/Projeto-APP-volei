import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  TECHNICAL_ATTRS, positionBadgeClass, getInitials,
  getPlayerProficiencies, avgTechnical
} from '../utils/constants';
import { calculateStatAttributes } from '../utils/statAttributes';
import PositionProficiencyBadge from '../components/players/PositionProficiencyBadge';
import {
  GitCompare, Shield, ArrowRightLeft, UsersRound, Users,
  Trophy, Activity, Award, Flame, CheckCircle, Zap, Crosshair
} from 'lucide-react';

export default function ComparePage() {
  const [mode, setMode] = useState('players'); // 'players' | 'teams'
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Player comparison states
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');

  // Team comparison states
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');

  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.getPlayers().catch(() => []),
      api.getTeams().catch(() => []),
      api.getMatches().catch(() => [])
    ])
      .then(([pList, tList, mList]) => {
        setPlayers(pList || []);
        setTeams(tList || []);
        setMatches(mList || []);
      })
      .catch(() => toast('Erro ao carregar dados para comparação', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── ATLETAS COMPUTADOS ────────────────────────────────────────
  const pa = players.find(p => p.id === parseInt(playerA));
  const pb = players.find(p => p.id === parseInt(playerB));

  const profA = pa ? getPlayerProficiencies(pa) : [];
  const profB = pb ? getPlayerProficiencies(pb) : [];

  const statA = pa ? calculateStatAttributes(pa) : null;
  const statB = pb ? calculateStatAttributes(pb) : null;

  const playerRadarData = pa && pb
    ? TECHNICAL_ATTRS.map(({ key, label }) => ({
        subject: label,
        [pa.name.split(' ')[0]]: pa.attributes?.[key] ?? 5,
        [pb.name.split(' ')[0]]: pb.attributes?.[key] ?? 5,
      }))
    : [];

  // ── TIMES COMPUTADOS ──────────────────────────────────────────
  const ta = teams.find(t => t.id === parseInt(teamA));
  const tb = teams.find(t => t.id === parseInt(teamB));

  // Cálculo de médias dos times
  const computeTeamMetrics = (team) => {
    if (!team) return null;
    const squad = team.players || [];
    const count = squad.length;

    // Altura média
    const heights = squad.filter(p => p.height).map(p => Number(p.height));
    const avgHeight = heights.length > 0 ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : null;

    // Média de atributos técnicos do time
    const attrAvgs = {};
    TECHNICAL_ATTRS.forEach(({ key }) => {
      const vals = squad.map(p => p.attributes?.[key] ?? 5);
      attrAvgs[key] = vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 5;
    });

    // Média Geral do time
    const overallAvg = Object.values(attrAvgs).length > 0
      ? (Object.values(attrAvgs).reduce((a, b) => a + b, 0) / Object.values(attrAvgs).length).toFixed(1)
      : '5.0';

    // Histórico de partidas finalizadas desse time
    const teamMatches = matches.filter(m =>
      (m.home_team?.toLowerCase() === team.name.toLowerCase() || m.away_team?.toLowerCase() === team.name.toLowerCase()) &&
      m.status === 'finished'
    );

    let wins = 0;
    let losses = 0;
    let setsWon = 0;
    let setsLost = 0;

    teamMatches.forEach(m => {
      const isHome = m.home_team?.toLowerCase() === team.name.toLowerCase();
      const finishedSets = (m.sets || []).filter(s => s.finished);
      let homeSetWins = 0;
      let awaySetWins = 0;
      finishedSets.forEach(s => {
        if (s.winner === 'home') homeSetWins++;
        else if (s.winner === 'away') awaySetWins++;
      });

      if (isHome) {
        setsWon += homeSetWins;
        setsLost += awaySetWins;
        if (homeSetWins > awaySetWins) wins++;
        else if (awaySetWins > homeSetWins) losses++;
      } else {
        setsWon += awaySetWins;
        setsLost += homeSetWins;
        if (awaySetWins > homeSetWins) wins++;
        else if (homeSetWins > awaySetWins) losses++;
      }
    });

    return {
      team,
      squad,
      count,
      avgHeight,
      attrAvgs,
      overallAvg,
      matchesPlayed: teamMatches.length,
      wins,
      losses,
      setsWon,
      setsLost,
      winRate: teamMatches.length > 0 ? Math.round((wins / teamMatches.length) * 100) : 0
    };
  };

  const tMetricsA = computeTeamMetrics(ta);
  const tMetricsB = computeTeamMetrics(tb);

  // Confronto direto entre Time A e Time B
  const directMatches = (ta && tb)
    ? matches.filter(m =>
        m.status === 'finished' &&
        ((m.home_team?.toLowerCase() === ta.name.toLowerCase() && m.away_team?.toLowerCase() === tb.name.toLowerCase()) ||
         (m.home_team?.toLowerCase() === tb.name.toLowerCase() && m.away_team?.toLowerCase() === ta.name.toLowerCase()))
      )
    : [];

  let directWinsA = 0;
  let directWinsB = 0;
  directMatches.forEach(m => {
    const isAHome = m.home_team?.toLowerCase() === ta.name.toLowerCase();
    const sets = m.sets || [];
    let homeWins = sets.filter(s => s.finished && s.winner === 'home').length;
    let awayWins = sets.filter(s => s.finished && s.winner === 'away').length;
    if (homeWins > awayWins) {
      if (isAHome) directWinsA++; else directWinsB++;
    } else if (awayWins > homeWins) {
      if (isAHome) directWinsB++; else directWinsA++;
    }
  });

  const teamRadarData = (tMetricsA && tMetricsB)
    ? TECHNICAL_ATTRS.map(({ key, label }) => ({
        subject: label,
        [ta.name]: tMetricsA.attrAvgs[key] || 5,
        [tb.name]: tMetricsB.attrAvgs[key] || 5,
      }))
    : [];

  const teamBarData = (tMetricsA && tMetricsB)
    ? TECHNICAL_ATTRS.map(({ key, label }) => ({
        name: label,
        [ta.name]: tMetricsA.attrAvgs[key] || 5,
        [tb.name]: tMetricsB.attrAvgs[key] || 5,
        diff: parseFloat(((tMetricsA.attrAvgs[key] || 5) - (tMetricsB.attrAvgs[key] || 5)).toFixed(1))
      }))
    : [];

  const PlayerHeader = ({ player, color, stat }) => {
    const avg = avgTechnical(player.attributes);
    return (
      <div style={{ textAlign: 'center', padding: '12px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 'var(--radius-sm)', margin: '0 auto 10px',
          background: 'var(--bg-secondary)', border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 900, overflow: 'hidden', color
        }}>
          {player.photo ? (
            <img src={player.photo} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            getInitials(player.name)
          )}
        </div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 15, color: '#FFFFFF', marginBottom: 4 }}>
          {player.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={positionBadgeClass(player.primary_position)}>{player.primary_position}</span>
          <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 11, fontWeight: 900, color: 'var(--gold)', background: 'var(--gold-subtle)', padding: '2px 6px', borderRadius: 2 }}>
            MÉD: {avg}
          </span>
          {stat && (
            <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 11, fontWeight: 900, color: stat.tierColor, border: `1px solid ${stat.tierColor}40`, padding: '2px 6px', borderRadius: 2 }}>
              OVR: {stat.ovr}
            </span>
          )}
        </div>
      </div>
    );
  };

  const TeamHeader = ({ metrics, color }) => {
    const { team, count, avgHeight, overallAvg, wins, losses, winRate } = metrics;
    return (
      <div style={{ textAlign: 'center', padding: '14px' }}>
        <div style={{
          width: 70, height: 70, borderRadius: 'var(--radius-sm)', margin: '0 auto 10px',
          background: `${team.color || color}15`, border: `2px solid ${team.color || color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 900, overflow: 'hidden', color: team.color || color
        }}>
          {team.photo ? (
            <img src={team.photo} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Shield size={34} color={team.color || color} />
          )}
        </div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 900, fontSize: 17, color: '#FFFFFF', marginBottom: 4 }}>
          {team.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
          <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 11, fontWeight: 900, color: team.color || color, background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border)' }}>
            FORÇA: {overallAvg}
          </span>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border)' }}>
            {count} ATLETAS
          </span>
          {avgHeight && (
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border)' }}>
              ALTURA: {avgHeight} CM
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="geo-page-header">
        <div className="geo-header-title-block">
          <div className="geo-eyebrow">CENTRAL DE INTELIGÊNCIA COMPARATIVA</div>
          <h1 className="geo-main-title">COMPARAÇÃO TÁTICA</h1>
          <p className="geo-sub-title">CONFRONTE ATLETAS E EQUIPES LADO A LADO COM RADAR POLIGONAL E MÉTRICAS</p>
        </div>

        {/* Mode Switcher */}
        <div className="geo-view-switcher">
          <button
            className={`geo-view-btn ${mode === 'players' ? 'active' : ''}`}
            onClick={() => setMode('players')}
          >
            <Users size={14} />
            <span>COMPARAR ATLETAS</span>
          </button>
          <button
            className={`geo-view-btn ${mode === 'teams' ? 'active' : ''}`}
            onClick={() => setMode('teams')}
          >
            <UsersRound size={14} />
            <span>COMPARAR TIMES</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
         MODO 1: COMPARAR ATLETAS
      ══════════════════════════════════════════════════════════════ */}
      {mode === 'players' && (
        <>
          {/* Seletor de Atletas */}
          <div className="geo-panel" style={{ marginBottom: 20 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ color: '#60A5FA' }}>ATLETA 1 (AZUL)</label>
                <select
                  className="form-select"
                  value={playerA}
                  onChange={e => setPlayerA(e.target.value)}
                  style={{ borderLeft: '3px solid var(--team-blue)' }}
                >
                  <option value="">Selecione o primeiro atleta...</option>
                  {players.filter(p => p.id !== parseInt(playerB)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.primary_position})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#F87171' }}>ATLETA 2 (VERMELHO)</label>
                <select
                  className="form-select"
                  value={playerB}
                  onChange={e => setPlayerB(e.target.value)}
                  style={{ borderLeft: '3px solid var(--team-red)' }}
                >
                  <option value="">Selecione o segundo atleta...</option>
                  {players.filter(p => p.id !== parseInt(playerA)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.primary_position})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!pa || !pb ? (
            <div className="geo-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <ArrowRightLeft size={42} className="geo-empty-icon" style={{ color: 'var(--gold)', margin: '0 auto 14px' }} />
              <div className="geo-empty-title">SELECIONE DOIS ATLETAS PARA CONFRONTO</div>
              <div className="geo-empty-desc">
                Escolha os atletas nos menus acima para projetar a sobreposição dos fundamentos, índices de proficiência e atributos estatísticos.
              </div>
            </div>
          ) : (
            <>
              {/* Head to Head Summary Card */}
              <div className="geo-panel" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
                  <PlayerHeader player={pa} color="var(--team-blue)" stat={statA} />
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 900, color: 'var(--gold)', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                    VS
                  </div>
                  <PlayerHeader player={pb} color="var(--team-red)" stat={statB} />
                </div>
              </div>

              {/* Radar Técnico Sobreposto */}
              <div className="geo-panel" style={{ marginBottom: 20 }}>
                <div className="geo-panel-header">
                  <div>
                    <div className="geo-eyebrow">SOBREPOSIÇÃO POLIGONAL</div>
                    <h3 className="geo-panel-title">RADAR TÉCNICO COMPARATIVO</h3>
                  </div>
                </div>

                <div style={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={playerRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="#212B3E" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#64748B', fontSize: 10 }} tickCount={6} />
                      <Radar name={pa.name.split(' ')[0]} dataKey={pa.name.split(' ')[0]} stroke="var(--team-blue)" fill="var(--team-blue)" fillOpacity={0.2} strokeWidth={2} />
                      <Radar name={pb.name.split(' ')[0]} dataKey={pb.name.split(' ')[0]} stroke="var(--team-red)" fill="var(--team-red)" fillOpacity={0.2} strokeWidth={2} />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: '#0F141F',
                          border: '1px solid #2E3B54',
                          borderRadius: 4,
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontFamily: 'Space Grotesk, sans-serif'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Comparativo de Proficiências por Posição */}
              <div className="geo-panel">
                <div className="geo-panel-header">
                  <div>
                    <div className="geo-eyebrow">APTIDÃO TÁTICA</div>
                    <h3 className="geo-panel-title">PROFICIÊNCIA POR POSIÇÃO (0.0 A 5.0)</h3>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 800, color: '#60A5FA', marginBottom: 10, textTransform: 'uppercase' }}>
                      {pa.name}
                    </div>
                    <PositionProficiencyBadge proficiencies={profA} variant="detailed" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 13, fontWeight: 800, color: '#F87171', marginBottom: 10, textTransform: 'uppercase' }}>
                      {pb.name}
                    </div>
                    <PositionProficiencyBadge proficiencies={profB} variant="detailed" />
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
         MODO 2: COMPARAR TIMES (NOVA FUNCIONALIDADE)
      ══════════════════════════════════════════════════════════════ */}
      {mode === 'teams' && (
        <>
          {/* Seletor de Times */}
          <div className="geo-panel" style={{ marginBottom: 20 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ color: '#60A5FA' }}>EQUIPE 1 (AZUL)</label>
                <select
                  className="form-select"
                  value={teamA}
                  onChange={e => setTeamA(e.target.value)}
                  style={{ borderLeft: '3px solid var(--team-blue)' }}
                >
                  <option value="">Selecione a primeira equipe...</option>
                  {teams.filter(t => t.id !== parseInt(teamB)).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.players?.length || 0} atletas)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#F87171' }}>EQUIPE 2 (VERMELHA)</label>
                <select
                  className="form-select"
                  value={teamB}
                  onChange={e => setTeamB(e.target.value)}
                  style={{ borderLeft: '3px solid var(--team-red)' }}
                >
                  <option value="">Selecione a segunda equipe...</option>
                  {teams.filter(t => t.id !== parseInt(teamA)).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.players?.length || 0} atletas)</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!ta || !tb ? (
            <div className="geo-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <UsersRound size={42} className="geo-empty-icon" style={{ color: 'var(--gold)', margin: '0 auto 14px' }} />
              <div className="geo-empty-title">SELECIONE DUAS EQUIPES PARA CONFRONTO</div>
              <div className="geo-empty-desc">
                Escolha os times nos seletores acima para comparar fundamentos do plantel, histórico de vitórias, médias de altura e elenco lado a lado.
              </div>
            </div>
          ) : (
            <>
              {/* Head to Head Teams Hero */}
              <div className="geo-panel" style={{ marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
                  <TeamHeader metrics={tMetricsA} color="var(--team-blue)" />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 900, color: 'var(--gold)', background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                      VS
                    </div>
                    {directMatches.length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>
                        CONFRONTO DIRETO: <strong style={{ color: '#60A5FA' }}>{directWinsA}</strong> x <strong style={{ color: '#F87171' }}>{directWinsB}</strong>
                      </div>
                    )}
                  </div>
                  <TeamHeader metrics={tMetricsB} color="var(--team-red)" />
                </div>
              </div>

              {/* KPI Scorecard Grid */}
              <div className="geo-stat-kpis-grid" style={{ marginBottom: 20 }}>
                <div className="geo-stat-kpi-box" style={{ borderLeftColor: '#60A5FA' }}>
                  <span className="kpi-label">FORÇA TÉCNICA {ta.name.toUpperCase()}</span>
                  <span className="kpi-value text-blue-400">{tMetricsA.overallAvg}</span>
                  <span className="kpi-sub">Média dos {tMetricsA.count} atletas</span>
                </div>
                <div className="geo-stat-kpi-box" style={{ borderLeftColor: '#F87171' }}>
                  <span className="kpi-label">FORÇA TÉCNICA {tb.name.toUpperCase()}</span>
                  <span className="kpi-value text-rose-400">{tMetricsB.overallAvg}</span>
                  <span className="kpi-sub">Média dos {tMetricsB.count} atletas</span>
                </div>
                <div className="geo-stat-kpi-box" style={{ borderLeftColor: 'var(--gold)' }}>
                  <span className="kpi-label">APROVEITAMENTO {ta.name.toUpperCase()}</span>
                  <span className="kpi-value text-gold">{tMetricsA.winRate}%</span>
                  <span className="kpi-sub">{tMetricsA.wins}V / {tMetricsA.losses}D em {tMetricsA.matchesPlayed} jogos</span>
                </div>
                <div className="geo-stat-kpi-box" style={{ borderLeftColor: 'var(--gold)' }}>
                  <span className="kpi-label">APROVEITAMENTO {tb.name.toUpperCase()}</span>
                  <span className="kpi-value text-gold">{tMetricsB.winRate}%</span>
                  <span className="kpi-sub">{tMetricsB.wins}V / {tMetricsB.losses}D em {tMetricsB.matchesPlayed} jogos</span>
                </div>
              </div>

              {/* Radar Técnico Comparativo dos Times */}
              <div className="geo-panel" style={{ marginBottom: 20 }}>
                <div className="geo-panel-header">
                  <div>
                    <div className="geo-eyebrow">EQUILÍBRIO COLETIVO</div>
                    <h3 className="geo-panel-title">RADAR DE FUNDAMENTOS DO PLANTEL</h3>
                    <p className="geo-panel-subtitle">Comparativo das médias agregadas de cada fundamento entre os dois times</p>
                  </div>
                </div>

                <div style={{ width: '100%', height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={teamRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="#212B3E" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#64748B', fontSize: 10 }} tickCount={6} />
                      <Radar name={ta.name} dataKey={ta.name} stroke="var(--team-blue)" fill="var(--team-blue)" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name={tb.name} dataKey={tb.name} stroke="var(--team-red)" fill="var(--team-red)" fillOpacity={0.25} strokeWidth={2} />
                      <Legend wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: '#0F141F',
                          border: '1px solid #2E3B54',
                          borderRadius: 4,
                          color: '#FFFFFF',
                          fontSize: 12,
                          fontFamily: 'Space Grotesk, sans-serif'
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detalhamento de Fundamento a Fundamento */}
              <div className="geo-panel" style={{ marginBottom: 20 }}>
                <div className="geo-panel-header">
                  <div>
                    <div className="geo-eyebrow">BALANÇO TÉCNICO DETALHADO</div>
                    <h3 className="geo-panel-title">CONFRONTO DE FUNDAMENTOS (0 A 10)</h3>
                  </div>
                </div>

                <div className="geo-team-attr-compare-grid">
                  {TECHNICAL_ATTRS.map(({ key, label }) => {
                    const valA = tMetricsA.attrAvgs[key] || 5;
                    const valB = tMetricsB.attrAvgs[key] || 5;
                    const diff = parseFloat((valA - valB).toFixed(1));
                    const isAdvA = diff > 0;
                    const isAdvB = diff < 0;

                    return (
                      <div key={key} className="geo-team-attr-row">
                        <div className="team-attr-label-col">
                          <span className="attr-title">{label}</span>
                          <span className="attr-diff-tag" style={{
                            color: isAdvA ? '#60A5FA' : isAdvB ? '#F87171' : 'var(--text-muted)'
                          }}>
                            {diff > 0 ? `+${diff} ${ta.name}` : diff < 0 ? `+${Math.abs(diff)} ${tb.name}` : 'Empate'}
                          </span>
                        </div>

                        <div className="team-attr-bars-col">
                          {/* Barra Time A */}
                          <div className="team-bar-item">
                            <span className="team-bar-name" style={{ color: '#60A5FA' }}>{ta.name}</span>
                            <div className="team-bar-track">
                              <div className="team-bar-fill" style={{ width: `${valA * 10}%`, backgroundColor: 'var(--team-blue)' }} />
                            </div>
                            <span className="team-bar-val">{valA.toFixed(1)}</span>
                          </div>

                          {/* Barra Time B */}
                          <div className="team-bar-item">
                            <span className="team-bar-name" style={{ color: '#F87171' }}>{tb.name}</span>
                            <div className="team-bar-track">
                              <div className="team-bar-fill" style={{ width: `${valB * 10}%`, backgroundColor: 'var(--team-red)' }} />
                            </div>
                            <span className="team-bar-val">{valB.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Plantéis Lado a Lado */}
              <div className="geo-panel">
                <div className="geo-panel-header">
                  <div>
                    <div className="geo-eyebrow">ESCALAÇÃO & PLANTÉIS</div>
                    <h3 className="geo-panel-title">COMPARAÇÃO DE ELENCOS</h3>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  {/* Lista Time A */}
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 900, color: '#60A5FA', marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{ta.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tMetricsA.count} atletas</span>
                    </div>
                    {tMetricsA.squad.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Nenhum atleta vinculado a esta equipe.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {tMetricsA.squad.map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>
                                {p.number ? `#${p.number}` : '•'}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>{p.name}</span>
                              <span className={positionBadgeClass(p.primary_position)} style={{ fontSize: 9, padding: '1px 5px' }}>{p.primary_position}</span>
                            </div>
                            <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 900, color: 'var(--gold)' }}>
                              {avgTechnical(p.attributes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lista Time B */}
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 14, fontWeight: 900, color: '#F87171', marginBottom: 12, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{tb.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tMetricsB.count} atletas</span>
                    </div>
                    {tMetricsB.squad.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Nenhum atleta vinculado a esta equipe.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {tMetricsB.squad.map(p => (
                          <div key={p.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>
                                {p.number ? `#${p.number}` : '•'}
                              </span>
                              <span style={{ fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>{p.name}</span>
                              <span className={positionBadgeClass(p.primary_position)} style={{ fontSize: 9, padding: '1px 5px' }}>{p.primary_position}</span>
                            </div>
                            <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 12, fontWeight: 900, color: 'var(--gold)' }}>
                              {avgTechnical(p.attributes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
