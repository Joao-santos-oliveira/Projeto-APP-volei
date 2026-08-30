const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

async function getAvgAttributes(query, playerId) {
  const ratings = await query(
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

async function buildTeam(team, query) {
  if (!team) return null;
  const players = await query(`
    SELECT p.id, p.name, p.nickname, p.primary_position, p.secondary_positions, p.number, p.photo, p.height
    FROM team_players tp JOIN players p ON p.id = tp.player_id
    WHERE tp.team_id = ?
    ORDER BY p.name ASC
  `, [team.id]);

  const fullPlayers = [];
  for (const p of players) {
    const { avg, count } = await getAvgAttributes(query, p.id);
    let secPos = [];
    try { secPos = JSON.parse(p.secondary_positions || '[]'); } catch { secPos = []; }
    fullPlayers.push({ ...p, secondary_positions: secPos, attributes: avg, rating_count: count });
  }

  return {
    ...team,
    player_ids: fullPlayers.map(p => Number(p.id)),
    players: fullPlayers
  };
}

// ─────────────────────────────────────────────
// GET /api/teams
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { query } = getDb();
    const teams = await query('SELECT * FROM teams ORDER BY name ASC');
    const result = [];
    for (const t of teams) result.push(await buildTeam(t, query));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/teams/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const team = await queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    res.json(await buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/teams
// ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { name, description = '', color = '#f5c518', photo = null, player_ids = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name é obrigatório' });

    const r = await run(
      `INSERT INTO teams (name, description, color, photo, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, description, color, photo, req.user.id, NOW(), NOW()]
    );
    const teamId = r.lastInsertRowid;

    for (const pid of player_ids) {
      await run('INSERT INTO team_players (team_id, player_id) VALUES (?, ?) ON CONFLICT (team_id, player_id) DO NOTHING', [teamId, pid]);
    }

    const team = await queryOne('SELECT * FROM teams WHERE id = ?', [teamId]);
    res.status(201).json(await buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/teams/:id
// ─────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const id = req.params.id;
    const { name, description, color, photo, player_ids } = req.body;

    const team = await queryOne('SELECT * FROM teams WHERE id = ?', [id]);
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
      await run(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, vals);
    }

    if (player_ids !== undefined) {
      await run('DELETE FROM team_players WHERE team_id = ?', [id]);
      for (const pid of player_ids) {
        await run('INSERT INTO team_players (team_id, player_id) VALUES (?, ?) ON CONFLICT (team_id, player_id) DO NOTHING', [id, pid]);
      }
    }

    const updated = await queryOne('SELECT * FROM teams WHERE id = ?', [id]);
    res.json(await buildTeam(updated, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/teams/:id
// ─────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    if (!(await queryOne('SELECT id FROM teams WHERE id = ?', [req.params.id]))) {
      return res.status(404).json({ error: 'Time não encontrado' });
    }
    await run('DELETE FROM teams WHERE id = ?', [req.params.id]);
    res.json({ message: 'Time removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/teams/:id/players  — adicionar jogador
// ─────────────────────────────────────────────
router.post('/:id/players', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { player_id } = req.body;
    const team = await queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    await run('INSERT INTO team_players (team_id, player_id) VALUES (?, ?) ON CONFLICT (team_id, player_id) DO NOTHING', [req.params.id, player_id]);
    res.json(await buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/teams/:id/players/:playerId
// ─────────────────────────────────────────────
router.delete('/:id/players/:playerId', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const team = await queryOne('SELECT * FROM teams WHERE id = ?', [req.params.id]);
    if (!team) return res.status(404).json({ error: 'Time não encontrado' });
    await run('DELETE FROM team_players WHERE team_id = ? AND player_id = ?', [req.params.id, req.params.playerId]);
    res.json(await buildTeam(team, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
