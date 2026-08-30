import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, TrendingUp, Star, Send, X as XIcon,
  Shield, Activity, MessageSquare, BarChart2, Award, Crosshair, Ruler, Calendar,
  Lock, CheckCircle2, AlertTriangle, Zap, PieChart as PieIcon
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../api/client';
import PlayerRadar from '../components/players/PlayerRadar';
import PlayerForm from '../components/players/PlayerForm';
import PlayerStatCard from '../components/players/PlayerStatCard';
import PositionProficiencyBadge from '../components/players/PositionProficiencyBadge';
import Modal from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import {
  positionBadgeClass, getInitials, TECHNICAL_ATTRS, COMPLEMENTARY_ATTRS,
  formatDate, getPlayerProficiencies, avgTechnical
} from '../utils/constants';
import { calculateStatAttributes } from '../utils/statAttributes';

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#64748B'];
const ACTION_LABELS = {
  attack_point: 'Ataque (Ponto)',
  attack_error: 'Ataque (Erro)',
  serve_ace: 'Saque Ace',
  serve_error: 'Saque (Erro)',
  block_point: 'Bloqueio (Ponto)',
  block_error: 'Bloqueio (Erro)',
  reception_error: 'Recepção (Erro)',
  setting_error: 'Levantamento (Erro)',
  fault: 'Falta Tática',
  opponent_error: 'Erro Adversário'
};

const ACTION_TYPES = {
  attack_point: 'point',
  serve_ace: 'point',
  block_point: 'point',
  opponent_error: 'point',
  attack_error: 'error',
  serve_error: 'error',
  block_error: 'error',
  reception_error: 'error',
  setting_error: 'error',
  fault: 'error'
};

