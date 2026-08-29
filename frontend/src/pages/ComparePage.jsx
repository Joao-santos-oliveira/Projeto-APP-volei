import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import {
  TECHNICAL_ATTRS, positionBadgeClass, getInitials,
  getPlayerProficiencies, avgTechnical
} from '../utils/constants';
import PositionProficiencyBadge from '../components/players/PositionProficiencyBadge';
import { GitCompare, Shield, ArrowRightLeft } from 'lucide-react';

export default function ComparePage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.getPlayers()
      .then(setPlayers)
      .catch(() => toast('Erro ao carregar elenco', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const pa = players.find(p => p.id === parseInt(playerA));
  const pb = players.find(p => p.id === parseInt(playerB));

  const profA = pa ? getPlayerProficiencies(pa) : [];
  const profB = pb ? getPlayerProficiencies(pb) : [];

  const radarData = pa && pb
    ? TECHNICAL_ATTRS.map(({ key, label }) => ({
        subject: label,
        [pa.name.split(' ')[0]]: pa.attributes?.[key] ?? 5,
        [pb.name.split(' ')[0]]: pb.attributes?.[key] ?? 5,
      }))
    : [];

  const PlayerHeader = ({ player, color, profs }) => {
    const avg = avgTechnical(player.attributes);
    return (
      <div style={{ textAlign: 'center', padding: '12px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-sm)', margin: '0 auto 10px',
          background: 'var(--bg-secondary)', border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900, overflow: 'hidden', color
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
          <span style={{ fontFamily: 'Space Grotesk, monospace', fontSize: 11, fontWeight: 900, color: 'var(--gold)' }}>
            MÉD: {avg}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      {/* ── Page Header ── */}
      <div className="geo-page-header">
        <div className="geo-header-title-block">
          <div className="geo-eyebrow">ANÁLISE COMPARATIVA DE PLANTEL</div>
          <h1 className="geo-main-title">COMPARAÇÃO DE ATLETAS</h1>
          <p className="geo-sub-title">CONFRONTE FUNDAMENTOS TÉCNICOS E PROFICIÊNCIAS TÁTICAS LADO A LADO</p>
        </div>
      </div>

      {/* ── Seletor de Atletas ── */}
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
        <div className="geo-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <ArrowRightLeft size={36} className="geo-empty-icon" style={{ color: 'var(--gold)', margin: '0 auto 12px' }} />
          <div className="geo-empty-title">SELECIONE DOIS ATLETAS PARA CONFRONTO</div>
          <div className="geo-empty-desc">
            Escolha os atletas nos menus acima para gerar o radar sobreposto e os índices de proficiência tática detalhados.
          </div>
        </div>
      ) : (
        <>
          {/* ── Head to Head Summary Card ── */}
          <div className="geo-panel" style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
              <PlayerHeader player={pa} color="var(--team-blue)" profs={profA} />
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: 16, fontWeight: 900, color: 'var(--gold)', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)' }}>
                VS
              </div>
              <PlayerHeader player={pb} color="var(--team-red)" profs={profB} />
            </div>
          </div>

          {/* ── Radar Técnico Sobreposto ── */}
          <div className="geo-panel" style={{ marginBottom: 20 }}>
            <div className="geo-panel-header">
              <div>
                <div className="geo-eyebrow">SOBREPOSIÇÃO POLIGONAL</div>
                <h3 className="geo-panel-title">RADAR TÉCNICO COMPARATIVO</h3>
              </div>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
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

          {/* ── Comparativo de Proficiências por Posição ── */}
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
    </div>
  );
}
