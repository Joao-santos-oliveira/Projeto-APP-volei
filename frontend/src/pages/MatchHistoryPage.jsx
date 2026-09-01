import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Calendar, CheckCircle, Award, Activity,
  BarChart2, AlertCircle, Filter, Zap, Shield, Clock, Heart, Check, Flame, Users
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getInitials } from '../utils/constants';
import { getMatchHighlights, getVotingWindowStatus, processPopularVotes } from '../utils/matchMvp';
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
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'scout'); // 'scout' | 'voting' | 'log'
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all'); // 'all' | 'home' | 'away'
  const [votingPlayerId, setVotingPlayerId] = useState(null);
  const [myVotedPlayerId, setMyVotedPlayerId] = useState(null);

  // Timer para contagem regressiva da votação de 2 horas
  const [currentTime, setCurrentTime] = useState(Date.now());

  const loadMatch = () => {
    return api.getMatch(id)
      .then(m => {
        setMatch(m);
        // Verifica se o dispositivo/usuário atual já votou nesta partida
        const storedMyVote = localStorage.getItem(`volei_my_vote_${id}`);
        if (storedMyVote) {
          setMyVotedPlayerId(Number(storedMyVote));
        }
      })
      .catch(() => {
        toast('Partida não encontrada', 'error');
        navigate('/history');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMatch();
  }, [id]);

  // Atualiza relógio a cada segundo para o cronômetro de 2 horas
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Cálculos de MVP Estatístico e Destaques ──
  const highlights = useMemo(() => {
    return match ? getMatchHighlights(match) : { playerStats: [], mvp: null, topScorer: null, bestBlocker: null, bestServer: null };
  }, [match]);

  // ── Status da Janela de Votação Popular (2 horas) ──
  const votingStatus = useMemo(() => {
    return match ? getVotingWindowStatus(match) : { isVotingActive: false, formattedTime: '', hasExpired: true };
  }, [match, currentTime]);

  // ── Apuração dos Votos Populares ──
  const popularData = useMemo(() => {
    return processPopularVotes(match?.votes || [], highlights.playerStats);
  }, [match?.votes, highlights.playerStats]);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!match) return null;

  const homeWins = match.sets?.filter(s => s.winner === 'home').length || 0;
  const awayWins = match.sets?.filter(s => s.winner === 'away').length || 0;
  const points = match.points || [];

  // Filtra por equipe selecionada para a tabela e gráfico de scout
  const filteredPlayerStatsList = highlights.playerStats
    .filter(p => selectedTeamFilter === 'all' || p.team === selectedTeamFilter);

  // Métricas Totais por Fundamento
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

  const chartData = filteredPlayerStatsList.map(p => ({
    name: p.nickname,
    'Pontos Feitos': p.totalPoints,
    'Erros Cedidos': p.totalErrors,
  }));

  // Função para registrar voto popular
  const handleVote = async (playerId) => {
    if (!votingStatus.isVotingActive) {
      toast('O prazo de 2 horas para votação popular nesta partida já encerrou', 'error');
      return;
    }
    setVotingPlayerId(playerId);
    try {
      await api.voteMatch(id, playerId);
      localStorage.setItem(`volei_my_vote_${id}`, String(playerId));
      setMyVotedPlayerId(playerId);
      toast('Voto registrado com sucesso! Obrigado pela participação.', 'success');
      await loadMatch();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setVotingPlayerId(null);
    }
  };

  const { mvp, topScorer, bestBlocker, bestServer } = highlights;
  const popularMvp = popularData.popularMvp;

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

      {/* ── 🏆 DESTAQUES & CRAQUES DA PARTIDA ── */}
      <div className="geo-panel" style={{ marginBottom: 20, background: 'linear-gradient(180deg, rgba(245,183,56,0.06) 0%, var(--bg-panel) 100%)', borderColor: 'rgba(245,183,56,0.3)' }}>
        <div className="geo-panel-header">
          <div>
            <div className="geo-eyebrow" style={{ color: 'var(--gold)' }}>PREMIAÇÕES INDIVIDUAIS</div>
            <h3 className="geo-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Trophy size={18} color="var(--gold)" /> CRAQUES & DESTAQUES DO CONFRONTO
            </h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
          {/* Card 1: 👑 MVP / Craque da Partida (Scout Estatístico) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245,183,56,0.15) 0%, rgba(15,23,42,0.85) 100%)',
            border: '1px solid rgba(245,183,56,0.5)',
            borderRadius: 12,
            padding: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 25px rgba(245,183,56,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontWeight: 900, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <Trophy size={15} /> CRAQUE DA PARTIDA (SCOUT)
              </div>
              <span style={{ fontSize: 10, background: 'var(--gold)', color: '#0F172A', fontWeight: 900, padding: '2px 8px', borderRadius: 4 }}>
                EFICIÊNCIA Nº 1
              </span>
            </div>

            {mvp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  background: 'var(--gold)',
                  color: '#0F172A',
                  fontWeight: 900,
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  boxShadow: '0 0 15px rgba(245,183,56,0.3)'
                }}>
                  {mvp.photo ? (
                    <img src={mvp.photo} alt={mvp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(mvp.name)
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mvp.nickname || mvp.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {mvp.team === 'home' ? match.home_team : match.away_team} · {mvp.position} {mvp.number ? `· #${mvp.number}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>PONTOS: </span>
                      <strong style={{ color: 'var(--gold)', fontFamily: 'Space Grotesk, monospace' }}>{mvp.totalPoints}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>SALDO: </span>
                      <strong style={{ color: mvp.balance >= 0 ? '#10B981' : 'var(--danger)', fontFamily: 'Space Grotesk, monospace' }}>
                        {mvp.balance >= 0 ? `+${mvp.balance}` : mvp.balance}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Sem pontuação registrada.</div>
            )}
          </div>

          {/* Card 2: ⭐ Craque da Galera (Votação Popular - 2 Horas) */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(15,23,42,0.85) 100%)',
            border: '1px solid rgba(236,72,153,0.4)',
            borderRadius: 12,
            padding: 18,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F472B6', fontWeight: 900, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <Heart size={15} /> CRAQUE DA GALERA (VOTAÇÃO POPULAR)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: votingStatus.isVotingActive ? '#34D399' : '#94A3B8' }}>
                <Clock size={12} />
                <span>{votingStatus.formattedTime}</span>
              </div>
            </div>

            {popularMvp ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  boxShadow: '0 0 15px rgba(236,72,153,0.3)'
                }}>
                  {popularMvp.photo ? (
                    <img src={popularMvp.photo} alt={popularMvp.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(popularMvp.name)
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {popularMvp.nickname || popularMvp.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {popularMvp.team === 'home' ? match.home_team : match.away_team} · {popularMvp.position}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: '#F472B6', fontWeight: 800 }}>
                      {popularMvp.votesCount} voto{popularMvp.votesCount !== 1 ? 's' : ''} ({popularMvp.votePercentage}%)
                    </div>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => setActiveTab('voting')}
                      style={{ padding: '2px 8px', fontSize: 10, borderColor: 'rgba(236,72,153,0.4)', color: '#F472B6' }}
                    >
                      {votingStatus.isVotingActive ? 'VOTAR AGORA →' : 'VER APURAÇÃO →'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 12, color: '#CBD5E1', marginBottom: 6 }}>
                  {votingStatus.isVotingActive ? 'A votação está aberta! Nenhum voto registrado ainda.' : 'Nenhum voto foi registrado no período.'}
                </div>
                {votingStatus.isVotingActive && (
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => setActiveTab('voting')}
                    style={{ fontSize: 11, fontWeight: 800 }}
                  >
                    VOTAR NO CRAQUE DA GALERA (2H)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mini Grid: Destaques por Fundamento */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {/* Top Scorer */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MAIOR PONTUADOR</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {topScorer ? `${topScorer.nickname || topScorer.name} (${topScorer.totalPoints} pts)` : '—'}
              </div>
            </div>
          </div>

          {/* Best Blocker */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>MURALHA (BLOQUEIO)</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bestBlocker ? `${bestBlocker.nickname || bestBlocker.name} (${bestBlocker.blockPoints} bloq)` : '—'}
              </div>
            </div>
          </div>

          {/* Best Server */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(59,130,246,0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>ÁS DO SAQUE</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bestServer ? `${bestServer.nickname || bestServer.name} (${bestServer.serveAces} aces)` : '—'}
              </div>
            </div>
          </div>
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

      {/* ── Tabs: Dashboard de Scout vs Votação Popular vs Cronologia ── */}
      <div className="geo-tabs-bar">
        <button
          className={`geo-tab-btn ${activeTab === 'scout' ? 'active' : ''}`}
          onClick={() => setActiveTab('scout')}
        >
          <BarChart2 size={15} /> SCOUT & DESEMPENHO ({filteredPlayerStatsList.length})
        </button>
        <button
          className={`geo-tab-btn ${activeTab === 'voting' ? 'active' : ''}`}
          onClick={() => setActiveTab('voting')}
          style={votingStatus.isVotingActive ? { color: '#F472B6', fontWeight: 900 } : {}}
        >
          <Heart size={15} /> VOTAÇÃO POPULAR (CRAQUE DA GALERA)
          {votingStatus.isVotingActive && (
            <span style={{ background: '#EC4899', color: '#FFFFFF', fontSize: 10, padding: '2px 6px', borderRadius: 10, marginLeft: 6 }}>
              ABERTA (2H)
            </span>
          )}
        </button>
        <button
          className={`geo-tab-btn ${activeTab === 'log' ? 'active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          <Activity size={15} /> CRONOLOGIA DE PONTOS ({relevantPoints.length})
        </button>
      </div>

      {activeTab === 'scout' && (
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
                    {filteredPlayerStatsList.map(p => {
                      const isMvp = highlights.mvp && highlights.mvp.id === p.id;
                      return (
                        <tr key={p.id} style={isMvp ? { background: 'rgba(245,183,56,0.06)' } : {}}>
                          <td style={{ textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 10, color: 'var(--gold)', fontWeight: 800 }}>
                                {p.number ? `#${p.number}` : '—'}
                              </span>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontWeight: 800, color: isMvp ? 'var(--gold)' : '#FFFFFF' }}>
                                    {p.nickname || p.name}
                                  </span>
                                  {isMvp && <span title="Craque da Partida (MVP Estatístico)">👑</span>}
                                </div>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  {p.position}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: 10, fontWeight: 800,
                              color: p.team === 'home' ? 'var(--team-blue)' : 'var(--team-red)'
                            }}>
                              {p.team === 'home' ? match.home_team : match.away_team}
                            </span>
                          </td>
                          <td style={{ color: '#10B981', fontWeight: 700 }}>{p.attackPoints}</td>
                          <td style={{ color: 'var(--danger)' }}>{p.attackErrors}</td>
                          <td style={{ color: '#3B82F6', fontWeight: 700 }}>{p.serveAces}</td>
                          <td style={{ color: 'var(--danger)' }}>{p.serveErrors}</td>
                          <td style={{ color: '#10B981', fontWeight: 700 }}>{p.blockPoints}</td>
                          <td style={{ color: 'var(--danger)' }}>{p.receptionErrors}</td>
                          <td style={{ color: 'var(--danger)' }}>{p.settingErrors}</td>
                          <td style={{
                            fontFamily: 'Space Grotesk, monospace', fontWeight: 900,
                            color: isMvp ? 'var(--gold)' : '#FFFFFF', fontSize: 14
                          }}>
                            {p.totalPoints}
                          </td>
                          <td style={{
                            fontFamily: 'Space Grotesk, monospace', fontWeight: 900,
                            color: p.balance > 0 ? '#10B981' : p.balance < 0 ? 'var(--danger)' : 'var(--text-muted)',
                            fontSize: 13
                          }}>
                            {p.balance > 0 ? `+${p.balance}` : p.balance}
                          </td>
                        </tr>
                      );
                    })}
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
      )}

      {/* ── ABA: VOTAÇÃO POPULAR (CRAQUE DA GALERA - 2 HORAS) ── */}
      {activeTab === 'voting' && (
        <div className="geo-panel">
          <div className="geo-panel-header">
            <div>
              <div className="geo-eyebrow" style={{ color: '#F472B6' }}>VOTAÇÃO POPULAR · PRAZO DE 2 HORAS</div>
              <h3 className="geo-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Heart size={18} color="#EC4899" /> ELEIÇÃO DO CRAQUE DA GALERA
              </h3>
              <p className="geo-panel-subtitle">
                Torcedores, atletas e comissão podem votar no atleta de maior destaque na partida.
              </p>
            </div>

            <div style={{
              background: votingStatus.isVotingActive ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.2)',
              border: `1px solid ${votingStatus.isVotingActive ? 'rgba(16,185,129,0.4)' : 'rgba(100,116,139,0.4)'}`,
              borderRadius: 8,
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Clock size={16} color={votingStatus.isVotingActive ? '#10B981' : '#94A3B8'} />
              <div>
                <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: votingStatus.isVotingActive ? '#10B981' : '#94A3B8' }}>
                  {votingStatus.isVotingActive ? 'TEMPO RESTANTE' : 'STATUS DA VOTAÇÃO'}
                </div>
                <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 13, fontWeight: 900, color: '#FFFFFF' }}>
                  {votingStatus.formattedTime}
                </div>
              </div>
            </div>
          </div>

          {/* Banner de Status */}
          <div style={{
            background: votingStatus.isVotingActive ? 'linear-gradient(90deg, rgba(236,72,153,0.1), rgba(59,130,246,0.1))' : 'rgba(15,23,42,0.6)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: votingStatus.isVotingActive ? '#EC4899' : '#475569',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900
              }}>
                <Heart size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#FFFFFF' }}>
                  {votingStatus.isVotingActive
                    ? 'A votação está aberta ao público!'
                    : 'Votação oficial encerrada.'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Total acumulado: <strong>{popularData.totalVotes} voto{popularData.totalVotes !== 1 ? 's' : ''}</strong>
                  {myVotedPlayerId ? ' · Você já registrou o seu voto nesta partida.' : ''}
                </div>
              </div>
            </div>

            {popularMvp && (
              <div style={{
                background: 'rgba(236,72,153,0.15)',
                border: '1px solid rgba(236,72,153,0.3)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                color: '#F472B6',
                fontWeight: 800
              }}>
                ⭐ Líder dos Votos: {popularMvp.nickname || popularMvp.name} ({popularMvp.votesCount} votos)
              </div>
            )}
          </div>

          {/* Grid / Lista de Atletas para Votação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {popularData.rankedPlayers.map(p => {
              const isMyVote = myVotedPlayerId === p.id;
              const isLeader = popularMvp && popularMvp.id === p.id && p.votesCount > 0;

              return (
                <div
                  key={p.id}
                  style={{
                    background: isMyVote ? 'rgba(236,72,153,0.1)' : 'var(--bg-secondary)',
                    border: `1px solid ${isMyVote ? 'rgba(236,72,153,0.6)' : isLeader ? 'rgba(245,183,56,0.4)' : 'var(--border)'}`,
                    borderRadius: 10,
                    padding: '12px 16px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: p.team === 'home' ? 'var(--team-blue)' : 'var(--team-red)',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {p.photo ? (
                          <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(p.name)
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#FFFFFF' }}>
                            {p.nickname || p.name}
                          </span>
                          {p.number && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 800 }}>#{p.number}</span>}
                          {isLeader && (
                            <span style={{ background: 'var(--gold)', color: '#0F172A', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 4 }}>
                              ⭐ LÍDER
                            </span>
                          )}
                          {isMyVote && (
                            <span style={{ background: '#EC4899', color: '#FFFFFF', fontSize: 9, fontWeight: 900, padding: '1px 6px', borderRadius: 4 }}>
                              SEU VOTO ✓
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {p.team === 'home' ? match.home_team : match.away_team} · {p.position} · {p.totalPoints} pts no jogo
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 16, fontWeight: 900, color: '#FFFFFF' }}>
                          {p.votesCount} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>voto{p.votesCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#F472B6', fontWeight: 800 }}>
                          {p.votePercentage}%
                        </div>
                      </div>

                      {votingStatus.isVotingActive ? (
                        <button
                          className={`btn btn-sm ${isMyVote ? 'btn-gold' : 'btn-secondary'}`}
                          onClick={() => handleVote(p.id)}
                          disabled={votingPlayerId === p.id}
                          style={{
                            minWidth: 100,
                            borderColor: isMyVote ? 'var(--gold)' : 'rgba(236,72,153,0.4)',
                            color: isMyVote ? '#0F172A' : '#F472B6'
                          }}
                        >
                          {votingPlayerId === p.id ? (
                            'VOTANDO...'
                          ) : isMyVote ? (
                            <>
                              <Check size={14} /> VOTADO
                            </>
                          ) : (
                            <>
                              <Heart size={13} /> VOTAR
                            </>
                          )}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Encerrado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso de Votos */}
                  <div style={{
                    width: '100%',
                    height: 6,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 3,
                    marginTop: 10,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${p.votePercentage}%`,
                      height: '100%',
                      background: isLeader ? 'linear-gradient(90deg, #F59E0B, #EC4899)' : isMyVote ? '#EC4899' : 'rgba(236,72,153,0.5)',
                      borderRadius: 3,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ABA: CRONOLOGIA DE PONTOS ── */}
      {activeTab === 'log' && (
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
