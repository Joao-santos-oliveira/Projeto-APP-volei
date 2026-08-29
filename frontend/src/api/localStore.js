/**
 * localStore.js - Persistência Client-Side (Offline / GitHub Pages / Vercel Estático)
 * Permite que a aplicação funcione 100% de forma independente no navegador usando localStorage.
 */

const STORAGE_KEYS = {
  PLAYERS: 'volei_app_players',
  ATTR_HISTORY: 'volei_app_attr_history',
  MATCHES: 'volei_app_matches',
  POINTS: 'volei_app_points'
};

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Seed inicial caso não existam dados
const INITIAL_PLAYERS = [
  {
    id: 1,
    name: 'João Gabriel',
    nickname: 'JG',
    number: 1,
    photo: null,
    height: 181,
    primary_position: 'Levantador',
    secondary_positions: [],
    notes: 'Excelente leitura de jogo. Levantamento preciso e rápido.',
    created_at: NOW(),
    updated_at: NOW(),
    attributes: { attack: 5, serve: 6, reception: 7, block: 4, defense: 7, setting: 9, communication: 9, consistency: 8, versatility: 6 }
  },
  {
    id: 2,
    name: 'João Pedro',
    nickname: 'JP',
    number: 2,
    photo: null,
    height: 200,
    primary_position: 'Central',
    secondary_positions: ['Oposto'],
    notes: 'Altura excepcional. Bloqueio muito forte.',
    created_at: NOW(),
    updated_at: NOW(),
    attributes: { attack: 8, serve: 6, reception: 4, block: 9, defense: 4, setting: 3, communication: 7, consistency: 7, versatility: 6 }
  },
  {
    id: 3,
    name: 'Rafael',
    nickname: 'Rafa',
    number: 7,
    photo: null,
    height: 191,
    primary_position: 'Ponteiro',
    secondary_positions: [],
    notes: 'Ponteiro principal. Potente no ataque.',
    created_at: NOW(),
    updated_at: NOW(),
    attributes: { attack: 9, serve: 7, reception: 6, block: 7, defense: 6, setting: 4, communication: 7, consistency: 7, versatility: 6 }
  },
  {
    id: 4,
    name: 'Carlos',
    nickname: 'Carlão',
    number: 10,
    photo: null,
    height: 175,
    primary_position: 'Ponteiro',
    secondary_positions: [],
    notes: 'Veloz e aguerrido. Bom saque flutuante.',
    created_at: NOW(),
    updated_at: NOW(),
    attributes: { attack: 7, serve: 8, reception: 7, block: 5, defense: 8, setting: 4, communication: 8, consistency: 7, versatility: 7 }
  },
  {
    id: 5,
    name: 'Felipe',
    nickname: 'Fê',
    number: 5,
    photo: null,
    height: 175,
    primary_position: 'Líbero',
    secondary_positions: ['Ponteiro'],
    notes: 'Líbero de excelente recepção. Comunicação impecável.',
    created_at: NOW(),
    updated_at: NOW(),
    attributes: { attack: 4, serve: 5, reception: 9, block: 2, defense: 9, setting: 5, communication: 9, consistency: 9, versatility: 7 }
  }
];

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

// Inicializa dados no localStorage se vazios
function ensureInit() {
  const existing = getStored(STORAGE_KEYS.PLAYERS, null);
  if (!existing || existing.length === 0) {
    setStored(STORAGE_KEYS.PLAYERS, INITIAL_PLAYERS);

    const initialHistory = INITIAL_PLAYERS.map(p => ({
      id: p.id,
      player_id: p.id,
      ...p.attributes,
      recorded_at: NOW()
    }));
    setStored(STORAGE_KEYS.ATTR_HISTORY, initialHistory);
    setStored(STORAGE_KEYS.MATCHES, []);
    setStored(STORAGE_KEYS.POINTS, []);
  }
}

ensureInit();

export const localStore = {
  // ── JOGADORES ──────────────────────────────
  async getPlayers() {
    ensureInit();
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const history = getStored(STORAGE_KEYS.ATTR_HISTORY, []);

    return players.map(p => {
      // Pega o último snapshot de atributos
      const playerSnapshots = history.filter(h => h.player_id === p.id);
      const lastAttrs = playerSnapshots.length > 0
        ? playerSnapshots[playerSnapshots.length - 1]
        : (p.attributes || {});

      return {
        ...p,
        secondary_positions: p.secondary_positions || [],
        attributes: {
          attack: lastAttrs.attack ?? 5,
          serve: lastAttrs.serve ?? 5,
          reception: lastAttrs.reception ?? 5,
          block: lastAttrs.block ?? 5,
          defense: lastAttrs.defense ?? 5,
          setting: lastAttrs.setting ?? 5,
          communication: lastAttrs.communication ?? 5,
          consistency: lastAttrs.consistency ?? 5,
          versatility: lastAttrs.versatility ?? 5
        }
      };
    });
  },

  async getPlayer(id) {
    ensureInit();
    const numId = parseInt(id);
    const players = getStored(STORAGE_KEYS.PLAYERS, []);
    const p = players.find(x => x.id === numId);
    if (!p) throw new Error('Jogador não encontrado');

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
      home_team: data.home_team || 'Nosso Time',
      away_team: data.away_team || 'Adversário',
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
  }
};
