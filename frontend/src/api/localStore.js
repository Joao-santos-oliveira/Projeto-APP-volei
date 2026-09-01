/**
 * localStore.js - Persistência Client-Side (Offline / GitHub Pages / Vercel Estático)
 * Permite que a aplicação funcione 100% de forma independente no navegador usando localStorage.
 */

const STORAGE_KEYS = {
  PLAYERS:      'volei_app_players',
  ATTR_HISTORY: 'volei_app_attr_history',
  MATCHES:      'volei_app_matches',
  POINTS:       'volei_app_points',
  TEAMS:        'volei_app_teams',
  RATINGS:      'volei_app_ratings',
  OBSERVATIONS: 'volei_app_observations',
  VOTES:        'volei_app_votes'
};

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Base limpa inicial (sem atletas ou times pré-carregados)
const INITIAL_PLAYERS = [];
const INITIAL_TEAMS   = [];

function getStored(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

// Inicializa armazenamento limpo no localStorage
function ensureInit() {
  if (localStorage.getItem(STORAGE_KEYS.PLAYERS) === null) {
    setStored(STORAGE_KEYS.PLAYERS, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.TEAMS) === null) {
    setStored(STORAGE_KEYS.TEAMS, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.MATCHES) === null) {
    setStored(STORAGE_KEYS.MATCHES, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.POINTS) === null) {
    setStored(STORAGE_KEYS.POINTS, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.RATINGS) === null) {
    setStored(STORAGE_KEYS.RATINGS, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.OBSERVATIONS) === null) {
    setStored(STORAGE_KEYS.OBSERVATIONS, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.ATTR_HISTORY) === null) {
    setStored(STORAGE_KEYS.ATTR_HISTORY, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.VOTES) === null) {
    setStored(STORAGE_KEYS.VOTES, []);
  }
}

ensureInit();

const KEYS = ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'];

// Helper: calcula estatísticas de jogo e scout de equipe do jogador em modo local
function computeLocalPlayerGameStats(playerId, allPoints = [], matches = []) {
  const numId = parseInt(playerId);
  const playerPoints = allPoints.filter(pt => pt.player_id === numId);

  const byActionMap = {};
  playerPoints.forEach(pt => {
    const key = `${pt.action}_${pt.team}`;
    if (!byActionMap[key]) {
      byActionMap[key] = { action: pt.action, team: pt.team, count: 0 };
    }
    byActionMap[key].count++;
  });

  const pointsMade = playerPoints.filter(pt =>
    ['attack_point', 'serve_ace', 'block_point', 'opponent_error'].includes(pt.action)
  ).length;

  const errors = playerPoints.filter(pt => pt.action && pt.action.endsWith('_error')).length;

  // Contexto de time nas partidas em que o atleta esteve escalado
  const playerMatches = matches.filter(m =>
    (m.home_player_ids || []).includes(numId) || (m.away_player_ids || []).includes(numId)
  );
  const matchesPlayed = playerMatches.length;

  let teamAttackPoints = 0;
  let teamAttackErrors = 0;
  let teamPointsTotal = 0;

  playerMatches.forEach(m => {
    const team = (m.home_player_ids || []).includes(numId) ? 'home' : 'away';
    const mPoints = allPoints.filter(pt => pt.match_id === m.id);
    mPoints.forEach(pt => {
      if (pt.team === team) {
        teamPointsTotal++;
        if (pt.action === 'attack_point') teamAttackPoints++;
        if (pt.action === 'attack_error') teamAttackErrors++;
      }
    });
  });

  return {
    total_actions: playerPoints.length,
    points_made: pointsMade,
    errors: errors,
    by_action: Object.values(byActionMap),
    matches_played: matchesPlayed,
    team_attack_points: teamAttackPoints,
    team_attack_errors: teamAttackErrors,
    team_points_total: teamPointsTotal
  };
}

export const localStore = {
  // ── JOGADORES ──────────────────────────────
  async getPlayers() {
    ensureInit();
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const ratings = getStored(STORAGE_KEYS.RATINGS, []);
    const allPoints = getStored(STORAGE_KEYS.POINTS, []);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const user = this._getCurrentUser();

    return players.map(p => {
      const pRatings = ratings.filter(r => r.player_id === p.id);
      let avgAttrs = {};
      if (pRatings.length > 0) {
        avgAttrs = Object.fromEntries(KEYS.map(k => [
          k, parseFloat((pRatings.reduce((s, r) => s + (r[k] ?? 5), 0) / pRatings.length).toFixed(2))
        ]));
      } else {
        avgAttrs = p.attributes || Object.fromEntries(KEYS.map(k => [k, 5]));
      }

      const myRating = user ? pRatings.find(r => r.user_id === user.id) || null : null;
      const gameStats = computeLocalPlayerGameStats(p.id, allPoints, matches);

      return {
        ...p,
        secondary_positions: p.secondary_positions || [],
        attributes: avgAttrs,
        rating_count: pRatings.length,
        my_rating: myRating,
        game_stats: gameStats
      };
    });
  },

  async getPlayer(id) {
    ensureInit();
    const numId = parseInt(id);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const p = players.find(x => x.id === numId);
    if (!p) throw new Error('Jogador não encontrado');

    const ratings = getStored(STORAGE_KEYS.RATINGS, []);
    const pRatings = ratings.filter(r => r.player_id === numId);
    const user = this._getCurrentUser();
    const users = getStored('volei_users', []);
    const allPoints = getStored(STORAGE_KEYS.POINTS, []);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);

    let avgAttrs = {};
    if (pRatings.length > 0) {
      avgAttrs = Object.fromEntries(KEYS.map(k => [
        k, parseFloat((pRatings.reduce((s, r) => s + (r[k] ?? 5), 0) / pRatings.length).toFixed(2))
      ]));
    } else {
      avgAttrs = p.attributes || Object.fromEntries(KEYS.map(k => [k, 5]));
    }

    const myRating = user ? pRatings.find(r => r.user_id === user.id) || null : null;

    const allRatings = pRatings.map(r => {
      const u = users.find(x => x.id === r.user_id) || {};
      return {
        ...r,
        display_name: u.display_name || (r.user_id === 1 ? 'Admin' : 'Usuário'),
        avatar_color: u.avatar_color || '#f5c518'
      };
    });

    const observations = getStored(STORAGE_KEYS.OBSERVATIONS, [])
      .filter(o => o.player_id === numId)
      .slice().reverse();

    const history = getStored(STORAGE_KEYS.ATTR_HISTORY, []).filter(h => h.player_id === numId);
    const gameStats = computeLocalPlayerGameStats(numId, allPoints, matches);

    return {
      ...p,
      secondary_positions: p.secondary_positions || [],
      attributes: avgAttrs,
      rating_count: pRatings.length,
      my_rating: myRating,
      all_ratings: allRatings,
      observations: observations,
      attribute_history: history,
      game_stats: gameStats
    };
  },

  async createPlayer(data) {
    ensureInit();
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const history = getStored(STORAGE_KEYS.ATTR_HISTORY, []);

    const newId = players.length > 0 ? Math.max(...players.map(p => p.id)) + 1 : 1;
    const defaultAttrs = {
      attack: 5, serve: 5, reception: 5, block: 5, defense: 5,
      setting: 5, communication: 5, consistency: 5, versatility: 5,
      ...(data.attributes || {})
    };

    const newPlayer = {
      id: newId,
      name: data.name,
      nickname: data.nickname || null,
      number: data.number || null,
      photo: data.photo || null,
      height: data.height || null,
      primary_position: data.primary_position,
      secondary_positions: data.secondary_positions || [],
      notes: data.notes || '',
      created_at: NOW(),
      updated_at: NOW(),
      attributes: defaultAttrs
    };

    players.push(newPlayer);
    setStored(STORAGE_KEYS.PLAYERS, players);

    history.push({
      id: history.length + 1,
      player_id: newId,
      ...defaultAttrs,
      recorded_at: NOW()
    });
    setStored(STORAGE_KEYS.ATTR_HISTORY, history);

    return newPlayer;
  },

  async updatePlayer(id, data) {
    ensureInit();
    const numId = parseInt(id);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const index = players.findIndex(p => p.id === numId);
    if (index === -1) throw new Error('Jogador não encontrado');

    const current = players[index];
    const updated = {
      ...current,
      name: data.name !== undefined ? data.name : current.name,
      nickname: data.nickname !== undefined ? data.nickname : current.nickname,
      number: data.number !== undefined ? data.number : current.number,
      photo: data.photo !== undefined ? data.photo : current.photo,
      height: data.height !== undefined ? data.height : current.height,
      primary_position: data.primary_position !== undefined ? data.primary_position : current.primary_position,
      secondary_positions: data.secondary_positions !== undefined ? data.secondary_positions : current.secondary_positions,
      notes: data.notes !== undefined ? data.notes : current.notes,
      updated_at: NOW()
    };

    if (data.attributes) {
      const history = getStored(STORAGE_KEYS.ATTR_HISTORY, []);
      const playerHistory = history.filter(h => h.player_id === numId);
      const last = playerHistory[playerHistory.length - 1] || {};
      const mergedAttrs = {
        attack: 5, serve: 5, reception: 5, block: 5, defense: 5,
        setting: 5, communication: 5, consistency: 5, versatility: 5,
        ...last,
        ...data.attributes
      };

      updated.attributes = mergedAttrs;
      history.push({
        id: history.length + 1,
        player_id: numId,
        ...mergedAttrs,
        recorded_at: NOW()
      });
      setStored(STORAGE_KEYS.ATTR_HISTORY, history);
    }

    players[index] = updated;
    setStored(STORAGE_KEYS.PLAYERS, players);

    return updated;
  },

  async deletePlayer(id) {
    ensureInit();
    const numId = parseInt(id);
    let players = getStored(STORAGE_KEYS.PLAYERS, []);
    players = players.filter(p => p.id !== numId);
    setStored(STORAGE_KEYS.PLAYERS, players);

    let history = getStored(STORAGE_KEYS.ATTR_HISTORY, []);
    history = history.filter(h => h.player_id !== numId);
    setStored(STORAGE_KEYS.ATTR_HISTORY, history);

    return { message: 'Jogador removido' };
  },

  // ── PARTIDAS ───────────────────────────────
  async getMatches() {
    ensureInit();
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const votes = getStored(STORAGE_KEYS.VOTES, []);

    return matches.map(m => {
      const matchVotes = votes.filter(v => v.match_id === m.id);
      return {
        ...m,
        votes: matchVotes,
        home_players: players.filter(p => (m.home_player_ids || []).includes(p.id)),
        away_players: players.filter(p => (m.away_player_ids || []).includes(p.id))
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getMatch(id) {
    ensureInit();
    const numId = parseInt(id);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const allPoints = getStored(STORAGE_KEYS.POINTS, []);
    const allVotes = getStored(STORAGE_KEYS.VOTES, []);

    const match = matches.find(m => m.id === numId);
    if (!match) throw new Error('Partida não encontrada');

    const points = allPoints
      .filter(pt => pt.match_id === numId)
      .map(pt => {
        const player = players.find(p => p.id === pt.player_id);
        return {
          ...pt,
          player_name: player ? player.name : null,
          player_nickname: player ? player.nickname : null
        };
      })
      .sort((a, b) => a.id - b.id);

    const votes = allVotes
      .filter(v => v.match_id === numId)
      .map(v => {
        const player = players.find(p => p.id === v.player_id);
        return {
          ...v,
          player_name: player ? player.name : null,
          player_nickname: player ? player.nickname : null,
          player_photo: player ? player.photo : null
        };
      });

    return {
      ...match,
      votes,
      home_players: players.filter(p => (match.home_player_ids || []).includes(p.id)),
      away_players: players.filter(p => (match.away_player_ids || []).includes(p.id)),
      points
    };
  },

  async createMatch(data) {
    ensureInit();
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const newId = matches.length > 0 ? Math.max(...matches.map(m => m.id)) + 1 : 1;

    const newMatch = {
      id: newId,
      home_team: data.home_team || 'Equipe A',
      away_team: data.away_team || 'Equipe B',
      status: 'live',
      max_sets: data.max_sets || 5,
      created_at: NOW(),
      home_player_ids: data.home_players || [],
      away_player_ids: data.away_players || [],
      sets: [
        { id: 1, match_id: newId, set_number: 1, home_score: 0, away_score: 0, winner: null, finished: 0 }
      ]
    };

    matches.push(newMatch);
    setStored(STORAGE_KEYS.MATCHES, matches);

    return this.getMatch(newId);
  },

  async addPoint(matchId, { player_id, team, action }) {
    ensureInit();
    const numId = parseInt(matchId);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const matchIndex = matches.findIndex(m => m.id === numId);
    if (matchIndex === -1) throw new Error('Partida não encontrada');

    const match = matches[matchIndex];
    if (match.status === 'finished') throw new Error('Partida já finalizada');

    let currentSet = match.sets.find(s => !s.finished);
    if (!currentSet) throw new Error('Nenhum set em andamento');

    let newHome = currentSet.home_score;
    let newAway = currentSet.away_score;
    if (team === 'home') newHome++;
    else newAway++;

    currentSet.home_score = newHome;
    currentSet.away_score = newAway;

    // Registrar ponto
    const points = getStored(STORAGE_KEYS.POINTS, []);
    const pointId = points.length > 0 ? Math.max(...points.map(p => p.id)) + 1 : 1;
    points.push({
      id: pointId,
      match_id: numId,
      set_id: currentSet.id,
      player_id: player_id || null,
      team,
      action,
      home_score_after: newHome,
      away_score_after: newAway,
      timestamp: NOW()
    });
    setStored(STORAGE_KEYS.POINTS, points);

    // Checar término de set
    const maxSets = match.max_sets || 5;
    const setsDone = match.sets.filter(s => s.finished).length;
    const isLastSet = setsDone === maxSets - 1;
    const pointsToWin = isLastSet ? 15 : 25;
    const minDiff = 2;

    const setFinished =
      (newHome >= pointsToWin || newAway >= pointsToWin) &&
      Math.abs(newHome - newAway) >= minDiff;

    let matchFinished = false;
    let nextSet = null;

    if (setFinished) {
      currentSet.finished = 1;
      currentSet.winner = newHome > newAway ? 'home' : 'away';

      const homeWins = match.sets.filter(s => s.winner === 'home').length;
      const awayWins = match.sets.filter(s => s.winner === 'away').length;
      const setsToWin = Math.ceil(maxSets / 2);

      if (homeWins >= setsToWin || awayWins >= setsToWin) {
        match.status = 'finished';
        matchFinished = true;
      } else {
        const nextNum = currentSet.set_number + 1;
        const newSetObj = {
          id: match.sets.length + 1,
          match_id: numId,
          set_number: nextNum,
          home_score: 0,
          away_score: 0,
          winner: null,
          finished: 0
        };
        match.sets.push(newSetObj);
        nextSet = newSetObj;
      }
    }

    matches[matchIndex] = match;
    setStored(STORAGE_KEYS.MATCHES, matches);

    return {
      setFinished,
      matchFinished,
      nextSet,
      match,
      sets: match.sets
    };
  },

  async undoPoint(matchId) {
    ensureInit();
    const numId = parseInt(matchId);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const matchIndex = matches.findIndex(m => m.id === numId);
    if (matchIndex === -1) throw new Error('Partida não encontrada');

    const match = matches[matchIndex];
    let points = getStored(STORAGE_KEYS.POINTS, []);
    const matchPoints = points.filter(p => p.match_id === numId);
    if (matchPoints.length === 0) throw new Error('Nenhum ponto para desfazer');

    const lastPoint = matchPoints[matchPoints.length - 1];
    points = points.filter(p => p.id !== lastPoint.id);
    setStored(STORAGE_KEYS.POINTS, points);

    const setObj = match.sets.find(s => s.id === lastPoint.set_id);
    if (setObj) {
      if (lastPoint.team === 'home') setObj.home_score = Math.max(0, setObj.home_score - 1);
      else setObj.away_score = Math.max(0, setObj.away_score - 1);
      setObj.finished = 0;
      setObj.winner = null;
    }

    match.status = 'live';
    matches[matchIndex] = match;
    setStored(STORAGE_KEYS.MATCHES, matches);

    return { message: 'Ponto desfeito', sets: match.sets };
  },

  async finishMatch(matchId) {
    ensureInit();
    const numId = parseInt(matchId);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const match = matches.find(m => m.id === numId);
    if (!match) throw new Error('Partida não encontrada');

    match.status = 'finished';
    match.finished_at = NOW();
    setStored(STORAGE_KEYS.MATCHES, matches);

    return { message: 'Partida finalizada' };
  },

  async voteMatch(matchId, playerId) {
    ensureInit();
    const numMatchId = parseInt(matchId);
    const numPlayerId = parseInt(playerId);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const match = matches.find(m => m.id === numMatchId);
    if (!match) throw new Error('Partida não encontrada');
    if (match.status !== 'finished') throw new Error('A votação popular só é permitida em partidas finalizadas');

    const finishTimeStr = match.finished_at || match.created_at;
    const finishTime = finishTimeStr ? new Date(finishTimeStr.replace(' ', 'T')).getTime() : Date.now();
    const elapsed = Date.now() - finishTime;
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    if (elapsed > TWO_HOURS_MS) {
      throw new Error('O prazo de 2 horas para votação popular nesta partida já foi encerrado');
    }

    const user = this._getCurrentUser();
    let voterId = user ? `user_${user.id}` : localStorage.getItem('volei_device_voter_id');
    if (!voterId) {
      voterId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('volei_device_voter_id', voterId);
    }

    let votes = getStored(STORAGE_KEYS.VOTES, []);
    const existingIndex = votes.findIndex(v => v.match_id === numMatchId && v.voter_identifier === voterId);
    if (existingIndex >= 0) {
      votes[existingIndex].player_id = numPlayerId;
      votes[existingIndex].created_at = NOW();
    } else {
      votes.push({
        id: Date.now(),
        match_id: numMatchId,
        player_id: numPlayerId,
        voter_identifier: voterId,
        created_at: NOW()
      });
    }
    setStored(STORAGE_KEYS.VOTES, votes);
    return { message: 'Voto registrado com sucesso!' };
  },

  async getMatchVotes(matchId) {
    ensureInit();
    const numMatchId = parseInt(matchId);
    const votes = getStored(STORAGE_KEYS.VOTES, []);
    const matchVotes = votes.filter(v => v.match_id === numMatchId);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    return matchVotes.map(v => {
      const p = players.find(x => x.id === v.player_id);
      return {
        ...v,
        player_name: p?.name || `Atleta #${v.player_id}`,
        player_nickname: p?.nickname || p?.name,
        player_photo: p?.photo || null
      };
    });
  },

  async deleteMatch(matchId) {
    ensureInit();
    const numId = parseInt(matchId);
    let matches = getStored(STORAGE_KEYS.MATCHES, []);
    matches = matches.filter(m => m.id !== numId);
    setStored(STORAGE_KEYS.MATCHES, matches);

    let points = getStored(STORAGE_KEYS.POINTS, []);
    points = points.filter(p => p.match_id !== numId);
    setStored(STORAGE_KEYS.POINTS, points);

    return { message: 'Partida removida' };
  },

  // ── TIMES ──────────────────────────────────
  _extractPlayerIds(team) {
    if (!team) return [];
    if (Array.isArray(team.player_ids) && team.player_ids.length > 0) {
      return team.player_ids.map(id => Number(id)).filter(id => !isNaN(id));
    }
    if (Array.isArray(team.players) && team.players.length > 0) {
      return team.players.map(p => Number(typeof p === 'object' ? p.id : p)).filter(id => !isNaN(id));
    }
    return [];
  },

  async getTeams() {
    ensureInit();
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    return teams.map(t => {
      const pIds = this._extractPlayerIds(t);
      let matchedPlayers = players.filter(p => pIds.includes(Number(p.id)));
      if (matchedPlayers.length === 0 && Array.isArray(t.players) && t.players.length > 0 && typeof t.players[0] === 'object') {
        matchedPlayers = t.players;
      }
      return {
        ...t,
        player_ids: pIds,
        players: matchedPlayers
      };
    });
  },

  async getTeam(id) {
    ensureInit();
    const numId = parseInt(id);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const team = teams.find(t => Number(t.id) === numId);
    if (!team) throw new Error('Time não encontrado');
    const pIds = this._extractPlayerIds(team);
    let matchedPlayers = players.filter(p => pIds.includes(Number(p.id)));
    if (matchedPlayers.length === 0 && Array.isArray(team.players) && team.players.length > 0 && typeof team.players[0] === 'object') {
      matchedPlayers = team.players;
    }
    return {
      ...team,
      player_ids: pIds,
      players: matchedPlayers
    };
  },

  async createTeam(data) {
    ensureInit();
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const newId = data.id ? Number(data.id) : (teams.length > 0 ? Math.max(...teams.map(t => Number(t.id) || 0)) + 1 : 1);
    const pIds = this._extractPlayerIds(data);
    const newTeam = {
      id: newId,
      name: data.name,
      description: data.description || '',
      color: data.color || '#f5c518',
      photo: data.photo || null,
      player_ids: pIds,
      created_at: data.created_at || NOW(),
      updated_at: data.updated_at || NOW()
    };
    const existingIndex = teams.findIndex(t => Number(t.id) === newId);
    if (existingIndex >= 0) {
      teams[existingIndex] = { ...teams[existingIndex], ...newTeam };
    } else {
      teams.push(newTeam);
    }
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(newId);
  },

  async updateTeam(id, data) {
    ensureInit();
    const numId = parseInt(id);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const index = teams.findIndex(t => Number(t.id) === numId);
    if (index === -1) throw new Error('Time não encontrado');
    const current = teams[index];
    let updatedPlayerIds = current.player_ids;
    if (data.player_ids !== undefined) {
      updatedPlayerIds = (Array.isArray(data.player_ids) ? data.player_ids : []).map(x => Number(x)).filter(x => !isNaN(x));
    } else if (data.players !== undefined) {
      updatedPlayerIds = this._extractPlayerIds(data);
    }

    teams[index] = {
      ...current,
      name:        data.name        !== undefined ? data.name        : current.name,
      description: data.description !== undefined ? data.description : current.description,
      color:       data.color       !== undefined ? data.color       : current.color,
      photo:       data.photo       !== undefined ? data.photo       : current.photo,
      player_ids:  updatedPlayerIds,
      updated_at: NOW()
    };
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(numId);
  },

  async deleteTeam(id) {
    ensureInit();
    const numId = parseInt(id);
    let teams = getStored(STORAGE_KEYS.TEAMS, []);
    teams = teams.filter(t => Number(t.id) !== numId);
    setStored(STORAGE_KEYS.TEAMS, teams);
    return { message: 'Time removido' };
  },

  async addPlayerToTeam(teamId, playerId) {
    ensureInit();
    const numId = parseInt(teamId);
    const pNumId = parseInt(playerId);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const index = teams.findIndex(t => Number(t.id) === numId);
    if (index === -1) throw new Error('Time não encontrado');
    const pIds = this._extractPlayerIds(teams[index]);
    if (!pIds.includes(pNumId)) {
      pIds.push(pNumId);
    }
    teams[index] = {
      ...teams[index],
      player_ids: pIds,
      updated_at: NOW()
    };
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(numId);
  },

  async removePlayerFromTeam(teamId, playerId) {
    ensureInit();
    const numId = parseInt(teamId);
    const pNumId = parseInt(playerId);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const index = teams.findIndex(t => Number(t.id) === numId);
    if (index === -1) throw new Error('Time não encontrado');
    const pIds = this._extractPlayerIds(teams[index]);
    teams[index] = {
      ...teams[index],
      player_ids: pIds.filter(id => id !== pNumId),
      updated_at: NOW()
    };
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(numId);
  },

  // ── AVALIAÇÕES E OBSERVAÇÕES ─────────────────────
  _getCurrentUser() {
    const u = localStorage.getItem('volei_local_user');
    if (!u) return { id: 1, display_name: 'Visitante', avatar_color: '#888', is_admin: 0 };
    return JSON.parse(u);
  },

  async saveRating(playerId, attrs) {
    const numId = parseInt(playerId);
    const user = this._getCurrentUser();
    const ratings = getStored(STORAGE_KEYS.RATINGS, []);
    const idx = ratings.findIndex(r => r.player_id === numId && r.user_id === user.id);
    const KEYS = ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'];
    const newRating = {
      id: idx >= 0 ? ratings[idx].id : (ratings.length + 1),
      player_id: numId, user_id: user.id,
      ...Object.fromEntries(KEYS.map(k => [k, parseFloat(attrs[k]) || 5])),
      updated_at: NOW()
    };
    if (idx >= 0) ratings[idx] = newRating;
    else ratings.push(newRating);
    setStored(STORAGE_KEYS.RATINGS, ratings);

    // Recalcular média
    const playerRatings = ratings.filter(r => r.player_id === numId);
    const count = playerRatings.length;
    const avg = Object.fromEntries(KEYS.map(k => [
      k, parseFloat((playerRatings.reduce((s, r) => s + (r[k] ?? 5), 0) / count).toFixed(2))
    ]));
    return { avg_attributes: avg, rating_count: count, my_rating: newRating };
  },

  async addObservation(playerId, text) {
    if (!text?.trim()) throw new Error('Texto é obrigatório');
    const numId = parseInt(playerId);
    const user = this._getCurrentUser();
    const observations = getStored(STORAGE_KEYS.OBSERVATIONS, []);
    const newObs = {
      id: observations.length + 1,
      player_id: numId,
      user_id: user.id,
      display_name: user.display_name,
      username: user.username || 'user',
      avatar_color: user.avatar_color || '#888',
      is_admin: user.is_admin || 0,
      text: text.trim(),
      created_at: NOW()
    };
    observations.push(newObs);
    setStored(STORAGE_KEYS.OBSERVATIONS, observations);
    return { observations: observations.filter(o => o.player_id === numId).reverse() };
  },

  async deleteObservation(playerId, obsId) {
    const numPId = parseInt(playerId);
    const numOId = parseInt(obsId);
    const user = this._getCurrentUser();
    let observations = getStored(STORAGE_KEYS.OBSERVATIONS, []);
    const obs = observations.find(o => o.id === numOId);
    if (!obs) throw new Error('Observação não encontrada');
    if (obs.user_id !== user.id && !user.is_admin) throw new Error('Sem permissão');
    observations = observations.filter(o => o.id !== numOId);
    setStored(STORAGE_KEYS.OBSERVATIONS, observations);
    return { observations: observations.filter(o => o.player_id === numPId).reverse() };
  },

  // ── GESTÃO DE USUÁRIOS (ADMIN) ───────────────────
  async getUsers() {
    return getStored('volei_users', []);
  },

  async deleteUser(userId) {
    const numId = parseInt(userId);
    let users = getStored('volei_users', []);
    const target = users.find(u => u.id === numId);
    if (target?.username?.toLowerCase() === 'admin') {
      throw new Error('Não é permitido excluir o administrador principal');
    }
    users = users.filter(u => u.id !== numId);
    setStored('volei_users', users);
    return { message: 'Usuário removido com sucesso' };
  },

  async wipeUsers() {
    let users = getStored('volei_users', []);
    users = users.filter(u => u.username?.toLowerCase() === 'admin');
    if (users.length === 0) {
      users = [{
        id: 1,
        username: 'admin',
        display_name: 'Admin',
        password: 'admin123',
        avatar_color: '#f5c518',
        is_admin: 1,
        created_at: NOW()
      }];
    }
    setStored('volei_users', users);
    return { message: 'Todos os usuários extras foram removidos' };
  }
};
