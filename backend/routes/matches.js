const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth } = require('../middleware/auth');

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

async function buildMatch(match, query) {
  if (!match) return null;
  const sets = await query('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number', [match.id]);
  const players = await query(`
    SELECT mp.team, p.id, p.name, p.nickname, p.primary_position, p.number
    FROM match_players mp JOIN players p ON p.id = mp.player_id
    WHERE mp.match_id = ?
  `, [match.id]);
  return {
    ...match,
    sets,
    home_players: players.filter(p => p.team === 'home'),
    away_players: players.filter(p => p.team === 'away')
  };
}

// ─────────────────────────────────────────────
// GET /api/matches
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { query } = getDb();
    const matches = await query('SELECT * FROM matches ORDER BY created_at DESC');
    const result = [];
    for (const m of matches) result.push(await buildMatch(m, query));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/matches/:id
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const match = await queryOne('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

    const points = await query(`
      SELECT pt.*, p.name as player_name, p.nickname as player_nickname
      FROM points pt LEFT JOIN players p ON p.id = pt.player_id
      WHERE pt.match_id = ? ORDER BY pt.id ASC
    `, [match.id]);

    res.json({ ...(await buildMatch(match, query)), points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/matches
// ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { home_team = 'Equipe A', away_team = 'Equipe B', home_players = [], away_players = [], max_sets = 5 } = req.body;

    const r = await run(
      `INSERT INTO matches (home_team, away_team, status, max_sets, created_by, created_at) VALUES (?, ?, 'live', ?, ?, ?) RETURNING id`,
      [home_team, away_team, max_sets, req.user.id, NOW()]
    );
    const matchId = r.lastInsertRowid;

    await run('INSERT INTO sets (match_id, set_number, home_score, away_score) VALUES (?, 1, 0, 0)', [matchId]);

    for (const pid of home_players) await run('INSERT INTO match_players (match_id, player_id, team) VALUES (?, ?, ?) ON CONFLICT (match_id, player_id) DO NOTHING', [matchId, pid, 'home']);
    for (const pid of away_players) await run('INSERT INTO match_players (match_id, player_id, team) VALUES (?, ?, ?) ON CONFLICT (match_id, player_id) DO NOTHING', [matchId, pid, 'away']);

    const match = await queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
    res.status(201).json(await buildMatch(match, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/matches/:id/point
// ─────────────────────────────────────────────
router.post('/:id/point', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { player_id, team, action } = req.body;
    const matchId = parseInt(req.params.id);

    const match = await queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!match || match.status === 'finished') return res.status(400).json({ error: 'Partida não disponível' });

    const currentSet = await queryOne('SELECT * FROM sets WHERE match_id = ? AND finished = 0 ORDER BY set_number DESC LIMIT 1', [matchId]);
    if (!currentSet) return res.status(400).json({ error: 'Nenhum set em andamento' });

    let newHome = currentSet.home_score;
    let newAway = currentSet.away_score;
    if (team === 'home') newHome++; else newAway++;

    const setsDoneRow = await queryOne('SELECT COUNT(*) as c FROM sets WHERE match_id = ? AND finished = 1', [matchId]);
    const setsDone = Number(setsDoneRow?.c) || 0;
    const maxSets = match.max_sets || 5;
    const isLastSet = setsDone === maxSets - 1;
    const pointsToWin = isLastSet ? 15 : 25;

    const setFinished = (newHome >= pointsToWin || newAway >= pointsToWin) && Math.abs(newHome - newAway) >= 2;

    await run('UPDATE sets SET home_score = ?, away_score = ? WHERE id = ?', [newHome, newAway, currentSet.id]);
    await run(
      `INSERT INTO points (match_id, set_id, player_id, team, action, home_score_after, away_score_after, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [matchId, currentSet.id, player_id || null, team, action, newHome, newAway, NOW()]
    );

    let matchFinished = false;
    let nextSet = null;

    if (setFinished) {
      const winner = newHome > newAway ? 'home' : 'away';
      await run('UPDATE sets SET finished = 1, winner = ? WHERE id = ?', [winner, currentSet.id]);

      const homeWins = await queryOne(`SELECT COUNT(*) as c FROM sets WHERE match_id = ? AND winner = 'home'`, [matchId]);
      const awayWins = await queryOne(`SELECT COUNT(*) as c FROM sets WHERE match_id = ? AND winner = 'away'`, [matchId]);
      const setsToWin = Math.ceil(maxSets / 2);

      if ((Number(homeWins?.c) || 0) >= setsToWin || (Number(awayWins?.c) || 0) >= setsToWin) {
        await run(`UPDATE matches SET status = 'finished' WHERE id = ?`, [matchId]);
        matchFinished = true;
      } else {
        const nextNum = currentSet.set_number + 1;
        const nr = await run('INSERT INTO sets (match_id, set_number, home_score, away_score) VALUES (?, ?, 0, 0) RETURNING id', [matchId, nextNum]);
        nextSet = await queryOne('SELECT * FROM sets WHERE id = ?', [nr.lastInsertRowid]);
      }
    }

    const updatedMatch = await queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
    const sets = await query('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number', [matchId]);

    res.json({ setFinished, matchFinished, nextSet, match: updatedMatch, sets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/matches/:id/point (desfazer último)
// ─────────────────────────────────────────────
router.delete('/:id/point', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const matchId = parseInt(req.params.id);
    const last = await queryOne('SELECT * FROM points WHERE match_id = ? ORDER BY id DESC LIMIT 1', [matchId]);
    if (!last) return res.status(400).json({ error: 'Nenhum ponto para desfazer' });

    const prevHome = last.home_score_after - (last.team === 'home' ? 1 : 0);
    const prevAway = last.away_score_after - (last.team === 'away' ? 1 : 0);

    await run('DELETE FROM points WHERE id = ?', [last.id]);
    await run('UPDATE sets SET home_score = ?, away_score = ?, finished = 0, winner = NULL WHERE id = ?',
      [prevHome, prevAway, last.set_id]);
    await run(`UPDATE matches SET status = 'live' WHERE id = ?`, [matchId]);

    const sets = await query('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number', [matchId]);
    res.json({ message: 'Ponto desfeito', sets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/matches/:id/finish
// ─────────────────────────────────────────────
router.patch('/:id/finish', requireAuth, async (req, res) => {
  try {
    const { run } = getDb();
    await run(`UPDATE matches SET status = 'finished' WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Partida finalizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/matches/:id
// ─────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const matchId = parseInt(req.params.id);
    if (!(await queryOne('SELECT id FROM matches WHERE id = ?', [matchId]))) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    await run('DELETE FROM points WHERE match_id = ?', [matchId]);
    await run('DELETE FROM sets WHERE match_id = ?', [matchId]);
    await run('DELETE FROM match_players WHERE match_id = ?', [matchId]);
    await run('DELETE FROM matches WHERE id = ?', [matchId]);
    res.json({ message: 'Partida removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
