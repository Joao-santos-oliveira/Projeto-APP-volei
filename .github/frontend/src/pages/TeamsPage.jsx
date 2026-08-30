import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Trash2, Edit2, ChevronRight, Camera } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { getInitials, positionBadgeClass } from '../utils/constants';
import Modal from '../components/ui/Modal';

// Cores pré-definidas para o time
const TEAM_COLORS = [
  '#f5c518', '#f97316', '#ef4444', '#ec4899',
  '#a855f7', '#3b82f6', '#06b6d4', '#10b981',
  '#84cc16', '#ffffff'
];

function TeamForm({ team, allPlayers, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: team?.name || '',
    description: team?.description || '',
    color: team?.color || '#f5c518',
    photo: team?.photo || null,
    player_ids: team?.players?.map(p => p.id) || []
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const togglePlayer = (id) =>
    setForm(f => ({
      ...f,
      player_ids: f.player_ids.includes(id)
        ? f.player_ids.filter(x => x !== id)
        : [...f.player_ids, id]
    }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Foto + Nome + Cor */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Logo do time */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 80, height: 80, borderRadius: 16,
              background: form.photo ? 'transparent' : `${form.color}22`,
              border: `3px solid ${form.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 32, overflow: 'hidden',
              transition: 'all 0.2s'
            }}
            title="Clique para adicionar logo"
          >
            {form.photo
              ? <img src={form.photo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Camera size={28} color={form.color} />
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Logo (opcional)</span>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Nome do Time *</label>
            <input className="form-input" value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ex: Seleção A, Time Principal..." />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <input className="form-input" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="ex: Time titular, temporada 2025..." />
          </div>
        </div>
      </div>

      {/* Cor do time */}
      <div className="form-group">
        <label className="form-label">Cor do Time</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {TEAM_COLORS.map(c => (
            <button key={c} type="button"
              onClick={() => setForm(f => ({ ...f, color: c }))}
              style={{
                width: 32, height: 32, borderRadius: '50%', background: c,
                border: form.color === c ? `3px solid white` : `2px solid ${c}44`,
                cursor: 'pointer',
                boxShadow: form.color === c ? `0 0 0 2px ${c}` : 'none',
                transition: 'all 0.15s'
              }}
            />
          ))}
          {/* Cor custom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <input type="color" value={form.color}
              onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Personalizar</span>
          </div>
        </div>
      </div>

      {/* Seleção de jogadores */}
      <div className="form-group">
        <label className="form-label">
          Jogadores &nbsp;
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
            ({form.player_ids.length} selecionado{form.player_ids.length !== 1 ? 's' : ''})
          </span>
        </label>
        {allPlayers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhum jogador cadastrado ainda.</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 8,
            maxHeight: 300, overflowY: 'auto',
            padding: 4
          }}>
            {allPlayers.map(p => {
              const selected = form.player_ids.includes(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => togglePlayer(p.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 8px',
                    borderRadius: 12,
                    border: `2px solid ${selected ? form.color : 'var(--border)'}`,
                    background: selected ? `${form.color}15` : 'var(--bg-elevated)',
                    cursor: 'pointer', transition: 'all 0.15s', position: 'relative'
                  }}
                >
                  {/* Check badge */}
                  {selected && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 16, height: 16, borderRadius: '50%',
                      background: form.color, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#000', fontWeight: 800
                    }}>✓</div>
                  )}
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: selected ? `${form.color}30` : 'var(--bg-input)',
                    border: `2px solid ${selected ? form.color : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, overflow: 'hidden',
                    color: selected ? form.color : 'var(--text-secondary)'
                  }}>
                    {p.photo
                      ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getInitials(p.name)
                    }
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, textAlign: 'center',
                    color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    lineHeight: 1.2
                  }}>
                    {p.nickname || p.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: 10, color: selected ? form.color : 'var(--text-muted)' }}>
                    {p.primary_position}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()}>
          {saving ? 'Salvando...' : (team ? 'Salvar Alterações' : 'Criar Time')}
        </button>
      </div>
    </form>
  );
}

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTeam, setEditTeam] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api.getTeams(), api.getPlayers()]);
      setTeams(t);
      setAllPlayers(p);
    } catch {
      toast('Erro ao carregar times', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data) => {
    try {
      await api.createTeam(data);
      toast(`Time "${data.name}" criado!`, 'success');
      setShowCreate(false);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleEdit = async (data) => {
    try {
      await api.updateTeam(editTeam.id, data);
      toast('Time atualizado!', 'success');
      setEditTeam(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDelete = async (team, e) => {
    e.stopPropagation();
    if (!window.confirm(`Remover o time "${team.name}"?`)) return;
    try {
      await api.deleteTeam(team.id);
      toast('Time removido', 'info');
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Times</h1>
          <p className="page-subtitle">
            {teams.length} time{teams.length !== 1 ? 's' : ''} · {allPlayers.length} jogador{allPlayers.length !== 1 ? 'es' : ''} cadastrado{allPlayers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Novo Time
        </button>
      </div>

      {/* Lista de times */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : teams.length === 0 ? (
        <div className="geo-empty-panel">
          <Users size={36} className="geo-empty-icon" />
          <div className="geo-empty-title">NENHUMA EQUIPE CRIADA</div>
          <div className="geo-empty-desc">Crie equipes personalizadas e vincule atletas do elenco para gerar estatísticas e iniciar partidas.</div>
          <button className="btn btn-gold btn-sm" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}>
            <Plus size={14} /> CRIAR PRIMEIRA EQUIPE
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              onClick={() => navigate(`/teams/${team.id}`)}
              onEdit={(e) => { e.stopPropagation(); setEditTeam(team); }}
              onDelete={(e) => handleDelete(team, e)}
            />
          ))}
        </div>
      )}

      {/* Modal criar */}
      {showCreate && (
        <Modal title="Novo Time" onClose={() => setShowCreate(false)} size="lg">
          <TeamForm allPlayers={allPlayers} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </Modal>
      )}

      {/* Modal editar */}
      {editTeam && (
        <Modal title="Editar Time" onClose={() => setEditTeam(null)} size="lg">
          <TeamForm team={editTeam} allPlayers={allPlayers} onSave={handleEdit} onCancel={() => setEditTeam(null)} />
        </Modal>
      )}
    </div>
  );
}

function TeamCard({ team, onClick, onEdit, onDelete }) {
  const color = team.color || '#f5c518';
  const players = team.players || [];

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid var(--border)`,
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.25s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}20`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Banner colorido */}
      <div style={{
        height: 72,
        background: `linear-gradient(135deg, ${color}33, ${color}11)`,
        borderBottom: `2px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo/Ícone */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${color}22`,
            border: `2px solid ${color}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, overflow: 'hidden', flexShrink: 0
          }}>
            {team.photo
              ? <img src={team.photo} alt={team.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '🏐'
            }
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{team.name}</div>
            {team.description && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {team.description}
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onEdit} title="Editar">
            <Edit2 size={14} />
          </button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onDelete} title="Remover"
            style={{ color: 'var(--danger)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Jogadores */}
      <div style={{ padding: '16px 20px 20px' }}>
        {players.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum jogador neste time.</p>
        ) : (
          <>
            {/* Stack de avatares */}
            <div style={{ display: 'flex', marginBottom: 12, alignItems: 'center' }}>
              {players.slice(0, 6).map((p, i) => (
                <div key={p.id} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: `2px solid var(--bg-card)`,
                  background: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--text-accent)',
                  marginLeft: i > 0 ? -10 : 0, overflow: 'hidden',
                  zIndex: 6 - i, position: 'relative',
                  boxShadow: `0 0 0 2px ${color}30`
                }}>
                  {p.photo
                    ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : getInitials(p.name)
                  }
                </div>
              ))}
              {players.length > 6 && (
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', marginLeft: -10,
                  background: 'var(--bg-input)', border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', zIndex: 0
                }}>
                  +{players.length - 6}
                </div>
              )}
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 14 }}>
                {players.length} jogador{players.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {/* Lista de posições */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {/* Agrupa por posição */}
              {Object.entries(
                players.reduce((acc, p) => {
                  const pos = p.primary_position;
                  acc[pos] = (acc[pos] || 0) + 1;
                  return acc;
                }, {})
              ).map(([pos, count]) => (
                <span key={pos} className={positionBadgeClass(pos)} style={{ fontSize: 10 }}>
                  {count}× {pos}
                </span>
              ))}
            </div>
          </>
        )}

        {/* Ver detalhes */}
        <div style={{
          marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ver time completo</span>
          <ChevronRight size={16} style={{ color }} />
        </div>
      </div>
    </div>
  );
}
