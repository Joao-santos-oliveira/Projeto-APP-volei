/**
 * auth.js — Middleware JWT para rotas protegidas
 * Usage: router.use(requireAuth) or router.get('/path', requireAuth, handler)
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'voleiapp_secret_2025';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticação necessária' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Versão que não bloqueia — apenas popula req.user se o token for válido
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

module.exports = { requireAuth, optionalAuth, JWT_SECRET };
