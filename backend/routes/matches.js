const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function buildMatch(match, query) {
  if (!match) return null;
  const sets = query('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number', [match.id]);
  const players = query(`
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
router.get('/', (req, res) => {
  try {
    const { query } = getDb();
    const matches = query('SELECT * FROM matches ORDER BY created_at DESC');
    res.json(matches.map(m => buildMatch(m, query)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/matches/:id
// ─────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const match = queryOne('SELECT * FROM matches WHERE id = ?', [req.params.id]);
    if (!match) return res.status(404).json({ error: 'Partida não encontrada' });

    const points = query(`
      SELECT pt.*, p.name as player_name, p.nickname as player_nickname
      FROM points pt LEFT JOIN players p ON p.id = pt.player_id
      WHERE pt.match_id = ? ORDER BY pt.id ASC
    `, [match.id]);

    res.json({ ...buildMatch(match, query), points });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/matches
// ─────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { home_team = 'Equipe A', away_team = 'Equipe B', home_players = [], away_players = [], max_sets = 5 } = req.body;

    const r = run(
      `INSERT INTO matches (home_team, away_team, status, max_sets, created_at) VALUES (?, ?, 'live', ?, ?)`,
      [home_team, away_team, max_sets, NOW()]
    );
    const matchId = r.lastInsertRowid;

    run('INSERT INTO sets (match_id, set_number, home_score, away_score) VALUES (?, 1, 0, 0)', [matchId]);

    for (const pid of home_players) run('INSERT OR IGNORE INTO match_players (match_id, player_id, team) VALUES (?, ?, ?)', [matchId, pid, 'home']);
    for (const pid of away_players) run('INSERT OR IGNORE INTO match_players (match_id, player_id, team) VALUES (?, ?, ?)', [matchId, pid, 'away']);

    const match = queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
    res.status(201).json(buildMatch(match, query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/matches/:id/point
// ─────────────────────────────────────────────
router.post('/:id/point', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { player_id, team, action } = req.body;
    const matchId = parseInt(req.params.id);

    const match = queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!match || match.status === 'finished') return res.status(400).json({ error: 'Partida não disponível' });

    const currentSet = queryOne('SELECT * FROM sets WHERE match_id = ? AND finished = 0 ORDER BY set_number DESC LIMIT 1', [matchId]);
    if (!currentSet) return res.status(400).json({ error: 'Nenhum set em andamento' });

    let newHome = currentSet.home_score;
    let newAway = currentSet.away_score;
    if (team === 'home') newHome++; else newAway++;

    const setsDoneRow = queryOne('SELECT COUNT(*) as c FROM sets WHERE match_id = ? AND finished = 1', [matchId]);
    const setsDone = setsDoneRow?.c || 0;
    const maxSets = match.max_sets || 5;
    const isLastSet = setsDone === maxSets - 1;
    const pointsToWin = isLastSet ? 15 : 25;

    const setFinished = (newHome >= pointsToWin || newAway >= pointsToWin) && Math.abs(newHome - newAway) >= 2;

    run('UPDATE sets SET home_score = ?, away_score = ? WHERE id = ?', [newHome, newAway, currentSet.id]);
    run(
      `INSERT INTO points (match_id, set_id, player_id, team, action, home_score_after, away_score_after, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [matchId, currentSet.id, player_id || null, team, action, newHome, newAway, NOW()]
    );

    let matchFinished = false;
    let nextSet = null;

    if (setFinished) {
      const winner = newHome > newAway ? 'home' : 'away';
      run('UPDATE sets SET finished = 1, winner = ? WHERE id = ?', [winner, currentSet.id]);

      const homeWins = queryOne(`SELECT COUNT(*) as c FROM sets WHERE match_id = ? AND winner = 'home'`, [matchId]);
      const awayWins = queryOne(`SELECT COUNT(*) as c FROM sets WHERE match_id = ? AND winner = 'away'`, [matchId]);
      const setsToWin = Math.ceil(maxSets / 2);

      if ((homeWins?.c || 0) >= setsToWin || (awayWins?.c || 0) >= setsToWin) {
        run(`UPDATE matches SET status = 'finished' WHERE id = ?`, [matchId]);
        matchFinished = true;
      } else {
        const nextNum = currentSet.set_number + 1;
        const nr = run('INSERT INTO sets (match_id, set_number, home_score, away_score) VALUES (?, ?, 0, 0)', [matchId, nextNum]);
        nextSet = queryOne('SELECT * FROM sets WHERE id = ?', [nr.lastInsertRowid]);
      }
    }

    const updatedMatch = queryOne('SELECT * FROM matches WHERE id = ?', [matchId]);
    const sets = query('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number', [matchId]);

    res.json({ setFinished, matchFinished, nextSet, match: updatedMatch, sets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/matches/:id/point (desfazer último)
// ─────────────────────────────────────────────
router.delete('/:id/point', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const matchId = parseInt(req.params.id);
    const last = queryOne('SELECT * FROM points WHERE match_id = ? ORDER BY id DESC LIMIT 1', [matchId]);
    if (!last) return res.status(400).json({ error: 'Nenhum ponto para desfazer' });

    const prevHome = last.home_score_after - (last.team === 'home' ? 1 : 0);
    const prevAway = last.away_score_after - (last.team === 'away' ? 1 : 0);

    run('DELETE FROM points WHERE id = ?', [last.id]);
    run('UPDATE sets SET home_score = ?, away_score = ?, finished = 0, winner = NULL WHERE id = ?',
      [prevHome, prevAway, last.set_id]);
    run(`UPDATE matches SET status = 'live' WHERE id = ?`, [matchId]);

    const sets = query('SELECT * FROM sets WHERE match_id = ? ORDER BY set_number', [matchId]);
    res.json({ message: 'Ponto desfeito', sets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/matches/:id/finish
// ─────────────────────────────────────────────
router.patch('/:id/finish', (req, res) => {
  try {
    const { run } = getDb();
    run(`UPDATE matches SET status = 'finished' WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Partida finalizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/matches/:id
// ─────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const matchId = parseInt(req.params.id);
    if (!queryOne('SELECT id FROM matches WHERE id = ?', [matchId])) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }
    run('DELETE FROM points WHERE match_id = ?', [matchId]);
    run('DELETE FROM sets WHERE match_id = ?', [matchId]);
    run('DELETE FROM match_players WHERE match_id = ?', [matchId]);
    run('DELETE FROM matches WHERE id = ?', [matchId]);
    res.json({ message: 'Partida removida' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
