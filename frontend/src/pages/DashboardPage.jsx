import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { TECHNICAL_ATTRS, COMPLEMENTARY_ATTRS, avgTechnical, getInitials, positionBadgeClass } from '../utils/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#f5c518','#3b82f6','#22c55e','#f97316','#a855f7','#ef4444'];

export default function DashboardPage() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestedTeams, setSuggestedTeams] = useState(null);
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.getPlayers(), api.getMatches()])
      .then(([p, m]) => { setPlayers(p); setMatches(m); })
      .catch(() => toast('Erro ao carregar dados', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Balanceamento de times
  const suggestTeams = () => {
    if (players.length < 2) { toast('Precisa de ao menos 2 jogadores', 'info'); return; }

    // Calcular score total de cada jogador
    const scored = players.map(p => ({
      ...p,
      score: [...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS].reduce((sum, { key }) => sum + (p.attributes?.[key] ?? 5), 0)
    })).sort((a, b) => b.score - a.score);

    // Divisão snake draft: 1→A, 2→B, 3→B, 4→A, 5→A, 6→B...
    const teamA = [], teamB = [];
    scored.forEach((p, i) => {
      const round = Math.floor(i / 2);
      const isEven = round % 2 === 0;
      const posInRound = i % 2;
      if (isEven ? posInRound === 0 : posInRound === 1) teamA.push(p);
      else teamB.push(p);
    });

    setSuggestedTeams({ teamA, teamB });
  };

  const teamAvgData = players.map(p => ({
    name: p.nickname || p.name.split(' ')[0],
    Técnico: parseFloat(avgTechnical(p.attributes)),
  }));

  const matchesFinished = matches.filter(m => m.status === 'finished');

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do time e estatísticas</p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="stat-grid" style={{ marginBottom:32 }}>
        <div className="stat-card">
          <div className="stat-card-value">{players.length}</div>
          <div className="stat-card-label">Jogadores</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{matchesFinished.length}</div>
          <div className="stat-card-label">Partidas</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">
            {players.length > 0
              ? (players.reduce((s, p) => s + parseFloat(avgTechnical(p.attributes)), 0) / players.length).toFixed(1)
              : '—'}
          </div>
          <div className="stat-card-label">Média Técnica</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{matches.filter(m => m.status === 'live').length}</div>
          <div className="stat-card-label">Ao Vivo</div>
        </div>
      </div>

      {/* Gráfico de desempenho técnico médio */}
      <div className="card" style={{ marginBottom:24 }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)', marginBottom:20 }}>
          Média Técnica por Jogador
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={teamAvgData} margin={{ top:0, right:10, bottom:0, left:0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill:'#8b9ab8', fontSize:12 }} />
            <YAxis domain={[0,10]} tick={{ fill:'#8b9ab8', fontSize:11 }} />
            <Tooltip contentStyle={{ background:'#141820', border:'1px solid #2a3347', borderRadius:8, color:'#f0f4ff', fontSize:12 }} />
            <Bar dataKey="Técnico" radius={[6,6,0,0]}>
              {teamAvgData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sugestão de times */}
      <div className="card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-secondary)' }}>
            Sugestão de Times Balanceados
          </h3>
          <button className="btn btn-primary btn-sm" onClick={suggestTeams}>
            ⚡ Sugerir Times
          </button>
        </div>

        {suggestedTeams ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
            {[
              { label:'Time A', players: suggestedTeams.teamA, color:'#3b82f6' },
              { label:'Time B', players: suggestedTeams.teamB, color:'#ef4444' },
            ].map(({ label, players: team, color }) => {
              const avg = team.length > 0
                ? (team.reduce((s, p) => s + parseFloat(avgTechnical(p.attributes)), 0) / team.length).toFixed(1)
                : '—';
              return (
                <div key={label} style={{ background:'var(--bg-elevated)', borderRadius:12, padding:16, border:`1px solid ${color}33` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                    <span style={{ fontWeight:800, color, fontSize:16 }}>{label}</span>
                    <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Média: <strong style={{ color }}>{avg}</strong></span>
                  </div>
                  {team.map(p => (
                    <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <div style={{
                        width:32, height:32, borderRadius:'50%', background:'var(--bg-input)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:12, fontWeight:700, flexShrink:0, overflow:'hidden'
                      }}>
                        {p.photo ? <img src={p.photo} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                          : getInitials(p.name)}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {p.name}
                        </div>
                        <span className={positionBadgeClass(p.primary_position)} style={{ fontSize:9 }}>{p.primary_position}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text-accent)' }}>{avgTechnical(p.attributes)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ padding:32 }}>
            <p>Clique em "Sugerir Times" para ver uma divisão equilibrada baseada nos atributos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
