const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

const NOW = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ─────────────────────────────────────────────
// GET /api/players
// ─────────────────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { query } = getDb();
    const players = query(`
      SELECT p.*,
             a.attack, a.serve, a.reception, a.block, a.defense,
             a.setting, a.communication, a.consistency, a.versatility
      FROM players p
      LEFT JOIN (
        SELECT player_id, attack, serve, reception, block, defense,
               setting, communication, consistency, versatility
        FROM player_attributes
        WHERE id IN (SELECT MAX(id) FROM player_attributes GROUP BY player_id)
      ) a ON a.player_id = p.id
      ORDER BY p.name ASC
    `);

    const result = players.map(p => {
      const sp = (() => { try { return JSON.parse(p.secondary_positions || '[]'); } catch { return []; } })();
      const attrs = {
        attack: p.attack ?? 5, serve: p.serve ?? 5, reception: p.reception ?? 5,
        block: p.block ?? 5, defense: p.defense ?? 5, setting: p.setting ?? 5,
        communication: p.communication ?? 5, consistency: p.consistency ?? 5, versatility: p.versatility ?? 5
      };
      const clean = { ...p, secondary_positions: sp, attributes: attrs };
      ['attack','serve','reception','block','defense','setting','communication','consistency','versatility'].forEach(k => delete clean[k]);
      return clean;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/players/:id
// ─────────────────────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const { query, queryOne } = getDb();
    const player = queryOne('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });

    const history = query('SELECT * FROM player_attributes WHERE player_id = ? ORDER BY recorded_at ASC', [req.params.id]);
    const byAction = query(
      'SELECT action, COUNT(*) as count, team FROM points WHERE player_id = ? GROUP BY action, team',
      [req.params.id]
    );
    const totalActions = queryOne('SELECT COUNT(*) as c FROM points WHERE player_id = ?', [req.params.id]);
    const pointsMade   = queryOne(
      `SELECT COUNT(*) as c FROM points WHERE player_id = ? AND action IN ('attack_point','serve_ace','block_point','opponent_error')`,
      [req.params.id]
    );
    const errors = queryOne(
      `SELECT COUNT(*) as c FROM points WHERE player_id = ? AND action LIKE '%_error'`,
      [req.params.id]
    );

    res.json({
      ...player,
      secondary_positions: (() => { try { return JSON.parse(player.secondary_positions || '[]'); } catch { return []; } })(),
      attribute_history: history,
      game_stats: {
        total_actions: totalActions?.c || 0,
        points_made: pointsMade?.c || 0,
        errors: errors?.c || 0,
        by_action: byAction
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/players
// ─────────────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const { name, nickname, number, photo, height, primary_position, secondary_positions = [], notes = '', attributes = {} } = req.body;
    if (!name || !primary_position) return res.status(400).json({ error: 'name e primary_position são obrigatórios' });

    const defaultAttrs = { attack:5, serve:5, reception:5, block:5, defense:5, setting:5, communication:5, consistency:5, versatility:5, ...attributes };

    const r = run(
      `INSERT INTO players (name, nickname, number, photo, height, primary_position, secondary_positions, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, nickname||null, number||null, photo||null, height||null, primary_position,
       JSON.stringify(secondary_positions), notes, NOW(), NOW()]
    );
    const id = r.lastInsertRowid;

    run(
      `INSERT INTO player_attributes (player_id, attack, serve, reception, block, defense, setting, communication, consistency, versatility, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, defaultAttrs.attack, defaultAttrs.serve, defaultAttrs.reception, defaultAttrs.block,
       defaultAttrs.defense, defaultAttrs.setting, defaultAttrs.communication, defaultAttrs.consistency, defaultAttrs.versatility, NOW()]
    );

    const player = queryOne('SELECT * FROM players WHERE id = ?', [id]);
    res.status(201).json({ ...player, secondary_positions: JSON.parse(player.secondary_positions || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/players/:id
// ─────────────────────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { run, query, queryOne } = getDb();
    const id = req.params.id;
    const { name, nickname, number, photo, height, primary_position, secondary_positions, notes, attributes } = req.body;

    const player = queryOne('SELECT * FROM players WHERE id = ?', [id]);
    if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });

    // Atualizar campos básicos (somente os enviados)
    const updates = [];
    const vals = [];
    if (name !== undefined)       { updates.push('name = ?');       vals.push(name); }
    if (nickname !== undefined)   { updates.push('nickname = ?');   vals.push(nickname); }
    if (number !== undefined)     { updates.push('number = ?');     vals.push(number); }
    if (photo !== undefined)      { updates.push('photo = ?');      vals.push(photo); }
    if (height !== undefined)     { updates.push('height = ?');     vals.push(height); }
    if (primary_position !== undefined) { updates.push('primary_position = ?'); vals.push(primary_position); }
    if (secondary_positions !== undefined) { updates.push('secondary_positions = ?'); vals.push(JSON.stringify(secondary_positions)); }
    if (notes !== undefined)      { updates.push('notes = ?');      vals.push(notes); }
    updates.push('updated_at = ?'); vals.push(NOW());
    vals.push(id);

    if (updates.length > 1) {
      run(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`, vals);
    }

    // Novo snapshot de atributos
    if (attributes) {
      const last = queryOne('SELECT * FROM player_attributes WHERE player_id = ? ORDER BY id DESC LIMIT 1', [id]);
      const merged = { attack:5,serve:5,reception:5,block:5,defense:5,setting:5,communication:5,consistency:5,versatility:5, ...(last||{}), ...attributes };
      run(
        `INSERT INTO player_attributes (player_id, attack, serve, reception, block, defense, setting, communication, consistency, versatility, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, merged.attack, merged.serve, merged.reception, merged.block, merged.defense,
         merged.setting, merged.communication, merged.consistency, merged.versatility, NOW()]
      );
    }

    const updated = queryOne('SELECT * FROM players WHERE id = ?', [id]);
    res.json({ ...updated, secondary_positions: JSON.parse(updated.secondary_positions || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/players/:id
// ─────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const player = queryOne('SELECT * FROM players WHERE id = ?', [req.params.id]);
    if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });
    run('DELETE FROM players WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jogador removido' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
