/**
 * matchMvp.js
 * Utilitários para processamento do MVP Estatístico (Scout),
 * destaques por fundamento e regras de Votação Popular (2 horas).
 */

const VOTING_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas em milissegundos

/**
 * Calcula o scout individual completo de cada atleta a partir dos pontos da partida.
 */
export function calculateMatchPlayerStats(match) {
  if (!match) return [];

  const points = match.points || [];
  const allPlayers = [
    ...(match.home_players || []).map(p => ({ ...p, team: 'home' })),
    ...(match.away_players || []).map(p => ({ ...p, team: 'away' }))
  ];

  const map = {};

  allPlayers.forEach(p => {
    map[p.id] = {
      id: p.id,
      name: p.name,
      nickname: p.nickname || p.name.split(' ')[0],
      number: p.number,
      position: p.primary_position || 'Ponteiro',
      photo: p.photo || null,
      team: p.team || 'home',
      teamName: p.team === 'home' ? match.home_team : match.away_team,
      attackPoints: 0,
      attackErrors: 0,
      serveAces: 0,
      serveErrors: 0,
      blockPoints: 0,
      blockErrors: 0,
      receptionErrors: 0,
      settingErrors: 0,
      faults: 0,
      totalPoints: 0,
      totalErrors: 0,
      balance: 0
    };
  });

  points.forEach(pt => {
    if (pt.player_id) {
      if (!map[pt.player_id]) {
        map[pt.player_id] = {
          id: pt.player_id,
          name: pt.player_name || `Atleta #${pt.player_id}`,
          nickname: pt.player_nickname || pt.player_name || `Atleta`,
          number: '',
          position: '—',
          photo: null,
          team: pt.team,
          teamName: pt.team === 'home' ? match.home_team : match.away_team,
          attackPoints: 0,
          attackErrors: 0,
          serveAces: 0,
          serveErrors: 0,
          blockPoints: 0,
          blockErrors: 0,
          receptionErrors: 0,
          settingErrors: 0,
          faults: 0,
          totalPoints: 0,
          totalErrors: 0,
          balance: 0
        };
      }
      const p = map[pt.player_id];
      switch (pt.action) {
        case 'attack_point': p.attackPoints++; p.totalPoints++; break;
        case 'attack_error': p.attackErrors++; p.totalErrors++; break;
        case 'serve_ace':    p.serveAces++; p.totalPoints++; break;
        case 'serve_error':  p.serveErrors++; p.totalErrors++; break;
        case 'block_point':  p.blockPoints++; p.totalPoints++; break;
        case 'block_error':  p.blockErrors++; p.totalErrors++; break;
        case 'reception_error': p.receptionErrors++; p.totalErrors++; break;
        case 'setting_error':   p.settingErrors++; p.totalErrors++; break;
        case 'fault':        p.faults++; p.totalErrors++; break;
        default: break;
      }
    }
  });

  const list = Object.values(map).map(p => ({
    ...p,
    balance: p.totalPoints - p.totalErrors
  }));

  // Ordena por maior pontuação líquida (saldo) e desempate por total de pontos
  list.sort((a, b) => {
    if (b.balance !== a.balance) return b.balance - a.balance;
    return b.totalPoints - a.totalPoints;
  });

  return list;
}

/**
 * Identifica o MVP estatístico e os destaques por fundamento
 */
export function getMatchHighlights(match) {
  const playerStats = calculateMatchPlayerStats(match);
  if (playerStats.length === 0) {
    return {
      playerStats: [],
      mvp: null,
      topScorer: null,
      bestBlocker: null,
      bestServer: null
    };
  }

  // MVP: maior saldo positivo (apenas atletas com saldo >= 0 ou com maior pontuação)
  const mvp = playerStats[0]?.totalPoints > 0 || playerStats[0]?.balance > 0 ? playerStats[0] : (playerStats[0] || null);

  // Maior Pontuador
  const sortedByPoints = [...playerStats].sort((a, b) => b.totalPoints - a.totalPoints);
  const topScorer = sortedByPoints[0]?.totalPoints > 0 ? sortedByPoints[0] : null;

  // Melhor Bloqueador
  const sortedByBlocks = [...playerStats].sort((a, b) => b.blockPoints - a.blockPoints);
  const bestBlocker = sortedByBlocks[0]?.blockPoints > 0 ? sortedByBlocks[0] : null;

  // Melhor Sacador (Aces)
  const sortedByAces = [...playerStats].sort((a, b) => b.serveAces - a.serveAces);
  const bestServer = sortedByAces[0]?.serveAces > 0 ? sortedByAces[0] : null;

  return {
    playerStats,
    mvp,
    topScorer,
    bestBlocker,
    bestServer
  };
}

/**
 * Calcula o tempo restante da janela de 2 horas de votação popular
 */
export function getVotingWindowStatus(match) {
  if (!match || match.status !== 'finished') {
    return {
      isVotingActive: false,
      isFinished: false,
      timeRemainingMs: 0,
      formattedTime: 'Partida em andamento',
      hasExpired: false
    };
  }

  // Base de tempo: finished_at ou created_at
  const finishTimeStr = match.finished_at || match.created_at;
  const finishTimestamp = finishTimeStr ? new Date(finishTimeStr.replace(' ', 'T')).getTime() : Date.now();
  const deadline = finishTimestamp + VOTING_DURATION_MS;
  const now = Date.now();
  const remaining = Math.max(0, deadline - now);

  const hasExpired = remaining <= 0;
  const isVotingActive = !hasExpired;

  // Formata HH:MM:SS
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = hasExpired
    ? 'Votação encerrada'
    : `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;

  return {
    isVotingActive,
    isFinished: true,
    timeRemainingMs: remaining,
    formattedTime,
    hasExpired,
    deadline
  };
}

/**
 * Processa a contagem de votos e identifica o Craque da Galera
 */
export function processPopularVotes(votes = [], playerStats = []) {
  const totalVotes = votes.length;
  const voteCountByPlayer = {};

  votes.forEach(v => {
    const pid = Number(v.player_id);
    voteCountByPlayer[pid] = (voteCountByPlayer[pid] || 0) + 1;
  });

  const rankedPlayers = playerStats.map(p => {
    const count = voteCountByPlayer[p.id] || 0;
    const percentage = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
    return {
      ...p,
      votesCount: count,
      votePercentage: parseFloat(percentage)
    };
  });

  rankedPlayers.sort((a, b) => {
    if (b.votesCount !== a.votesCount) return b.votesCount - a.votesCount;
    return b.balance - a.balance;
  });

  const popularMvp = totalVotes > 0 && rankedPlayers[0]?.votesCount > 0 ? rankedPlayers[0] : null;

  return {
    totalVotes,
    rankedPlayers,
    popularMvp
  };
}