// ── Rating Individual por Usuário ────────────────────────────
function UserRatingSection({ playerId, avgAttributes, myRating, ratingCount, onUpdate }) {
  const { user } = useAuth();
  const toast = useToast();
  const KEYS = ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'];
  const [draft, setDraft] = useState(() => {
    const base = {};
    KEYS.forEach(k => base[k] = myRating?.[k] ?? avgAttributes?.[k] ?? 5);
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const base = {};
    KEYS.forEach(k => base[k] = myRating?.[k] ?? avgAttributes?.[k] ?? 5);
    setDraft(base);
    setDirty(false);
  }, [myRating]);

  const handleSlider = (key, val) => {
    setDraft(d => ({ ...d, [key]: parseFloat(val) }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.saveRating(playerId, draft);
      onUpdate(res);
      setDirty(false);
      toast('Avaliação técnica registrada com sucesso', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="geo-panel">
      <div className="geo-panel-header">
        <div>
          <div className="geo-eyebrow">SCOUTING INDIVIDUAL SUBJETIVO</div>
          <h3 className="geo-panel-title">AVALIAÇÃO TÉCNICA DO ATLETA</h3>
          <p className="geo-panel-subtitle">
            Avaliador: <strong style={{ color: user?.avatar_color }}>{user?.display_name}</strong>
            &nbsp;·&nbsp;{ratingCount} scout{ratingCount !== 1 ? 's' : ''} contabilizado{ratingCount !== 1 ? 's' : ''}
          </p>
        </div>
        {dirty && (
          <button className="btn btn-gold btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'SALVANDO...' : 'SALVAR NOTAS'}
          </button>
        )}
      </div>

      <div className="geo-slider-grid">
        <div className="geo-category-tag">FUNDAMENTOS DE JOGO</div>
        {TECHNICAL_ATTRS.map(({ key, label }) => {
          const myVal = draft[key];
          const avgVal = avgAttributes?.[key] ?? 5;
          const barColor = myVal >= 8 ? '#10B981' : myVal >= 6 ? '#E5A93C' : myVal >= 4 ? '#F97316' : '#EF4444';

          return (
            <div key={key} className="geo-slider-cell">
              <div className="geo-slider-header">
                <span className="geo-slider-title">{label}</span>
                <div className="geo-score-dual">
                  <span className="geo-my-val" style={{ color: barColor }}>{myVal.toFixed(1)}</span>
                  <span className="geo-avg-val">MÉDIA: {Number(avgVal).toFixed(1)}</span>
                </div>
              </div>

              <div className="geo-range-wrap">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={myVal}
                  onChange={e => handleSlider(key, e.target.value)}
                  style={{ accentColor: barColor }}
                  className="geo-range-input"
                />
              </div>
            </div>
          );
        })}

        <div className="geo-category-tag" style={{ marginTop: 16 }}>FATORES COMPLEMENTARES</div>
        {COMPLEMENTARY_ATTRS.map(({ key, label }) => {
          const myVal = draft[key];
          const avgVal = avgAttributes?.[key] ?? 5;
          const barColor = myVal >= 8 ? '#10B981' : myVal >= 6 ? '#E5A93C' : myVal >= 4 ? '#F97316' : '#EF4444';

          return (
            <div key={key} className="geo-slider-cell">
              <div className="geo-slider-header">
                <span className="geo-slider-title">{label}</span>
                <div className="geo-score-dual">
                  <span className="geo-my-val" style={{ color: barColor }}>{myVal.toFixed(1)}</span>
                  <span className="geo-avg-val">MÉDIA: {Number(avgVal).toFixed(1)}</span>
                </div>
              </div>

              <div className="geo-range-wrap">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={myVal}
                  onChange={e => handleSlider(key, e.target.value)}
                  style={{ accentColor: barColor }}
                  className="geo-range-input"
                />
              </div>
            </div>
          );
        })}
      </div>

      {dirty && (
        <div className="geo-mobile-save-bar">
          <button className="btn btn-gold w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'SALVANDO...' : 'CONFIRMAR E SALVAR AVALIAÇÃO'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Feed de Observações ───────────────────────────────────────
function ObservationsSection({ playerId, observations: initialObs, onUpdate }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [obs, setObs] = useState(initialObs || []);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef();

  useEffect(() => { setObs(initialObs || []); }, [initialObs]);

  const handleAdd = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.addObservation(playerId, text.trim());
      const updatedList = res.observations || (Array.isArray(res) ? res : []);
      setObs(updatedList);
      setText('');
      onUpdate?.(updatedList);
      toast('Observação registrada no relatório técnico', 'success');
    } catch (err) {
      toast(err.message || 'Erro ao registrar observação', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (obsId) => {
    try {
      const res = await api.deleteObservation(playerId, obsId);
      const updatedList = res.observations || (Array.isArray(res) ? res : []);
      setObs(updatedList);
      onUpdate?.(updatedList);
      toast('Registro removido', 'info');
    } catch (err) {
      toast(err.message || 'Erro ao remover observação', 'error');
    }
  };

  const formatRelativeTime = (dateStr) => {
    const date = new Date(dateStr);
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'Agora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
    return formatDate(dateStr);
  };

  return (
    <div className="geo-panel">
      <div className="geo-panel-header">
        <div>
          <div className="geo-eyebrow">RELATÓRIO DE CAMPO</div>
          <h3 className="geo-panel-title">OBSERVAÇÕES TÁTICAS & HISTÓRICO</h3>
          <p className="geo-panel-subtitle">
            {obs.length} registro{obs.length !== 1 ? 's' : ''} documentado{obs.length !== 1 ? 's' : ''} pela comissão e atletas
          </p>
        </div>
      </div>

      {/* Input de Nova Observação */}
      <div className="geo-obs-form">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Insira notas táticas, pontos de evolução, rotinas de treino..."
          className="geo-textarea"
        />
        <div className="geo-obs-form-footer">
          <span className="geo-hint">Pressione Publicar para salvar</span>
          <button
            className="btn btn-gold btn-sm"
            onClick={handleAdd}
            disabled={sending || !text.trim()}
          >
            <Send size={12} /> {sending ? 'REGISTRANDO...' : 'PUBLICAR REGISTRO'}
          </button>
        </div>
      </div>

      {/* Feed de Comentários */}
      {obs.length === 0 ? (
        <div className="geo-empty-panel">
          <MessageSquare size={28} className="geo-empty-icon" />
          <div className="geo-empty-title">NENHUMA OBSERVAÇÃO REGISTRADA</div>
          <div className="geo-empty-desc">Documente apontamentos táticos, histórico médico e correções técnicas para este atleta.</div>
        </div>
      ) : (
        <div className="geo-obs-stream">
          {obs.map(o => {
            const canDelete = user?.id === o.user_id || isAdmin;
            return (
              <div key={o.id} className={`geo-obs-card ${user?.id === o.user_id ? 'is-author' : ''}`}>
                <div className="geo-obs-top">
                  <div className="geo-obs-author-tag">
                    <span className="geo-author-name">{o.display_name}</span>
                    {o.is_admin === 1 && <span className="geo-admin-chip">COMISSÃO</span>}
                    <span className="geo-timestamp">· {formatRelativeTime(o.created_at)}</span>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="geo-obs-delete"
                      title="Excluir anotação"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>

                <p className="geo-obs-body-text">{o.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Página Principal ──────────────────────────────────────────
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
      toast('Atleta não encontrado', 'error');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (data) => {
    try {
      await api.updatePlayer(id, data);
      toast('Ficha técnica atualizada', 'success');
      setShowEdit(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja remover ${player.name} da equipe?`)) return;
    try {
      await api.deletePlayer(id);
      toast('Atleta removido da equipe', 'info');
      navigate('/');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleRatingUpdate = (res) => {
    setPlayer(p => ({
      ...p,
      attributes: res.avg_attributes,
      rating_count: res.rating_count,
      my_rating: res.my_rating
    }));
  };

  const handleObsUpdate = (observations) => {
    setPlayer(p => ({ ...p, observations }));
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;
  if (!player) return null;

  const proficiencies = getPlayerProficiencies(player);
  const avg = avgTechnical(player.attributes);
  const attrs = player.attributes || {};
  const statCardData = calculateStatAttributes(player);

  const evolutionData = player.attribute_history?.map(h => ({
    date: formatDate(h.recorded_at),
    Ataque: h.attack, Saque: h.serve, Recepção: h.reception,
    Bloqueio: h.block, Defesa: h.defense, Levantamento: h.setting,
  })) || [];

  // Grouped action distribution with counts
  const rawByAction = player.game_stats?.by_action || [];
  const actionCounts = {};
  rawByAction.forEach(a => {
    actionCounts[a.action] = (actionCounts[a.action] || 0) + (Number(a.count) || Number(a.value) || 0);
  });

  const pieData = Object.entries(actionCounts)
    .filter(([_, count]) => count > 0)
    .map(([action, count]) => ({
      name: ACTION_LABELS[action] || action,
      rawKey: action,
      value: count,
      type: ACTION_TYPES[action] || 'neutral'
    }));

  const totalActionsCount = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="page-container">
      {/* Top Breadcrumb & Actions */}
      <div className="geo-top-action-bar">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> VOLTAR AO ELENCO
        </button>
        <div className="geo-action-cluster">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>
            <Edit2 size={13} /> EDITAR DADOS BÁSICOS
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete} title="Excluir Atleta">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Atleta Hero Geometric Panel ── */}
      <div className="geo-hero-panel">
        <div className="geo-hero-header-bar">
          <div className="geo-jersey-hero-badge">
            CAMISA {player.number ? `#${player.number}` : 'S/N'}
          </div>
          <div className="geo-pos-hero-tags">
            <span className={positionBadgeClass(player.primary_position)}>{player.primary_position}</span>
            {player.secondary_positions?.map(sp => (
              <span key={sp} className="geo-sec-badge">{sp}</span>
            ))}
          </div>
        </div>

        <div className="geo-hero-content-row">
          <div className="geo-avatar-hero-frame">
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="geo-avatar-hero-img" />
            ) : (
              <div className="geo-avatar-hero-fallback">{getInitials(player.name)}</div>
            )}
          </div>

          <div className="geo-hero-text-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="geo-hero-name">{player.name}</h1>
              {player.nickname && <span className="geo-hero-nickname">"{player.nickname}"</span>}
            </div>

            {/* Quick Metrics Strip */}
            <div className="geo-metrics-strip">
              <div className="geo-strip-item" style={{ borderColor: statCardData.tierColor }}>
                <span className="geo-strip-label" style={{ color: statCardData.tierColor }}>RATING OVR (REAL)</span>
                <span className="geo-strip-val highlight" style={{ color: statCardData.tierColor }}>
                  {statCardData.ovr}
                </span>
              </div>

              <div className="geo-strip-item">
                <span className="geo-strip-label">MÉDIA SUBJETIVA</span>
                <span className="geo-strip-val highlight" style={{
                  color: parseFloat(avg) >= 7.5 ? '#10B981' : parseFloat(avg) >= 5.5 ? '#E5A93C' : '#EF4444'
                }}>{avg}</span>
              </div>

              <div className="geo-strip-item">
                <span className="geo-strip-label">ALTURA</span>
                <span className="geo-strip-val">{player.height ? `${player.height} CM` : '—'}</span>
              </div>

              <div className="geo-strip-item">
                <span className="geo-strip-label">PONTOS CONVERTIDOS</span>
                <span className="geo-strip-val text-emerald-400">+{player.game_stats?.points_made || 0}</span>
              </div>

              <div className="geo-strip-item">
                <span className="geo-strip-label">AÇÕES EM PARTIDAS</span>
                <span className="geo-strip-val">{player.game_stats?.total_actions || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Proficiências por Posição em Destaque ── */}
      <div className="geo-panel" style={{ marginBottom: 24 }}>
        <div className="geo-panel-header">
          <div>
            <div className="geo-eyebrow">AVALIAÇÃO POR POSIÇÃO</div>
            <h3 className="geo-panel-title">ÍNDICE DE PROFICIÊNCIA TÁTICA</h3>
            <p className="geo-panel-subtitle">Algoritmo ponderado por fundamentos específicos (Escala 0.0 a 5.0)</p>
          </div>
        </div>

        <PositionProficiencyBadge proficiencies={proficiencies} variant="detailed" />
      </div>

      {/* ── Segmented Geometric Tabs ── */}
      <div className="geo-tabs-bar">
        {[
          { key: 'overview',   label: 'VISÃO GERAL',            icon: <Award size={14} /> },
          { key: 'statcard',   label: 'FICHA DE ATRIBUTOS (REAL)', icon: <Lock size={14} /> },
          { key: 'gamestats',  label: 'SCOUT & ESTATÍSTICAS',    icon: <BarChart2 size={14} /> },
          { key: 'rating',     label: 'AVALIAR ATLETA',         icon: <Star size={14} /> },
          { key: 'evolution',  label: 'EVOLUÇÃO',               icon: <TrendingUp size={14} /> },
          { key: 'notes',      label: `OBSERVAÇÕES (${player.observations?.length || 0})`, icon: <MessageSquare size={14} /> },
        ].map(t => (
          <button
            key={t.key}
            className={`geo-tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── 1. Visão Geral ── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ficha Estatística Imutável em Destaque */}
          <PlayerStatCard player={player} />

          <div className="geo-overview-grid">
            <div className="geo-panel">
              <div className="geo-eyebrow">POLÍGONO TÉCNICO SUBJETIVO</div>
              <h3 className="geo-panel-title">RADAR DE FUNDAMENTOS</h3>
              <div className="geo-radar-box">
                <PlayerRadar attributes={attrs} />
              </div>
            </div>

            <div className="geo-panel">
              <div className="geo-eyebrow">SCOUTING TÉCNICO</div>
              <h3 className="geo-panel-title">BREAKDOWN DE ATRIBUTOS (0-10)</h3>
              <div className="geo-attribute-bars">
                {[...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS].map(({ key, label }) => {
                  const val = typeof attrs[key] === 'number' ? attrs[key] : (attrs[key] ? parseFloat(attrs[key]) : 5);
                  const barColor = val >= 8 ? '#10B981' : val >= 6 ? '#E5A93C' : val >= 4 ? '#F97316' : '#EF4444';
                  return (
                    <div key={key} className="geo-attr-row">
                      <div className="geo-attr-info">
                        <span className="geo-attr-name">{label}</span>
                        <span className="geo-attr-val" style={{ color: barColor }}>{val.toFixed(1)}</span>
                      </div>
                      <div className="geo-segmented-track-sm">
                        <div
                          className="geo-segmented-fill-sm"
                          style={{ width: `${val * 10}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Ficha de Atributos Real (Imutável) ── */}
      {tab === 'statcard' && (
        <PlayerStatCard player={player} />
      )}

      {/* ── 3. Estatísticas & Scout de Jogo (CORREÇÃO COMPLETA DO ERRO) ── */}
      {tab === 'gamestats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Ficha Imutável resumida */}
          <PlayerStatCard player={player} />

          {/* Painel de Distribuição de Ações de Jogo */}
          <div className="geo-panel">
            <div className="geo-panel-header">
              <div>
                <div className="geo-eyebrow">SCOUTING EM TEMPO REAL</div>
                <h3 className="geo-panel-title">DISTRIBUIÇÃO DE AÇÕES EM JOGO</h3>
                <p className="geo-panel-subtitle">Métricas extraídas diretamente das súmulas e scouts de partidas</p>
              </div>
            </div>

            {pieData.length === 0 ? (
              <div className="geo-empty-panel">
                <BarChart2 size={32} className="geo-empty-icon" />
                <div className="geo-empty-title">SEM DADOS DE JOGOS REGISTRADOS</div>
                <div className="geo-empty-desc">
                  Inicie partidas pelo módulo de jogos para registrar fundamentos (ataques convertidos, bloqueios, aces, recepções) deste atleta.
                </div>
              </div>
            ) : (
              <div className="geo-stats-grid">
                {/* Visualizador de Gráfico Circular / Donut */}
                <div className="geo-chart-box">
                  <div style={{ width: '100%', height: 260, position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell
                              key={`cell-${i}`}
                              fill={entry.type === 'point' ? '#10B981' : entry.type === 'error' ? '#EF4444' : PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: '#0F141F',
                            border: '1px solid #2E3B54',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#FFFFFF',
                            fontFamily: 'Space Grotesk, sans-serif'
                          }}
                          formatter={(value, name) => [`${value} ação(ões) (${((value / totalActionsCount) * 100).toFixed(1)}%)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="geo-chart-center-metric">
                      <span className="center-num">{totalActionsCount}</span>
                      <span className="center-label">AÇÕES TOTAIS</span>
                    </div>
                  </div>
                </div>

                {/* Coluna de Legenda e Detalhamento de Fundamentos */}
                <div className="geo-legend-column">
                  <div className="geo-legend-header">
                    <span>FUNDAMENTO / EVENTO</span>
                    <span>QTD & %</span>
                  </div>

                  <div className="geo-legend-scroll-list">
                    {pieData.map((item, i) => {
                      const color = item.type === 'point' ? '#10B981' : item.type === 'error' ? '#EF4444' : PIE_COLORS[i % PIE_COLORS.length];
                      const pct = totalActionsCount > 0 ? ((item.value / totalActionsCount) * 100).toFixed(1) : 0;
                      return (
                        <div key={item.name} className="geo-legend-item">
                          <div className="geo-legend-left">
                            <div className="geo-legend-swatch" style={{ backgroundColor: color }} />
                            <span className="geo-legend-title">{item.name}</span>
                          </div>

                          <div className="geo-legend-right">
                            <span className="geo-legend-count" style={{ color: item.type === 'point' ? '#10B981' : item.type === 'error' ? '#EF4444' : '#FFFFFF' }}>
                              {item.value}
                            </span>
                            <span className="geo-legend-pct">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Avaliar Atleta (Subjetivo) ── */}
      {tab === 'rating' && (
        <UserRatingSection
          playerId={id}
          avgAttributes={attrs}
          myRating={player.my_rating}
          ratingCount={player.rating_count || 0}
          onUpdate={handleRatingUpdate}
        />
      )}

      {/* ── 5. Evolução Temporal ── */}
      {tab === 'evolution' && (
        <div className="geo-panel">
          <div className="geo-panel-header">
            <div>
              <div className="geo-eyebrow">HISTÓRICO TEMPORAL</div>
              <h3 className="geo-panel-title">PROGRESSÃO DE PERFORMANCE</h3>
            </div>
          </div>
          {evolutionData.length < 2 ? (
            <div className="geo-empty-panel">
              <Activity size={28} className="geo-empty-icon" />
              <div className="geo-empty-title">DADOS INSUFICIENTES PARA CURVA HISTÓRICA</div>
              <div className="geo-empty-desc">Conforme novos scouts forem registrados, a evolução técnica temporal deste atleta será projetada aqui.</div>
            </div>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#718096', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111620', border: '1px solid #2D3748', borderRadius: 4, color: '#F7FAFC', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#A0AEC0', paddingTop: 10 }} />
                  {['Ataque', 'Saque', 'Recepção', 'Bloqueio', 'Defesa', 'Levantamento'].map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={PIE_COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Observações ── */}
      {tab === 'notes' && (
        <ObservationsSection
          playerId={id}
          observations={player.observations}
          onUpdate={handleObsUpdate}
        />
      )}

      {showEdit && (
        <Modal title="EDITAR DADOS DO ATLETA" onClose={() => setShowEdit(false)} size="lg">
          <PlayerForm player={{ ...player, attributes: attrs }} onSave={handleUpdate} onCancel={() => setShowEdit(false)} />
        </Modal>
      )}
    </div>
  );
}

