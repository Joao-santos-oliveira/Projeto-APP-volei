import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { TECHNICAL_ATTRS, positionBadgeClass, getInitials } from '../utils/constants';

export default function ComparePage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const toast = useToast();

  useEffect(() => {
    api.getPlayers()
      .then(setPlayers)
      .catch(() => toast('Erro ao carregar jogadores', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const pa = players.find(p => p.id === parseInt(playerA));
  const pb = players.find(p => p.id === parseInt(playerB));

  const radarData = pa && pb
    ? TECHNICAL_ATTRS.map(({ key, label }) => ({
        subject: label,
        [pa.name.split(' ')[0]]: pa.attributes?.[key] ?? 5,
        [pb.name.split(' ')[0]]: pb.attributes?.[key] ?? 5,
      }))
    : [];

  const PlayerHeader = ({ player, color }) => (
    <div style={{ textAlign:'center', padding:20 }}>
      <div style={{
        width:64, height:64, borderRadius:'50%', margin:'0 auto 12px',
        background:'var(--bg-elevated)', border:`3px solid ${color}`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:22, fontWeight:700, overflow:'hidden'
      }}>
        {player.photo ? <img src={player.photo} alt={player.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : getInitials(player.name)}
      </div>
      <div style={{ fontWeight:800, fontSize:17, marginBottom:4 }}>{player.name}</div>
      <span className={positionBadgeClass(player.primary_position)}>{player.primary_position}</span>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Comparar Jogadores</h1>
          <p className="page-subtitle">Analise dois jogadores lado a lado</p>
        </div>
      </div>

      {/* Seleção */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:32 }}>
        <div className="form-group">
          <label className="form-label">Jogador A</label>
          <select className="form-select" value={playerA} onChange={e => setPlayerA(e.target.value)}>
            <option value="">Selecione...</option>
            {players.filter(p => p.id !== parseInt(playerB)).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Jogador B</label>
          <select className="form-select" value={playerB} onChange={e => setPlayerB(e.target.value)}>
            <option value="">Selecione...</option>
            {players.filter(p => p.id !== parseInt(playerA)).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!pa || !pb ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚖️</div>
          <h3>Selecione dois jogadores</h3>
          <p>Escolha os jogadores acima para ver a comparação.</p>
        </div>
      ) : (
        <>
          {/* Cabeçalho comparação */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 1fr', alignItems:'center', marginBottom:24 }}>
            <PlayerHeader player={pa} color="#3b82f6" />
            <div style={{ textAlign:'center', fontSize:20, fontWeight:800, color:'var(--text-muted)' }}>VS</div>
            <PlayerHeader player={pb} color="#ef4444" />
          </div>

          {/* Radar sobreposto */}
          <div className="card" style={{ marginBottom:24 }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)', marginBottom:16 }}>Radar Comparativo</h3>
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={radarData} margin={{ top:10, right:40, bottom:10, left:40 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill:'#8b9ab8', fontSize:12 }} />
                <PolarRadiusAxis angle={90} domain={[0,10]} tick={{ fill:'#4a5a75', fontSize:10 }} tickCount={6} />
                <Radar name={pa.name.split(' ')[0]} dataKey={pa.name.split(' ')[0]} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                <Radar name={pb.name.split(' ')[0]} dataKey={pb.name.split(' ')[0]} stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                <Tooltip contentStyle={{ background:'#141820', border:'1px solid #2a3347', borderRadius:8, color:'#f0f4ff', fontSize:12 }} />
                <Legend wrapperStyle={{ fontSize:13, color:'#8b9ab8' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela de atributos */}
          <div className="card">
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)', marginBottom:16 }}>Comparação de Atributos</h3>
            {TECHNICAL_ATTRS.map(({ key, label }) => {
              const va = pa.attributes?.[key] ?? 5;
              const vb = pb.attributes?.[key] ?? 5;
              const best = va > vb ? 'a' : vb > va ? 'b' : 'tie';
              return (
                <div key={key} style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center', marginBottom:12 }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color: best === 'a' ? '#3b82f6' : 'var(--text-primary)' }}>{va}</span>
                    <div style={{ height:6, borderRadius:3, width:`${va*10}%`, background: best === 'a' ? '#3b82f6' : 'var(--bg-elevated)', maxWidth:120 }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', textAlign:'center', minWidth:80 }}>{label}</span>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4 }}>
                    <span style={{ fontSize:15, fontWeight:800, color: best === 'b' ? '#ef4444' : 'var(--text-primary)' }}>{vb}</span>
                    <div style={{ height:6, borderRadius:3, width:`${vb*10}%`, background: best === 'b' ? '#ef4444' : 'var(--bg-elevated)', maxWidth:120 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
