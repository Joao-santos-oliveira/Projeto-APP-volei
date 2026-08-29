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
    return routeToLocalStore(method, path, body);
  }

  const token = localStorage.getItem('volei_token');
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
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

  // Teams
  if (path === '/teams' && method === 'GET')  return localStore.getTeams();
  if (path === '/teams' && method === 'POST') return localStore.createTeam(body);

  const teamDetail = path.match(/^\/teams\/(\d+)$/);
  if (teamDetail && method === 'GET')    return localStore.getTeam(teamDetail[1]);
  if (teamDetail && method === 'PUT')    return localStore.updateTeam(teamDetail[1], body);
  if (teamDetail && method === 'DELETE') return localStore.deleteTeam(teamDetail[1]);

  const teamAddPlayer = path.match(/^\/teams\/(\d+)\/players$/);
  if (teamAddPlayer && method === 'POST') return localStore.addPlayerToTeam(teamAddPlayer[1], body.player_id);

  const teamRemovePlayer = path.match(/^\/teams\/(\d+)\/players\/(\d+)$/);
  if (teamRemovePlayer && method === 'DELETE') return localStore.removePlayerFromTeam(teamRemovePlayer[1], teamRemovePlayer[2]);

  // Player ratings & observations (modo offline)
  const ratingMatch = path.match(/^\/players\/(\d+)\/rating$/);
  if (ratingMatch && method === 'POST') return localStore.saveRating(ratingMatch[1], body);

  const obsListMatch = path.match(/^\/players\/(\d+)\/observations$/);
  if (obsListMatch && method === 'POST') return localStore.addObservation(obsListMatch[1], body.text);

  const obsDeleteMatch = path.match(/^\/players\/(\d+)\/observations\/(\d+)$/);
  if (obsDeleteMatch && method === 'DELETE') return localStore.deleteObservation(obsDeleteMatch[1], obsDeleteMatch[2]);

  throw new Error(`Rota localStore não implementada: ${method} ${path}`);
}

export const api = {
  // Players
  getPlayers:             ()               => request('GET',    '/players'),
  getPlayer:              (id)             => request('GET',    `/players/${id}`),
  createPlayer:           (data)           => request('POST',   '/players', data),
  updatePlayer:           (id, data)       => request('PUT',    `/players/${id}`, data),
  deletePlayer:           (id)             => request('DELETE', `/players/${id}`),
  saveRating:             (id, data)       => request('POST',   `/players/${id}/rating`, data),
  addObservation:         (id, text)       => request('POST',   `/players/${id}/observations`, { text }),
  deleteObservation:      (pid, obsId)     => request('DELETE', `/players/${pid}/observations/${obsId}`),

  // Matches
  getMatches:             ()               => request('GET',    '/matches'),
  getMatch:               (id)             => request('GET',    `/matches/${id}`),
  createMatch:            (data)           => request('POST',   '/matches', data),
  addPoint:               (id, data)       => request('POST',   `/matches/${id}/point`, data),
  undoPoint:              (id)             => request('DELETE', `/matches/${id}/point`),
  finishMatch:            (id)             => request('PATCH',  `/matches/${id}/finish`),
  deleteMatch:            (id)             => request('DELETE', `/matches/${id}`),

  // Teams
  getTeams:               ()               => request('GET',    '/teams'),
  getTeam:                (id)             => request('GET',    `/teams/${id}`),
  createTeam:             (data)           => request('POST',   '/teams', data),
  updateTeam:             (id, data)       => request('PUT',    `/teams/${id}`, data),
  deleteTeam:             (id)             => request('DELETE', `/teams/${id}`),
  addPlayerToTeam:        (id, player_id)  => request('POST',   `/teams/${id}/players`, { player_id }),
  removePlayerFromTeam:   (id, player_id)  => request('DELETE', `/teams/${id}/players/${player_id}`),

  // Utilitário
  isOfflineMode: () => isBackendAvailable === false,
};
