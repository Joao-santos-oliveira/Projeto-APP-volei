import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, CheckCircle, Award, Activity, BarChart2, AlertCircle, Filter } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getInitials } from '../utils/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ACTION_LABELS = {
  attack_point: 'Ataque (Ponto)', attack_error: 'Ataque (Erro)',
  serve_ace: 'Saque Ace', serve_error: 'Saque (Erro)',
  block_point: 'Bloqueio (Ponto)', block_error: 'Bloqueio (Erro)',
  reception_error: 'Recepção/Passe (Erro)', setting_error: 'Levantamento (Erro)',
  fault: 'Falta Tática', opponent_error: 'Erro Adversário'
};

export default function MatchHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('scout'); // 'scout' | 'log'
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all'); // 'all' | 'home' | 'away'

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
  const points = match.points || [];
  const allMatchPlayers = [
    ...(match.home_players || []).map(p => ({ ...p, team: 'home' })),
    ...(match.away_players || []).map(p => ({ ...p, team: 'away' }))
  ];

  // ── Cálculo do Scout Individual por Atleta ──
  const playerStatsMap = {};

  // Inicializa mapa para todos os atletas escalados
  allMatchPlayers.forEach(p => {
    playerStatsMap[p.id] = {
      id: p.id,
      name: p.name,
      nickname: p.nickname || p.name.split(' ')[0],
      number: p.number,
      position: p.primary_position,
      team: p.team || 'home',
      attackPoints: 0,
      attackErrors: 0,
      serveAces: 0,
      serveErrors: 0,
      blockPoints: 0,
      blockErrors: 0,
      receptionErrors: 0,
      settingErrors: 0,
      faults: 0,
      totalPoints: 0,
      totalErrors: 0
    };
  });

  // Processa todos os eventos de pontos da partida
  points.forEach(pt => {
    if (pt.player_id) {
      if (!playerStatsMap[pt.player_id]) {
        playerStatsMap[pt.player_id] = {
          id: pt.player_id,
          name: pt.player_name || `Atleta #${pt.player_id}`,
          nickname: pt.player_nickname || pt.player_name || `Atleta`,
          number: '',
          position: '—',
          team: pt.team,
          attackPoints: 0,
          attackErrors: 0,
          serveAces: 0,
          serveErrors: 0,
          blockPoints: 0,
          blockErrors: 0,
          receptionErrors: 0,
          settingErrors: 0,
          faults: 0,
          totalPoints: 0,
          totalErrors: 0
        };
      }
      const p = playerStatsMap[pt.player_id];
      switch (pt.action) {
        case 'attack_point': p.attackPoints++; p.totalPoints++; break;
        case 'attack_error': p.attackErrors++; p.totalErrors++; break;
        case 'serve_ace':    p.serveAces++; p.totalPoints++; break;
        case 'serve_error':  p.serveErrors++; p.totalErrors++; break;
        case 'block_point':  p.blockPoints++; p.totalPoints++; break;
        case 'block_error':  p.blockErrors++; p.totalErrors++; break;
        case 'reception_error': p.receptionErrors++; p.totalErrors++; break;
        case 'setting_error':   p.settingErrors++; p.totalErrors++; break;
        case 'fault':        p.faults++; p.totalErrors++; break;
        default: break;
      }
    }
  });

  // Filtra por equipe selecionada
  const filteredPlayerStatsList = Object.values(playerStatsMap)
    .filter(p => selectedTeamFilter === 'all' || p.team === selectedTeamFilter)
    .map(p => ({
      ...p,
      balance: p.totalPoints - p.totalErrors
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  // ── Métricas Totais por Fundamento ──
  const relevantPoints = points.filter(p => selectedTeamFilter === 'all' || p.team === selectedTeamFilter);

  const teamTotals = {
    attackPoints: relevantPoints.filter(p => p.action === 'attack_point').length,
    attackErrors: relevantPoints.filter(p => p.action === 'attack_error').length,
    serveAces: relevantPoints.filter(p => p.action === 'serve_ace').length,
    serveErrors: relevantPoints.filter(p => p.action === 'serve_error').length,
    blockPoints: relevantPoints.filter(p => p.action === 'block_point').length,
    blockErrors: relevantPoints.filter(p => p.action === 'block_error').length,
    receptionErrors: relevantPoints.filter(p => p.action === 'reception_error').length,
    settingErrors: relevantPoints.filter(p => p.action === 'setting_error').length,
    faults: relevantPoints.filter(p => p.action === 'fault').length,
    opponentErrors: relevantPoints.filter(p => p.action === 'opponent_error').length,
  };

  // Dados para o gráfico de barras comparativo de atletas
  const chartData = filteredPlayerStatsList.map(p => ({
    name: p.nickname,
    'Pontos Feitos': p.totalPoints,
    'Erros Cedidos': p.totalErrors,
  }));

  return (
    <div className="page-container">
      {/* ── Action Bar Top ── */}
      <div className="geo-top-action-bar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/history')}>
          <ArrowLeft size={14} /> HISTÓRICO DE PARTIDAS
        </button>
      </div>

      {/* ── Placar Consolidado do Confronto ── */}
      <div className="geo-panel" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="geo-eyebrow">RELATÓRIO TÉCNICO DE PARTIDA</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {formatDate(match.created_at)} · MD{match.max_sets || 5}
        </div>
        <h1 className="geo-main-title" style={{ fontSize: 22, marginBottom: 16 }}>
          {match.home_team} VS {match.away_team}
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 32, marginBottom: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 52, fontWeight: 900, color: 'var(--team-blue)', lineHeight: 1 }}>{homeWins}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase' }}>{match.home_team}</div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-muted)' }}>×</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 52, fontWeight: 900, color: 'var(--team-red)', lineHeight: 1 }}>{awayWins}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'uppercase' }}>{match.away_team}</div>
          </div>
        </div>

        {/* Set History Chips */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {match.sets?.map(s => (
            <div
              key={s.id}
              className={`geo-set-chip ${s.winner === 'home' ? 'home-win' : s.winner === 'away' ? 'away-win' : ''}`}
            >
              <span className="set-num">SET {s.set_number}</span>
              <span className="set-score-digits">{s.home_score} – {s.away_score}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Seletor de Filtro de Equipe ── */}
      <div className="geo-panel" style={{ padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} color="var(--gold)" />
            <span style={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.06em' }}>
              FILTRAR SCOUT PÓS-JOGO:
            </span>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedTeamFilter === 'all' ? 'btn-gold' : 'btn-secondary'}`}
              onClick={() => setSelectedTeamFilter('all')}
            >
              TODAS AS EQUIPES
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedTeamFilter === 'home' ? 'btn-gold' : 'btn-secondary'}`}
              style={selectedTeamFilter === 'home' ? {} : { borderLeft: '3px solid var(--team-blue)' }}
              onClick={() => setSelectedTeamFilter('home')}
            >
              {match.home_team.toUpperCase()}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${selectedTeamFilter === 'away' ? 'btn-gold' : 'btn-secondary'}`}
              style={selectedTeamFilter === 'away' ? {} : { borderLeft: '3px solid var(--team-red)' }}
              onClick={() => setSelectedTeamFilter('away')}
            >
              {match.away_team.toUpperCase()}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs: Dashboard de Scout vs Cronologia ── */}
      <div className="geo-tabs-bar">
        <button
          className={`geo-tab-btn ${activeTab === 'scout' ? 'active' : ''}`}
          onClick={() => setActiveTab('scout')}
        >
          <BarChart2 size={15} /> SCOUT & DESEMPENHO DOS ATLETAS ({filteredPlayerStatsList.length})
        </button>
        <button
          className={`geo-tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          <Activity size={15} /> CRONOLOGIA DE PONTOS ({relevantPoints.length})
        </button>
      </div>

      {activeTab === 'scout' ? (
        <>
          {/* ── Resumo Geral de Fundamentos do Confronto ── */}
          <div className="geo-stat-metrics-grid" style={{ marginBottom: 20 }}>
            <div className="geo-stat-metric-card">
              <div className="metric-header">
                <span className="metric-label">PONTOS DE ATAQUE</span>
                <Award size={14} style={{ color: 'var(--gold)' }} />
              </div>
              <div className="metric-value" style={{ color: 'var(--gold)' }}>{teamTotals.attackPoints}</div>
              <div className="metric-sub">ERROS DE ATAQUE: {teamTotals.attackErrors}</div>
            </div>

            <div className="geo-stat-metric-card">
              <div className="metric-header">
                <span className="metric-label">ACES DE SAQUE</span>
                <Activity size={14} style={{ color: '#3B82F6' }} />
              </div>
              <div className="metric-value" style={{ color: '#3B82F6' }}>{teamTotals.serveAces}</div>
              <div className="metric-sub">ERROS DE SAQUE: {teamTotals.serveErrors}</div>
            </div>

            <div className="geo-stat-metric-card">
              <div className="metric-header">
                <span className="metric-label">PONTOS DE BLOQUEIO</span>
                <CheckCircle size={14} style={{ color: '#10B981' }} />
              </div>
              <div className="metric-value" style={{ color: '#10B981' }}>{teamTotals.blockPoints}</div>
              <div className="metric-sub">ERROS DE BLOQUEIO: {teamTotals.blockErrors}</div>
            </div>

            <div className="geo-stat-metric-card">
              <div className="metric-header">
                <span className="metric-label">ERROS DE PASSE / REC.</span>
                <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
              </div>
              <div className="metric-value" style={{ color: 'var(--danger)' }}>{teamTotals.receptionErrors}</div>
              <div className="metric-sub">ERROS DE LEVANTAMENTO: {teamTotals.settingErrors}</div>
            </div>
          </div>

          {/* ── Dashboard: Tabela Detalhada de Scout por Atleta ── */}
          <div className="geo-panel">
            <div className="geo-panel-header">
              <div>
                <div className="geo-eyebrow">DESEMPENHO INDIVIDUAL</div>
                <h3 className="geo-panel-title">
                  SCOUT POR ATLETA {selectedTeamFilter !== 'all' ? `· ${selectedTeamFilter === 'home' ? match.home_team.toUpperCase() : match.away_team.toUpperCase()}` : ''}
                </h3>
              </div>
            </div>

            {filteredPlayerStatsList.length === 0 ? (
              <div className="geo-empty-panel">
                <div className="geo-empty-desc">Nenhum atleta encontrado para o filtro selecionado.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="geo-scout-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>ATLETA</th>
                      <th>EQUIPE</th>
                      <th>ATQ+</th>
                      <th>ATQ-</th>
                      <th>SAQ+ (ACE)</th>
                      <th>SAQ-</th>
                      <th>BLO+</th>
                      <th>REC- (PASSE)</th>
                      <th>LEV-</th>
                      <th>TOTAL PTS</th>
                      <th>SALDO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayerStatsList.map(p => (
                      <tr key={p.id}>
                        <td style={{ textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>
                              {p.number ? `#${p.number}` : ''}
                            </span>
                            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{p.name}</span>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                              ({p.position})
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: 9.5, fontWeight: 900,
                            color: p.team === 'home' ? '#60A5FA' : '#F87171',
                            background: p.team === 'home' ? 'rgba(37,99,235,0.15)' : 'rgba(220,38,38,0.15)',
                            padding: '2px 6px', borderRadius: 2, textTransform: 'uppercase'
                          }}>
                            {p.team === 'home' ? match.home_team : match.away_team}
                          </span>
                        </td>
                        <td className="stat-pos">{p.attackPoints}</td>
                        <td className="stat-neg">{p.attackErrors}</td>
                        <td className="stat-pos">{p.serveAces}</td>
                        <td className="stat-neg">{p.serveErrors}</td>
                        <td className="stat-pos">{p.blockPoints}</td>
                        <td className="stat-neg">{p.receptionErrors}</td>
                        <td className="stat-neg">{p.settingErrors}</td>
                        <td className="stat-total">{p.totalPoints}</td>
                        <td className={`stat-balance ${p.balance > 0 ? 'pos' : p.balance < 0 ? 'neg' : ''}`}>
                          {p.balance > 0 ? `+${p.balance}` : p.balance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Gráfico Comparativo: Pontos Feitos vs Erros Cedidos por Atleta ── */}
          {filteredPlayerStatsList.length > 0 && (
            <div className="geo-panel">
              <div className="geo-panel-header">
                <div>
                  <div className="geo-eyebrow">GRÁFICO COMPARATIVO</div>
                  <h3 className="geo-panel-title">
                    PONTOS FEITOS VS ERROS CEDIDOS {selectedTeamFilter !== 'all' ? `· ${selectedTeamFilter === 'home' ? match.home_team.toUpperCase() : match.away_team.toUpperCase()}` : ''}
                  </h3>
                </div>
              </div>

              <div style={{ width: '100%', height: 260, marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 15, left: -20 }}>
                    <CartesianGrid stroke="#212B3E" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: '#212B3E' }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
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
                    />
                    <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10 }} />
                    <Bar dataKey="Pontos Feitos" fill="#10B981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Erros Cedidos" fill="#EF4444" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ── Cronologia Detalhada de Pontos ── */
        <div className="geo-panel">
          <div className="geo-panel-header">
            <div>
              <div className="geo-eyebrow">CRONOLOGIA DE JOGO</div>
              <h3 className="geo-panel-title">
                REGISTRO SEGUNDO A SEGUNDO {selectedTeamFilter !== 'all' ? `· ${selectedTeamFilter === 'home' ? match.home_team.toUpperCase() : match.away_team.toUpperCase()}` : ''}
              </h3>
            </div>
          </div>

          {relevantPoints.length === 0 ? (
            <div className="geo-empty-panel">
              <div className="geo-empty-desc">Nenhum ponto registrado para este filtro.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {relevantPoints.map((pt, i) => (
                <div
                  key={pt.id || i}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)', fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontWeight: 800, color: pt.team === 'home' ? 'var(--team-blue)' : 'var(--team-red)',
                      fontSize: 11, minWidth: 80
                    }}>
                      {pt.team === 'home' ? match.home_team : match.away_team}
                    </span>
                    <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                      {ACTION_LABELS[pt.action] || pt.action}
                    </span>
                    {pt.player_name && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        · {pt.player_name}
                      </span>
                    )}
                  </div>

                  <span style={{ fontFamily: 'Space Grotesk, monospace', fontWeight: 800, color: 'var(--gold)' }}>
                    {pt.home_score_after} – {pt.away_score_after}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
