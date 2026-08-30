/**
 * auth.js — Middleware JWT para rotas protegidas
 */
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'voleiapp_secret_2025';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET não definido em variáveis de ambiente — usando valor padrão inseguro. Defina JWT_SECRET no Render.');
}

// Exige um token JWT válido. Sem token válido, a requisição é rejeitada (401).
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'Não autenticado. Faça login novamente.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

// Só passa adiante se o usuário autenticado for admin.
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}

// Preenche req.user quando há token válido, mas não bloqueia a requisição sem token.
function optionalAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth, JWT_SECRET };
