import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Trash2, Clock } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getInitials } from '../utils/constants';
import Modal from '../components/ui/Modal';

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Setup nova partida
  const [setup, setSetup] = useState({
    home_team: 'Nosso Time',
    away_team: 'Adversário',
    max_sets: 5,
    home_players: [],
  });

  const load = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([api.getMatches(), api.getPlayers()]);
      setMatches(m);
      setPlayers(p);
    } catch {
      toast('Erro ao carregar partidas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePlayer = (id) => {
    setSetup(s => ({
      ...s,
      home_players: s.home_players.includes(id)
        ? s.home_players.filter(x => x !== id)
        : [...s.home_players, id]
    }));
  };

  const handleCreate = async () => {
    try {
      const match = await api.createMatch(setup);
      toast('Partida criada!', 'success');
      setShowCreate(false);
      navigate(`/live/${match.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Remover esta partida?')) return;
    try {
      await api.deleteMatch(id);
      toast('Partida removida', 'info');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const getMatchScore = (match) => {
    if (!match.sets?.length) return '0 × 0';
    const homeWins = match.sets.filter(s => s.winner === 'home').length;
    const awayWins = match.sets.filter(s => s.winner === 'away').length;
    return `${homeWins} × ${awayWins} sets`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Partidas</h1>
          <p className="page-subtitle">{matches.length} partida{matches.length !== 1 ? 's' : ''} registrada{matches.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Nova Partida
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏆</div>
          <h3>Nenhuma partida registrada</h3>
          <p>Crie uma nova partida para começar a marcar pontos!</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {matches.map(m => (
            <div
              key={m.id}
              className="history-item"
              style={{ cursor:'pointer' }}
              onClick={() => navigate(m.status === 'live' ? `/live/${m.id}` : `/history/${m.id}`)}
            >
              <div style={{
                width:48, height:48, borderRadius:12,
                background: m.status === 'live' ? 'rgba(34,197,94,0.1)' : 'var(--bg-input)',
                border:`1px solid ${m.status === 'live' ? 'var(--success)' : 'var(--border)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, flexShrink:0
              }}>
                {m.status === 'live' ? '🔴' : '🏐'}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                  {m.home_team} vs {m.away_team}
                </div>
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:2 }}>
                  {formatDate(m.created_at)} · {getMatchScore(m)}
                  {m.home_players?.length > 0 && ` · ${m.home_players.length} jogador${m.home_players.length !== 1 ? 'es' : ''}`}
                </div>
              </div>

              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                {m.status === 'live' && (
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--success)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    AO VIVO
                  </span>
                )}
                {m.status === 'finished' && (
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase' }}>
                    Finalizada
                  </span>
                )}
                <button className="btn btn-ghost btn-icon btn-sm" onClick={e => handleDelete(m.id, e)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nova partida */}
      {showCreate && (
        <Modal title="Nova Partida" onClose={() => setShowCreate(false)} size="lg">
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Time da Casa</label>
                <input className="form-input" value={setup.home_team}
                  onChange={e => setSetup(s => ({ ...s, home_team: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Adversário</label>
                <input className="form-input" value={setup.away_team}
                  onChange={e => setSetup(s => ({ ...s, away_team: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Formato</label>
              <select className="form-select" value={setup.max_sets}
                onChange={e => setSetup(s => ({ ...s, max_sets: parseInt(e.target.value) }))}>
                <option value={3}>Melhor de 3 (MD3)</option>
                <option value={5}>Melhor de 5 (MD5)</option>
                <option value={1}>1 Set (treino)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Jogadores em Quadra</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:8, maxHeight:260, overflowY:'auto' }}>
                {players.map(p => (
                  <button key={p.id} type="button"
                    style={{
                      display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:10,
                      borderRadius:10, border:`2px solid ${setup.home_players.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                      background: setup.home_players.includes(p.id) ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                      cursor:'pointer', color: setup.home_players.includes(p.id) ? 'var(--text-accent)' : 'var(--text-secondary)',
                      transition:'all 0.15s'
                    }}
                    onClick={() => togglePlayer(p.id)}
                  >
                    <div style={{
                      width:36, height:36, borderRadius:'50%',
                      background:'var(--bg-input)', display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:14, fontWeight:700,
                      overflow:'hidden'
                    }}>
                      {p.photo ? <img src={p.photo} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : getInitials(p.name)}
                    </div>
                    <span style={{ fontSize:12, fontWeight:600, textAlign:'center' }}>{p.nickname || p.name.split(' ')[0]}</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{p.primary_position}</span>
                  </button>
                ))}
              </div>
              {setup.home_players.length > 0 && (
                <div style={{ fontSize:13, color:'var(--text-secondary)', marginTop:6 }}>
                  {setup.home_players.length} jogador{setup.home_players.length !== 1 ? 'es' : ''} selecionado{setup.home_players.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreate}>
                <Play size={16} /> Iniciar Partida
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
