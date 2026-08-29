const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function getAvgAttributes(query, playerId) {
  const ratings = query(
    'SELECT attack,serve,reception,block,defense,setting,communication,consistency,versatility FROM player_ratings WHERE player_id = ?',
    [playerId]
  );
  const KEYS = ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'];
  if (ratings.length === 0) {
    return { avg: Object.fromEntries(KEYS.map(k => [k, 5])), count: 0 };
  }
  const sums = Object.fromEntries(KEYS.map(k => [k, 0]));
  ratings.forEach(r => KEYS.forEach(k => { sums[k] += r[k] ?? 5; }));
  const avg = Object.fromEntries(KEYS.map(k => [k, parseFloat((sums[k] / ratings.length).toFixed(2))]));
  return { avg, count: ratings.length };
}

function buildTeam(team, query) {
  if (!team) return null;
  const players = query(`
    SELECT p.id, p.name, p.nickname, p.primary_position, p.secondary_positions, p.number, p.photo, p.height
    FROM team_players tp JOIN players p ON p.id = tp.player_id
    WHERE tp.team_id = ?
    ORDER BY p.name ASC
  `, [team.id]);

  const fullPlayers = players.map(p => {
    const { avg, count } = getAvgAttributes(query, p.id);
    let secPos = [];
    try { secPos = JSON.parse(p.secondary_positions || '[]'); } catch { secPos = []; }
    return {
      ...p,
      secondary_positions: secPos,
      attributes: avg,
      rating_count: count
    };
  });

  return { ...team, players: fullPlayers };
}

// ─────────────────────────────────────────────
// GET /api/teams
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { query } = getDb();
    const teams = query('SELECT * FROM teams ORDER BY name ASC');
    res.json(teams.map(t => buildTeam(t, query)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/teams/:id
// ─────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    res.json(buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/teams
// ─────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { name, description = '', color = '#f5c518', photo = null, player_ids = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name é obrigatório' });

    const r = run(
      `INSERT INTO teams (name, description, color, photo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, color, photo, NOW(), NOW()]
    );
    const teamId = r.lastInsertRowid;

    for (const pid of player_ids) {
      run('INSERT OR IGNORE INTO team_players (team_id, player_id) VALUES (?, ?)', [teamId, pid]);
    }

    const team = queryOne('SELECT * FROM teams WHERE id = ?', [teamId]);
    res.status(201).json(buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/teams/:id
// ─────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const id = req.params.id;
    const { name, description, color, photo, player_ids } = req.body;

    const team = queryOne('SELECT * FROM teams WHERE id = ?', [id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });

    const updates = [];
    const vals = [];
    if (name        !== undefined) { updates.push('name = ?');        vals.push(name); }
    if (description !== undefined) { updates.push('description = ?'); vals.push(description); }
    if (color       !== undefined) { updates.push('color = ?');       vals.push(color); }
    if (photo       !== undefined) { updates.push('photo = ?');       vals.push(photo); }
    updates.push('updated_at = ?'); vals.push(NOW());
    vals.push(id);

    if (updates.length > 1) {
      run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, vals);
    }

    // Atualizar lista de jogadores se enviada
    if (player_ids !== undefined) {
      run('DELETE FROM team_players WHERE team_id = ?', [id]);
      for (const pid of player_ids) {
        run('INSERT OR IGNORE INTO team_players (team_id, player_id) VALUES (?, ?)', [id, pid]);
      }
    }

    const updated = queryOne('SELECT * FROM teams WHERE id = ?', [id]);
    res.json(buildTeam(updated, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/teams/:id
// ─────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { run, queryOne } = getDb();
    if (!queryOne('SELECT id FROM teams WHERE id = ?', [req.params.id])) {
      return res.status(404).json({ error: 'Time não encontrado' });
    }
    run('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Time removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/teams/:id/players  — adicionar jogador
// ─────────────────────────────────────────────
router.post('/:id/players', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { player_id } = req.body;
    const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    run('INSERT OR IGNORE INTO team_players (team_id, player_id) VALUES (?, ?)', [req.params.id, player_id]);
    res.json(buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/teams/:id/players/:playerId
// ─────────────────────────────────────────────
router.delete('/:id/players/:playerId', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const team = queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    run('DELETE FROM team_players WHERE team_id = ? AND player_id = ?', [req.params.id, req.params.playerId]);
    res.json(buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
