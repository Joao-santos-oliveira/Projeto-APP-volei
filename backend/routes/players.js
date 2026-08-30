const express = require('express');
const router  = express.Router();
const { getDb } = require('../database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Helper: calcula atributos médios de todas as avaliações de um jogador
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

// Helper: calcula estatísticas detalhadas de jogo e contexto de equipe do jogador
async function getPlayerGameStats(query, queryOne, playerId) {
  const byAction   = await query('SELECT action, COUNT(*) as count, team FROM points WHERE player_id = ? GROUP BY action, team', [playerId]);
  const totalActs  = await queryOne('SELECT COUNT(*) as c FROM points WHERE player_id = ?', [playerId]);
  const pointsMade = await queryOne(`SELECT COUNT(*) as c FROM points WHERE player_id = ? AND action IN ('attack_point','serve_ace','block_point','opponent_error')`, [playerId]);
  const errors     = await queryOne(`SELECT COUNT(*) as c FROM points WHERE player_id = ? AND action LIKE '%_error'`, [playerId]);

  const teamMatches = await query(`SELECT match_id, team FROM match_players WHERE player_id = ?`, [playerId]);
  const matchesPlayed = teamMatches.length;

  let teamAttackPoints = 0;
  let teamAttackErrors = 0;
  let teamPointsTotal = 0;

  if (matchesPlayed > 0) {
    const teamStats = await queryOne(`
      SELECT 
        SUM(CASE WHEN pt.action = 'attack_point' AND pt.team = mp.team THEN 1 ELSE 0 END) as team_atk_pts,
        SUM(CASE WHEN pt.action = 'attack_error' AND pt.team = mp.team THEN 1 ELSE 0 END) as team_atk_errs,
        SUM(CASE WHEN pt.team = mp.team THEN 1 ELSE 0 END) as team_pts_total
      FROM match_players mp
      JOIN points pt ON pt.match_id = mp.match_id
      WHERE mp.player_id = ?
    `, [playerId]);

    teamAttackPoints = Number(teamStats?.team_atk_pts) || 0;
    teamAttackErrors = Number(teamStats?.team_atk_errs) || 0;
    teamPointsTotal = Number(teamStats?.team_pts_total) || 0;
  }

  return {
    total_actions: Number(totalActs?.c) || 0,
    points_made: Number(pointsMade?.c) || 0,
    errors: Number(errors?.c) || 0,
    by_action: byAction,
    matches_played: matchesPlayed,
    team_attack_points: teamAttackPoints,
    team_attack_errors: teamAttackErrors,
    team_points_total: teamPointsTotal
  };
}

// ─────────────────────────────────────────────
// GET /api/players
// ─────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const players = await query('SELECT * FROM players ORDER BY name ASC');

    const result = [];
    for (const p of players) {
      const { avg, count } = await getAvgAttributes(query, p.id);
      const sp = (() => { try { return JSON.parse(p.secondary_positions || '[]'); } catch { return []; } })();
      const gameStats = await getPlayerGameStats(query, queryOne, p.id);

      let my_rating = null;
      if (req.user) {
        const rows = await query(
          'SELECT * FROM player_ratings WHERE player_id = ? AND user_id = ?',
          [p.id, req.user.id]
        );
        my_rating = rows[0] || null;
      }

      result.push({
        ...p,
        secondary_positions: sp,
        attributes: avg,
        rating_count: count,
        my_rating,
        game_stats: gameStats
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/players/:id
// ─────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const player = await queryOne('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });

    const { avg, count } = await getAvgAttributes(query, req.params.id);

    let my_rating = null;
    if (req.user) {
      my_rating = await queryOne(
        'SELECT * FROM player_ratings WHERE player_id = ? AND user_id = ?',
        [req.params.id, req.user.id]
      );
    }

    const all_ratings = await query(`
      SELECT pr.*, 
             COALESCE(u.display_name, 'Comissão') as display_name, 
             COALESCE(u.avatar_color, '#E5A93C') as avatar_color
      FROM player_ratings pr
      LEFT JOIN users u ON u.id = pr.user_id
      WHERE pr.player_id = ?
      ORDER BY pr.updated_at DESC
    `, [req.params.id]);

    const observations = await query(`
      SELECT po.id, po.text, po.created_at, po.user_id,
             COALESCE(u.display_name, 'Comissão Técnica') as display_name,
             COALESCE(u.username, 'admin') as username,
             COALESCE(u.avatar_color, '#E5A93C') as avatar_color,
             COALESCE(u.is_admin, 1) as is_admin
      FROM player_observations po
      LEFT JOIN users u ON u.id = po.user_id
      WHERE po.player_id = ?
      ORDER BY po.created_at DESC
    `, [req.params.id]);

    const history = await query('SELECT * FROM player_attributes WHERE player_id = ? ORDER BY recorded_at ASC', [req.params.id]);
    const gameStats = await getPlayerGameStats(query, queryOne, req.params.id);

    res.json({
      ...player,
      secondary_positions: (() => { try { return JSON.parse(player.secondary_positions || '[]'); } catch { return []; } })(),
      attributes: avg,
      rating_count: count,
      my_rating,
      all_ratings,
      observations,
      attribute_history: history,
      game_stats: gameStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/players
// ─────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const { name, nickname, number, photo, height, primary_position, secondary_positions = [], attributes = {} } = req.body;
    if (!name || !primary_position) return res.status(400).json({ error: 'name e primary_position são obrigatórios' });

    const r = await run(
      `INSERT INTO players (name, nickname, number, photo, height, primary_position, secondary_positions, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [name, nickname||null, number||null, photo||null, height||null, primary_position,
       JSON.stringify(secondary_positions), req.user.id, NOW(), NOW()]
    );
    const id = r.lastInsertRowid;

    const defaultAttrs = { attack:5, serve:5, reception:5, block:5, defense:5, setting:5, communication:5, consistency:5, versatility:5, ...attributes };
    await run(
      `INSERT INTO player_ratings (player_id, user_id, attack, serve, reception, block, defense, setting, communication, consistency, versatility, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (player_id, user_id) DO UPDATE SET
         attack=EXCLUDED.attack, serve=EXCLUDED.serve, reception=EXCLUDED.reception, block=EXCLUDED.block,
         defense=EXCLUDED.defense, setting=EXCLUDED.setting, communication=EXCLUDED.communication,
         consistency=EXCLUDED.consistency, versatility=EXCLUDED.versatility, updated_at=EXCLUDED.updated_at`,
      [id, req.user.id, defaultAttrs.attack, defaultAttrs.serve, defaultAttrs.reception, defaultAttrs.block,
       defaultAttrs.defense, defaultAttrs.setting, defaultAttrs.communication, defaultAttrs.consistency, defaultAttrs.versatility, NOW()]
    );

    await run(
      `INSERT INTO player_attributes (player_id, attack, serve, reception, block, defense, setting, communication, consistency, versatility, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, defaultAttrs.attack, defaultAttrs.serve, defaultAttrs.reception, defaultAttrs.block,
       defaultAttrs.defense, defaultAttrs.setting, defaultAttrs.communication, defaultAttrs.consistency, defaultAttrs.versatility, NOW()]
    );

    const player = await queryOne('SELECT * FROM players WHERE id = ?', [id]);
    res.status(201).json({ ...player, secondary_positions: JSON.parse(player.secondary_positions || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/players/:id — editar dados básicos
// ─────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const id = req.params.id;
    const { name, nickname, number, photo, height, primary_position, secondary_positions } = req.body;

    const player = await queryOne('SELECT * FROM players WHERE id = ?', [id]);
    if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });

    const updates = [], vals = [];
    if (name !== undefined)       { updates.push('name = ?');       vals.push(name); }
    if (nickname !== undefined)   { updates.push('nickname = ?');   vals.push(nickname); }
    if (number !== undefined)     { updates.push('number = ?');     vals.push(number); }
    if (photo !== undefined)      { updates.push('photo = ?');      vals.push(photo); }
    if (height !== undefined)     { updates.push('height = ?');     vals.push(height); }
    if (primary_position !== undefined) { updates.push('primary_position = ?'); vals.push(primary_position); }
    if (secondary_positions !== undefined) { updates.push('secondary_positions = ?'); vals.push(JSON.stringify(secondary_positions)); }
    updates.push('updated_at = ?'); vals.push(NOW()); vals.push(id);

    if (updates.length > 1) await run(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`, vals);

    const updated = await queryOne('SELECT * FROM players WHERE id = ?', [id]);
    res.json({ ...updated, secondary_positions: JSON.parse(updated.secondary_positions || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/players/:id/rating — avaliação pessoal do usuário logado
// ─────────────────────────────────────────────
router.post('/:id/rating', requireAuth, async (req, res) => {
  try {
    const { run, queryOne, query } = getDb();
    const playerId = req.params.id;
    const userId   = req.user.id;

    if (!(await queryOne('SELECT id FROM players WHERE id = ?', [playerId]))) {
      return res.status(404).json({ error: 'Jogador não encontrado' });
    }

    const attrs = req.body;
    const keys  = ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'];
    const vals  = keys.map(k => parseFloat(attrs[k]) || 5);

    await run(
      `INSERT INTO player_ratings
         (player_id, user_id, attack, serve, reception, block, defense, setting, communication, consistency, versatility, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (player_id, user_id) DO UPDATE SET
         attack=EXCLUDED.attack, serve=EXCLUDED.serve, reception=EXCLUDED.reception, block=EXCLUDED.block,
         defense=EXCLUDED.defense, setting=EXCLUDED.setting, communication=EXCLUDED.communication,
         consistency=EXCLUDED.consistency, versatility=EXCLUDED.versatility, updated_at=EXCLUDED.updated_at`,
      [playerId, userId, ...vals, NOW()]
    );

    await run(
      `INSERT INTO player_attributes
         (player_id, attack, serve, reception, block, defense, setting, communication, consistency, versatility, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [playerId, ...vals, NOW()]
    );

    const { avg, count } = await getAvgAttributes(query, playerId);
    const my_rating = await queryOne('SELECT * FROM player_ratings WHERE player_id = ? AND user_id = ?', [playerId, userId]);
    res.json({ avg_attributes: avg, rating_count: count, my_rating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/players/:id/observations — nova observação
// ─────────────────────────────────────────────
router.post('/:id/observations', requireAuth, async (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Texto é obrigatório' });

    if (!(await queryOne('SELECT id FROM players WHERE id = ?', [req.params.id]))) {
      return res.status(404).json({ error: 'Jogador não encontrado' });
    }

    const userExists = await queryOne('SELECT id FROM users WHERE id = ?', [req.user?.id]);
    const effectiveUserId = userExists ? userExists.id : ((await queryOne("SELECT id FROM users WHERE LOWER(username) = 'admin'"))?.id || 1);

    await run(
      'INSERT INTO player_observations (player_id, user_id, text, created_at) VALUES (?, ?, ?, ?)',
      [req.params.id, effectiveUserId, text.trim(), NOW()]
    );

    const observations = await query(`
      SELECT po.id, po.text, po.created_at, po.user_id,
             COALESCE(u.display_name, 'Comissão Técnica') as display_name,
             COALESCE(u.username, 'admin') as username,
             COALESCE(u.avatar_color, '#E5A93C') as avatar_color,
             COALESCE(u.is_admin, 1) as is_admin
      FROM player_observations po
      LEFT JOIN users u ON u.id = po.user_id
      WHERE po.player_id = ?
      ORDER BY po.created_at DESC
    `, [req.params.id]);

    res.status(201).json({ observations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/players/:id/observations/:obsId
// ─────────────────────────────────────────────
router.delete('/:id/observations/:obsId', requireAuth, async (req, res) => {
  try {
    const { run, queryOne, query } = getDb();
    const obs = await queryOne('SELECT * FROM player_observations WHERE id = ?', [req.params.obsId]);
    if (!obs) return res.status(404).json({ error: 'Observação não encontrada' });

    await run('DELETE FROM player_observations WHERE id = ?', [req.params.obsId]);

    const observations = await query(`
      SELECT po.id, po.text, po.created_at, po.user_id,
             COALESCE(u.display_name, 'Comissão Técnica') as display_name,
             COALESCE(u.username, 'admin') as username,
             COALESCE(u.avatar_color, '#E5A93C') as avatar_color,
             COALESCE(u.is_admin, 1) as is_admin
      FROM player_observations po
      LEFT JOIN users u ON u.id = po.user_id
      WHERE po.player_id = ?
      ORDER BY po.created_at DESC
    `, [req.params.id]);

    res.json({ observations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/players/:id
// ─────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    if (!(await queryOne('SELECT id FROM players WHERE id = ?', [req.params.id]))) {
      return res.status(404).json({ error: 'Jogador não encontrado' });
    }
    await run('DELETE FROM players WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jogador removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
