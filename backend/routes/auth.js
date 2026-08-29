const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', (req, res) => {
  try {
    const { run, queryOne } = getDb();
    const { username, display_name, password, avatar_color = '#3b82f6' } = req.body;

    if (!username || !display_name || !password) {
      return res.status(400).json({ error: 'username, display_name e password são obrigatórios' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres' });
    }

    const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Nome de usuário já existe' });

    const hash = bcrypt.hashSync(password, 10);
    const r    = run(
      `INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?)`,
      [username.trim().toLowerCase(), display_name.trim(), hash, avatar_color]
    );

    const user = queryOne('SELECT id, username, display_name, avatar_color, is_admin, created_at FROM users WHERE id = ?', [r.lastInsertRowid]);
    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', (req, res) => {
  try {
    const { queryOne } = getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username e password são obrigatórios' });
    }

    const cleanUser = username.trim().toLowerCase();
    const user = queryOne(
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
router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
  try {
    const { queryOne } = getDb();
    const user = queryOne(
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
// ─────────────────────────────────────────────
router.post('/reset-password', (req, res) => {
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
    const user = queryOne(
      'SELECT id, username, display_name, avatar_color, is_admin FROM users WHERE LOWER(username) = ? OR LOWER(display_name) = ?',
      [cleanUser, cleanUser]
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const hash = bcrypt.hashSync(new_password.trim(), 10);
    run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

    const token = jwt.sign({ id: user.id, username: user.username, is_admin: user.is_admin }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Senha atualizada com sucesso', token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
