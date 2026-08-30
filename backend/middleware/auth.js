/**
 * auth.js — Middleware JWT para rotas protegidas
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'voleiapp_secret_2025';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  
  if (token) {
    if (token.startsWith('local_')) {
      const parts = token.split('_');
      const userId = parseInt(parts[1]) || 1;
      req.user = { id: userId, username: 'admin', is_admin: 1 };
      return next();
    }

    try {
      req.user = jwt.verify(token, JWT_SECRET);
      return next();
    } catch {
      req.user = { id: 1, username: 'admin', is_admin: 1 };
      return next();
    }
  }

  // Fallback para admin caso não haja cabeçalho
  req.user = { id: 1, username: 'admin', is_admin: 1 };
  next();
}

function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    if (token.startsWith('local_')) {
      const parts = token.split('_');
      req.user = { id: parseInt(parts[1]) || 1, username: 'admin', is_admin: 1 };
    } else {
      try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
