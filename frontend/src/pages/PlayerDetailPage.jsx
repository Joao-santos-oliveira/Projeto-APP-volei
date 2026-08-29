import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../api/client';
import PlayerRadar from '../components/players/PlayerRadar';
import PlayerForm from '../components/players/PlayerForm';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { positionBadgeClass, getInitials, TECHNICAL_ATTRS, COMPLEMENTARY_ATTRS, formatDate } from '../utils/constants';

const PIE_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#f97316'];

const ACTION_LABELS = {
  attack_point: 'Ataque (Ponto)', attack_error: 'Ataque (Erro)',
  serve_ace: 'Saque Ace', serve_error: 'Saque (Erro)',
  block_point: 'Bloqueio (Ponto)', block_error: 'Bloqueio (Erro)',
  reception_error: 'Recepção (Erro)', setting_error: 'Levantamento (Erro)',
  fault: 'Falta', opponent_error: 'Erro Adversário'
};

export default function PlayerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [tab, setTab] = useState('overview');

  const load = useCallback(async () => {
    try {
      const data = await api.getPlayer(id);
      setPlayer(data);
    } catch {
      toast('Jogador não encontrado', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (data) => {
    try {
      await api.updatePlayer(id, data);
      toast('Jogador atualizado!', 'success');
      setShowEdit(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remover ${player.name}?`)) return;
    try {
      await api.deletePlayer(id);
      toast('Jogador removido', 'info');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!player) return null;

  // Preparar dados de evolução
  const evolutionData = player.attribute_history?.map((h, i) => ({
    date: formatDate(h.recorded_at),
    Ataque: h.attack,
    Saque: h.serve,
    Recepção: h.reception,
    Bloqueio: h.block,
    Defesa: h.defense,
    Levantamento: h.setting,
  })) || [];

  // Dados de pizza de ações
  const pieData = (player.game_stats?.by_action || [])
    .map(a => ({ name: ACTION_LABELS[a.action] || a.action, value: a.count }));

  // Atributos atuais (último snapshot)
  const lastAttrs = player.attribute_history?.at(-1) || {};
  const currentAttrs = {
    attack: lastAttrs.attack ?? 5, serve: lastAttrs.serve ?? 5,
    reception: lastAttrs.reception ?? 5, block: lastAttrs.block ?? 5,
    defense: lastAttrs.defense ?? 5, setting: lastAttrs.setting ?? 5,
    communication: lastAttrs.communication ?? 5,
    consistency: lastAttrs.consistency ?? 5,
    versatility: lastAttrs.versatility ?? 5,
  };

  return (
    <div className="page-container">
      {/* Back button */}
      <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ marginBottom:16 }}>
        <ArrowLeft size={16} /> Jogadores
      </button>

      {/* Hero section */}
      <div className="card" style={{ marginBottom:24, padding:0, overflow:'hidden' }}>
        <div style={{ height:120, background:'var(--accent-grad)', position:'relative' }}>
          <div style={{
            position:'absolute', top:16, right:16,
            fontSize:80, fontWeight:900, color:'rgba(0,0,0,0.15)', lineHeight:1
          }}>
            {player.number ? `#${player.number}` : ''}
          </div>
        </div>
        <div style={{ padding:'0 24px 24px', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:20, marginTop:-32, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{
              width:72, height:72, borderRadius:'50%',
              border:'4px solid var(--bg-card)',
              background:'var(--bg-elevated)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, fontWeight:700, color:'var(--text-accent)',
              overflow:'hidden', flexShrink:0
            }}>
              {player.photo ? <img src={player.photo} alt={player.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : getInitials(player.name)}
            </div>
            <div style={{ flex:1 }}>
              <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', lineHeight:1.2 }}>
                {player.name}
                {player.nickname && <span style={{ fontSize:16, fontWeight:400, color:'var(--text-secondary)', marginLeft:8 }}>"{player.nickname}"</span>}
              </h1>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                <span className={positionBadgeClass(player.primary_position)}>{player.primary_position}</span>
                {player.secondary_positions?.map(sp => (
                  <span key={sp} className={positionBadgeClass(sp)} style={{ opacity:0.65 }}>{sp}</span>
                ))}
                {player.height && <span style={{ fontSize:13, color:'var(--text-muted)' }}>{player.height}cm</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
                <Edit2 size={15} /> Editar
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Stat rápidas */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-card-value">{player.game_stats?.total_actions || 0}</div>
              <div className="stat-card-label">Ações</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color:'var(--success)' }}>{player.game_stats?.points_made || 0}</div>
              <div className="stat-card-label">Pontos</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value" style={{ color:'var(--danger)' }}>{player.game_stats?.errors || 0}</div>
              <div className="stat-card-label">Erros</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-value">
                {player.game_stats?.total_actions
                  ? `${Math.round((player.game_stats.points_made / player.game_stats.total_actions) * 100)}%`
                  : '—'}
              </div>
              <div className="stat-card-label">Aproveito.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:24 }}>
        {[
          { key:'overview',   label:'Visão Geral' },
          { key:'evolution',  label:'Evolução' },
          { key:'gamestats',  label:'Estatísticas' },
          { key:'notes',      label:'Observações' },
        ].map(t => (
          <button key={t.key} className={`tab-btn${tab===t.key?' active':''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Visão Geral ─── */}
      {tab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div className="card">
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16, color:'var(--text-secondary)' }}>Radar de Atributos</h3>
            <PlayerRadar attributes={currentAttrs} />
          </div>
          <div className="card">
            <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16, color:'var(--text-secondary)' }}>Detalhamento</h3>
            {[...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS].map(({ key, label }) => {
              const val = currentAttrs[key] ?? 5;
              const color = val >= 8 ? 'var(--success)' : val >= 6 ? 'var(--text-accent)' : val >= 4 ? 'var(--warning)' : 'var(--danger)';
              return (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'var(--text-secondary)', minWidth:110 }}>{label}</span>
                  <div style={{ flex:1, height:6, background:'var(--bg-elevated)', borderRadius:3 }}>
                    <div style={{ width:`${val*10}%`, height:'100%', background:color, borderRadius:3, transition:'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color, minWidth:24, textAlign:'right' }}>{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Evolução ─── */}
      {tab === 'evolution' && (
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <TrendingUp size={18} style={{ color:'var(--text-accent)' }} />
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)' }}>
              Evolução dos Atributos ao Longo do Tempo
            </h3>
          </div>
          {evolutionData.length < 2 ? (
            <div className="empty-state" style={{ padding:40 }}>
              <p>Edite os atributos do jogador pelo menos uma vez para ver a evolução.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolutionData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:'#8b9ab8', fontSize:11 }} />
                <YAxis domain={[0,10]} tick={{ fill:'#8b9ab8', fontSize:11 }} />
                <Tooltip contentStyle={{ background:'#141820', border:'1px solid #2a3347', borderRadius:8, color:'#f0f4ff', fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:12, color:'#8b9ab8' }} />
                {['Ataque','Saque','Recepção','Bloqueio','Defesa','Levantamento'].map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={PIE_COLORS[i]} strokeWidth={2} dot={{ r:3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* ─── Estatísticas de jogo ─── */}
      {tab === 'gamestats' && (
        <div className="card">
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20, color:'var(--text-secondary)' }}>
            Distribuição de Ações em Jogo
          </h3>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}>
              <p>Nenhuma partida registrada ainda.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'center' }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${Math.round(percent*100)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'#141820', border:'1px solid #2a3347', borderRadius:8, fontSize:12, color:'#f0f4ff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div>
                {pieData.map((item, i) => (
                  <div key={item.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <div style={{ width:12, height:12, borderRadius:3, background:PIE_COLORS[i % PIE_COLORS.length], flexShrink:0 }} />
                    <span style={{ fontSize:13, color:'var(--text-secondary)', flex:1 }}>{item.name}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Observações ─── */}
      {tab === 'notes' && (
        <div className="card">
          <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16, color:'var(--text-secondary)' }}>Observações Táticas</h3>
          {player.notes ? (
            <p style={{ color:'var(--text-primary)', lineHeight:1.7, fontSize:15, whiteSpace:'pre-wrap' }}>{player.notes}</p>
          ) : (
            <p style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Nenhuma observação registrada.</p>
          )}
        </div>
      )}

      {/* Modal editar */}
      {showEdit && (
        <Modal title="Editar Jogador" onClose={() => setShowEdit(false)} size="lg">
          <PlayerForm player={{ ...player, attributes: currentAttrs }} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
        </Modal>
      )}
    </div>
  );
}
