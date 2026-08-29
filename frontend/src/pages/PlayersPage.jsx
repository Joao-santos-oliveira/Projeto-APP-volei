import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Users } from 'lucide-react';
import { api } from '../api/client';
import PlayerCard from '../components/players/PlayerCard';
import PlayerForm from '../components/players/PlayerForm';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { POSITIONS } from '../utils/constants';

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await api.getPlayers();
      setPlayers(data);
    } catch {
      toast('Erro ao carregar jogadores', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    try {
      await api.createPlayer(data);
      toast(`${data.name} adicionado!`, 'success');
      setShowCreate(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const filtered = players.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.nickname || '').toLowerCase().includes(search.toLowerCase());
    const matchPos = !filterPos || p.primary_position === filterPos;
    return matchSearch && matchPos;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Jogadores</h1>
          <p className="page-subtitle">
            {players.length} jogador{players.length !== 1 ? 'es' : ''} cadastrado{players.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          Novo Jogador
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:'1 1 220px' }}>
          <Search size={16} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ paddingLeft:36 }}
            placeholder="Buscar jogador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ flex:'0 0 180px' }}
          value={filterPos} onChange={e => setFilterPos(e.target.value)}>
          <option value="">Todas as posições</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏐</div>
          <h3>{search || filterPos ? 'Nenhum jogador encontrado' : 'Nenhum jogador cadastrado'}</h3>
          <p>{search || filterPos ? 'Tente outros filtros.' : 'Clique em "Novo Jogador" para começar.'}</p>
        </div>
      ) : (
        <div className="player-grid">
          {filtered.map(p => (
            <PlayerCard key={p.id} player={p} onClick={() => navigate(`/players/${p.id}`)} />
          ))}
        </div>
      )}

      {/* Modal criar jogador */}
      {showCreate && (
        <Modal title="Novo Jogador" onClose={() => setShowCreate(false)} size="lg">
          <PlayerForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  );
}
