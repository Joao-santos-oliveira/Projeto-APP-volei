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
  OBSERVATIONS: 'volei_app_observations'
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
}

ensureInit();

const KEYS = ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'];

export const localStore = {
  // ── JOGADORES ──────────────────────────────
  async getPlayers() {
    ensureInit();
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const ratings = getStored(STORAGE_KEYS.RATINGS, []);
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

      return {
        ...p,
        secondary_positions: p.secondary_positions || [],
        attributes: avgAttrs,
        rating_count: pRatings.length,
        my_rating: myRating
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
    const points = getStored(STORAGE_KEYS.POINTS, []).filter(pt => pt.player_id === numId);

    // Contagem de ações
    const byActionMap = {};
    points.forEach(pt => {
      const key = `${pt.action}_${pt.team}`;
      if (!byActionMap[key]) {
        byActionMap[key] = { action: pt.action, team: pt.team, count: 0 };
      }
      byActionMap[key].count++;
    });

    const pointsMade = points.filter(pt =>
      ['attack_point', 'serve_ace', 'block_point', 'opponent_error'].includes(pt.action)
    ).length;

    const errors = points.filter(pt => pt.action && pt.action.endsWith('_error')).length;

    return {
      ...p,
      secondary_positions: p.secondary_positions || [],
      attributes: avgAttrs,
      rating_count: pRatings.length,
      my_rating: myRating,
      all_ratings: allRatings,
      observations: observations,
      attribute_history: history,
      game_stats: {
        total_actions: points.length,
        points_made: pointsMade,
        errors: errors,
        by_action: Object.values(byActionMap)
      }
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

    return matches.map(m => ({
      ...m,
      home_players: players.filter(p => (m.home_player_ids || []).includes(p.id)),
      away_players: players.filter(p => (m.away_player_ids || []).includes(p.id))
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getMatch(id) {
    ensureInit();
    const numId = parseInt(id);
    const matches = getStored(STORAGE_KEYS.MATCHES, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const allPoints = getStored(STORAGE_KEYS.POINTS, []);

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

    return {
      ...match,
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
    setStored(STORAGE_KEYS.MATCHES, matches);

    return { message: 'Partida finalizada' };
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
  async getTeams() {
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    return teams.map(t => ({
      ...t,
      players: players.filter(p => (t.player_ids || []).includes(p.id))
    }));
  },

  async getTeam(id) {
    const numId = parseInt(id);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const team = teams.find(t => t.id === numId);
    if (!team) throw new Error('Time não encontrado');
    return {
      ...team,
      players: players.filter(p => (team.player_ids || []).includes(p.id))
    };
  },

  async createTeam(data) {
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const newId = teams.length > 0 ? Math.max(...teams.map(t => t.id)) + 1 : 1;
    const newTeam = {
      id: newId,
      name: data.name,
      description: data.description || '',
      color: data.color || '#f5c518',
      photo: data.photo || null,
      player_ids: data.player_ids || [],
      created_at: NOW(),
      updated_at: NOW()
    };
    teams.push(newTeam);
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(newId);
  },

  async updateTeam(id, data) {
    const numId = parseInt(id);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const index = teams.findIndex(t => t.id === numId);
    if (index === -1) throw new Error('Time não encontrado');
    const current = teams[index];
    teams[index] = {
      ...current,
      name:        data.name        !== undefined ? data.name        : current.name,
      description: data.description !== undefined ? data.description : current.description,
      color:       data.color       !== undefined ? data.color       : current.color,
      photo:       data.photo       !== undefined ? data.photo       : current.photo,
      player_ids:  data.player_ids  !== undefined ? data.player_ids  : current.player_ids,
      updated_at: NOW()
    };
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(numId);
  },

  async deleteTeam(id) {
    const numId = parseInt(id);
    let teams = getStored(STORAGE_KEYS.TEAMS, []);
    teams = teams.filter(t => t.id !== numId);
    setStored(STORAGE_KEYS.TEAMS, teams);
    return { message: 'Time removido' };
  },

  async addPlayerToTeam(teamId, playerId) {
    const numId = parseInt(teamId);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const index = teams.findIndex(t => t.id === numId);
    if (index === -1) throw new Error('Time não encontrado');
    const pIds = teams[index].player_ids || [];
    if (!pIds.includes(playerId)) teams[index].player_ids = [...pIds, playerId];
    setStored(STORAGE_KEYS.TEAMS, teams);
    return this.getTeam(numId);
  },

  async removePlayerFromTeam(teamId, playerId) {
    const numId = parseInt(teamId);
    const pNumId = parseInt(playerId);
    const teams = getStored(STORAGE_KEYS.TEAMS, []);
    const index = teams.findIndex(t => t.id === numId);
    if (index === -1) throw new Error('Time não encontrado');
    teams[index].player_ids = (teams[index].player_ids || []).filter(id => id !== pNumId);
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
  }
};
