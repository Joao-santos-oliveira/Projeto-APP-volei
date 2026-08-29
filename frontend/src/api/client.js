/**
 * client.js - API client híbrido com fallback automático
 * Se VITE_API_URL ou backend local estiver ativo, usa o backend SQLite.
 * Se estiver rodando estático (GitHub Pages, Vercel ou offline), usa o localStore (localStorage).
 */
import { localStore } from './localStore';

// Permite definir backend via env ou usar o padrão local
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Flag de controle para saber se o backend está acessível
let isBackendAvailable = null;

async function checkBackend() {
  if (isBackendAvailable !== null) return isBackendAvailable;
  
  // Se estiver explicitamente em modo standalone/client-only
  if (import.meta.env.VITE_STANDALONE === 'true') {
    isBackendAvailable = false;
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200); // 1.2s timeout
    const res = await fetch(`${API_URL.replace(/\/players|\/matches/, '')}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    isBackendAvailable = res.ok;
  } catch {
    isBackendAvailable = false;
  }
  return isBackendAvailable;
}

async function request(method, path, body) {
  const hasBackend = await checkBackend();

  if (!hasBackend) {
    // Roteia para o localStore correspondente
    return routeToLocalStore(method, path, body);
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro na requisição');
    return data;
  } catch (err) {
    console.warn(`[API] Falha ao comunicar com backend (${path}), alternando para modo local...`, err);
    isBackendAvailable = false;
    return routeToLocalStore(method, path, body);
  }
}

// Router que mapeia chamadas REST para os métodos do localStore
async function routeToLocalStore(method, path, body) {
  // Players
  if (path === '/players' && method === 'GET') return localStore.getPlayers();
  if (path === '/players' && method === 'POST') return localStore.createPlayer(body);
  
  const playerMatch = path.match(/^\/players\/(\d+)$/);
  if (playerMatch && method === 'GET') return localStore.getPlayer(playerMatch[1]);
  if (playerMatch && method === 'PUT') return localStore.updatePlayer(playerMatch[1], body);
  if (playerMatch && method === 'DELETE') return localStore.deletePlayer(playerMatch[1]);

  // Matches
  if (path === '/matches' && method === 'GET') return localStore.getMatches();
  if (path === '/matches' && method === 'POST') return localStore.createMatch(body);

  const matchDetail = path.match(/^\/matches\/(\d+)$/);
  if (matchDetail && method === 'GET') return localStore.getMatch(matchDetail[1]);
  if (matchDetail && method === 'DELETE') return localStore.deleteMatch(matchDetail[1]);

  const matchPoint = path.match(/^\/matches\/(\d+)\/point$/);
  if (matchPoint && method === 'POST') return localStore.addPoint(matchPoint[1], body);
  if (matchPoint && method === 'DELETE') return localStore.undoPoint(matchPoint[1]);

  const matchFinish = path.match(/^\/matches\/(\d+)\/finish$/);
  if (matchFinish && method === 'PATCH') return localStore.finishMatch(matchFinish[1]);

  throw new Error(`Rota localStore não implementada: ${method} ${path}`);
}

export const api = {
  // Players
  getPlayers:    ()           => request('GET',    '/players'),
  getPlayer:     (id)         => request('GET',    `/players/${id}`),
  createPlayer:  (data)       => request('POST',   '/players', data),
  updatePlayer:  (id, data)   => request('PUT',    `/players/${id}`, data),
  deletePlayer:  (id)         => request('DELETE', `/players/${id}`),

  // Matches
  getMatches:    ()           => request('GET',    '/matches'),
  getMatch:      (id)         => request('GET',    `/matches/${id}`),
  createMatch:   (data)       => request('POST',   '/matches', data),
  addPoint:      (id, data)   => request('POST',   `/matches/${id}/point`, data),
  undoPoint:     (id)         => request('DELETE', `/matches/${id}/point`),
  finishMatch:   (id)         => request('PATCH',  `/matches/${id}/finish`),
  deleteMatch:   (id)         => request('DELETE', `/matches/${id}`),
  
  // Utilitário para verificar status
  isOfflineMode: ()           => isBackendAvailable === false,
};
