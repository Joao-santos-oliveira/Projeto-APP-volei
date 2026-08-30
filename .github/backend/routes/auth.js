const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../database');
const { JWT_SECRET, requireAuth, requireAdmin } = require('../middleware/auth');

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const { username, display_name, password, avatar_color = '#3b82f6' } = req.body;

    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'username, display_name e password são obrigatórios' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres' });
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanName = display_name.trim();

    const existing = await queryOne('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUser]);
    if (existing) return res.status(409).json({ error: 'Nome de usuário já existe' });

    const hash = bcrypt.hashSync(password.trim(), 10);
    const r    = await run(
      `INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?) RETURNING id`,
      [cleanUser, cleanName, hash, avatar_color]
    );

    const user = await queryOne('SELECT id, username, display_name, avatar_color, is_admin, created_at FROM users WHERE id = ?', [r.lastInsertRowid]);
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { queryOne } = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username e password são obrigatórios' });
    }

    const cleanUser = username.trim().toLowerCase();
    const user = await queryOne(
      'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(display_name) = ?',
      [cleanUser, cleanUser]
    );
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const valid = bcrypt.compareSync(password.trim(), user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta para este usuário' });

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { queryOne } = getDb();
    const user = await queryOne(
      'SELECT id, username, display_name, avatar_color, is_admin, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// Fluxo de "esqueci minha senha" (usado na tela de login, antes de autenticar).
// Mantido público como no original — ver aviso de segurança no README sobre isso.
// ─────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const { username, new_password } = req.body;

    if (!username || !new_password) {
      return res.status(400).json({ error: 'username e new_password são obrigatórios' });
    }
    if (new_password.length < 4) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 4 caracteres' });
    }

    const cleanUser = username.trim().toLowerCase();
    const user = await queryOne(
      'SELECT id, username, display_name, avatar_color, is_admin FROM users WHERE LOWER(username) = ? OR LOWER(display_name) = ?',
      [cleanUser, cleanUser]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const hash = bcrypt.hashSync(new_password.trim(), 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Senha atualizada com sucesso', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/users — apenas admin
// Lista todas as contas + quantas cartas/times/partidas cada uma criou
// ─────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { query } = getDb();
    const users = await query(`
      SELECT u.id, u.username, u.display_name, u.avatar_color, u.is_admin, u.created_at,
             (SELECT COUNT(*) FROM players WHERE created_by = u.id) AS players_created,
             (SELECT COUNT(*) FROM teams   WHERE created_by = u.id) AS teams_created,
             (SELECT COUNT(*) FROM matches WHERE created_by = u.id) AS matches_created
      FROM users u
      ORDER BY u.created_at ASC
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/auth/users/:id — apenas admin
// ─────────────────────────────────────────────
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.username.toLowerCase() === 'admin') {
      return res.status(400).json({ error: 'Não é permitido excluir o administrador principal' });
    }

    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Usuário removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/wipe-users — apenas admin
// ─────────────────────────────────────────────
router.post('/wipe-users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { run } = getDb();
    await run("DELETE FROM users WHERE LOWER(username) != 'admin'");
    res.json({ success: true, message: 'Todos os usuários extras foram excluídos com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
