import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Play, Trash2, Trophy, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getInitials } from '../utils/constants';
import Modal from '../components/ui/Modal';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Setup nova partida
  const [setup, setSetup] = useState({
    home_team_id: '',
    away_team_id: '',
    home_team: 'Equipe A',
    away_team: 'Equipe B',
    max_sets: 5,
    home_players: location.state?.preselectedPlayers || [],
    away_players: []
  });

  // Auto-abre modal se veio de Time
  useEffect(() => {
    if (location.state?.preselectedPlayers?.length) {
      setShowCreate(true);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [m, p, t] = await Promise.all([api.getMatches(), api.getPlayers(), api.getTeams()]);
      setMatches(m);
      setPlayers(p);
      setTeams(t);
    } catch {
      toast('Erro ao carregar partidas e equipes', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSelectHomeTeam = (teamId) => {
    if (!teamId) {
      setSetup(s => ({ ...s, home_team_id: '', home_team: 'Equipe A' }));
      return;
    }
    const t = teams.find(x => x.id === parseInt(teamId));
    if (t) {
      const tPlayerIds = (t.players || []).map(p => p.id);
      setSetup(s => ({
        ...s,
        home_team_id: teamId,
        home_team: t.name,
        home_players: tPlayerIds
      }));
    }
  };

  const handleSelectAwayTeam = (teamId) => {
    if (!teamId) {
      setSetup(s => ({ ...s, away_team_id: '', away_team: 'Equipe B' }));
      return;
    }
    const t = teams.find(x => x.id === parseInt(teamId));
    if (t) {
      const tPlayerIds = (t.players || []).map(p => p.id);
      setSetup(s => ({
        ...s,
        away_team_id: teamId,
        away_team: t.name,
        away_players: tPlayerIds
      }));
    }
  };

  const toggleHomePlayer = (id) => {
    setSetup(s => ({
      ...s,
      home_players: s.home_players.includes(id)
        ? s.home_players.filter(x => x !== id)
        : [...s.home_players, id]
    }));
  };

  const toggleAwayPlayer = (id) => {
    setSetup(s => ({
      ...s,
      away_players: s.away_players.includes(id)
        ? s.away_players.filter(x => x !== id)
        : [...s.away_players, id]
    }));
  };

  const handleCreate = async () => {
    if (!setup.home_team.trim() || !setup.away_team.trim()) {
      toast('Informe o nome de ambas as equipes', 'info');
      return;
    }
    try {
      const match = await api.createMatch(setup);
      toast('Partida iniciada', 'success');
      setShowCreate(false);
      navigate(`/live/${match.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const confirmDeleteMatch = async () => {
    if (!matchToDelete) return;
    setDeleting(true);
    try {
      await api.deleteMatch(matchToDelete.id);
      toast('Partida excluída com sucesso', 'info');
      setMatchToDelete(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getMatchScore = (match) => {
    if (!match.sets?.length) return '0 – 0';
    const homeWins = match.sets.filter(s => s.winner === 'home').length;
    const awayWins = match.sets.filter(s => s.winner === 'away').length;
    return `${homeWins} – ${awayWins}`;
  };

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="geo-page-header">
        <div className="geo-header-title-block">
          <div className="geo-eyebrow">CENTRAL DE JOGOS</div>
          <h1 className="geo-main-title">PARTIDAS & SCOUT AO VIVO</h1>
          <p className="geo-sub-title">
            {matches.length} PARTIDA{matches.length !== 1 ? 'S' : ''} REGISTRADA{matches.length !== 1 ? 'S' : ''}
          </p>
        </div>

        <button className="btn btn-gold" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          NOVA PARTIDA
        </button>
      </div>

      {/* ── Matches Stream ── */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : matches.length === 0 ? (
        <div className="geo-empty-panel">
          <Trophy size={36} className="geo-empty-icon" />
          <div className="geo-empty-title">NENHUMA PARTIDA REGISTRADA</div>
          <div className="geo-empty-desc">Inicie uma partida oficial ou treino para registrar pontos e estatísticas em tempo real.</div>
          <button className="btn btn-gold btn-sm" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            <Plus size={14} /> INICIAR PRIMEIRA PARTIDA
          </button>
        </div>
      ) : (
        <div className="geo-matches-grid">
          {matches.map(m => {
            const isLive = m.status === 'live';

            return (
              <div
                key={m.id}
                className={`geo-match-card ${isLive ? 'is-live' : ''}`}
                onClick={() => navigate(isLive ? `/live/${m.id}` : `/history/${m.id}`)}
              >
                <div className="geo-match-card-top">
                  <div className="geo-match-status-badge">
                    {isLive ? (
                      <span className="live-status-chip">
                        <span className="pulse-dot" /> AO VIVO
                      </span>
                    ) : (
                      <span className="finished-status-chip">ENCERRADA</span>
                    )}
                    <span className="match-date-stamp">{formatDate(m.date || m.created_at)}</span>
                  </div>

                  <button
                    type="button"
                    className="geo-delete-match-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMatchToDelete(m);
                    }}
                    title="Excluir partida"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="geo-match-scoreboard-row">
                  <div className="team-col">
                    <span className="team-title">{m.home_team}</span>
                  </div>

                  <div className="score-center-col">
                    <span className="score-summary">{getMatchScore(m)}</span>
                    <span className="sets-max-label">MD{m.max_sets || 5}</span>
                  </div>

                  <div className="team-col away">
                    <span className="team-title">{m.away_team}</span>
                  </div>
                </div>

                <div className="geo-match-card-footer">
                  <span className="match-players-count">
                    {(m.home_players?.length || 0) + (m.away_players?.length || 0)} ATLETAS ESCALADOS
                  </span>
                  <span className="match-action-hint">
                    {isLive ? 'CONTINUAR PONTUAÇÃO →' : 'VER RELATÓRIO →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Confirmação de Exclusão de Partida ── */}
      {matchToDelete && (
        <Modal title="CONFIRMAR EXCLUSÃO DE PARTIDA" onClose={() => setMatchToDelete(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 900, color: '#FFFFFF', marginBottom: 6 }}>
                EXCLUIR CONFRONTO: {matchToDelete.home_team.toUpperCase()} VS {matchToDelete.away_team.toUpperCase()}?
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Esta ação é irreversível e apagará todos os pontos, estatísticas e sets gravados para esta partida.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
              <button className="btn btn-secondary" onClick={() => setMatchToDelete(null)} disabled={deleting}>
                CANCELAR
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteMatch} disabled={deleting}>
                {deleting ? 'EXCLUINDO...' : 'SIM, EXCLUIR PARTIDA'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal Nova Partida ── */}
      {showCreate && (
        <Modal title="CONFIGURAR NOVA PARTIDA" onClose={() => setShowCreate(false)} size="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Escolha das Equipes */}
            <div className="form-row">
              {/* Equipe Mandante (A) */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#60A5FA' }}>EQUIPE MANDANTE (A)</label>
                {teams.length > 0 && (
                  <select
                    className="form-select"
                    style={{ marginBottom: 6, borderLeft: '3px solid var(--team-blue)' }}
                    value={setup.home_team_id}
                    onChange={e => handleSelectHomeTeam(e.target.value)}
                  >
                    <option value="">-- SELECIONE UMA EQUIPE OU DIGITE --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.players?.length || 0} atletas)</option>
                    ))}
                  </select>
                )}
                <input
                  className="form-input"
                  placeholder="Nome da Equipe Mandante"
                  value={setup.home_team}
                  onChange={e => setSetup(s => ({ ...s, home_team: e.target.value }))}
                />
              </div>

              {/* Equipe Visitante (B) */}
              <div className="form-group">
                <label className="form-label" style={{ color: '#F87171' }}>EQUIPE VISITANTE (B)</label>
                {teams.length > 0 && (
                  <select
                    className="form-select"
                    style={{ marginBottom: 6, borderLeft: '3px solid var(--team-red)' }}
                    value={setup.away_team_id}
                    onChange={e => handleSelectAwayTeam(e.target.value)}
                  >
                    <option value="">-- SELECIONE UMA EQUIPE OU DIGITE --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.players?.length || 0} atletas)</option>
                    ))}
                  </select>
                )}
                <input
                  className="form-input"
                  placeholder="Nome da Equipe Visitante"
                  value={setup.away_team}
                  onChange={e => setSetup(s => ({ ...s, away_team: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">FORMATO DE SETS</label>
              <select
                className="form-select"
                value={setup.max_sets}
                onChange={e => setSetup(s => ({ ...s, max_sets: parseInt(e.target.value) }))}
              >
                <option value={5}>MELHOR DE 5 (MD5)</option>
                <option value={3}>MELHOR DE 3 (MD3)</option>
                <option value={1}>1 SET (TREINO RÁPIDO)</option>
              </select>
            </div>

            {/* Atletas Mandante */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#60A5FA' }}>
                ATLETAS EM QUADRA · {setup.home_team.toUpperCase()} ({setup.home_players.length} SELECIONADOS)
              </label>
              <div className="geo-modal-player-grid">
                {players.map(p => {
                  const isSelected = setup.home_players.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`geo-modal-athlete-btn ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => toggleHomePlayer(p.id)}
                    >
                      <div className="athlete-btn-avatar">
                        {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                      </div>
                      <span className="athlete-btn-name">{p.nickname || p.name.split(' ')[0]}</span>
                      <span className="athlete-btn-pos">{p.primary_position}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Atletas Visitante */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#F87171' }}>
                ATLETAS EM QUADRA · {setup.away_team.toUpperCase()} ({setup.away_players.length} SELECIONADOS)
              </label>
              <div className="geo-modal-player-grid">
                {players.map(p => {
                  const isSelected = setup.away_players.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`geo-modal-athlete-btn ${isSelected ? 'is-selected' : ''}`}
                      style={isSelected ? { borderColor: 'var(--team-red)', background: 'rgba(220,38,38,0.15)' } : {}}
                      onClick={() => toggleAwayPlayer(p.id)}
                    >
                      <div className="athlete-btn-avatar">
                        {p.photo ? <img src={p.photo} alt={p.name} /> : getInitials(p.name)}
                      </div>
                      <span className="athlete-btn-name">{p.nickname || p.name.split(' ')[0]}</span>
                      <span className="athlete-btn-pos">{p.primary_position}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                CANCELAR
              </button>
              <button className="btn btn-gold" onClick={handleCreate}>
                <Play size={14} /> INICIAR PARTIDA
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
