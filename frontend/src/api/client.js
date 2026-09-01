/**
 * client.js - API client híbrido com fallback automático
 * Se VITE_API_URL ou backend local estiver ativo, usa o backend SQLite.
 * Se estiver rodando estático (GitHub Pages, Vercel ou offline), usa o localStore (localStorage).
 */
import { localStore } from './localStore';

const PROD_API_URL = 'https://projeto-app-volei.onrender.com/api';
const LOCAL_API_URL = 'http://localhost:3001/api';

// Conecta automaticamente ao Render na nuvem (ou localhost em ambiente de dev local)
const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? LOCAL_API_URL
    : PROD_API_URL
);

// Flag de controle para saber se o backend está acessível
let isBackendAvailable = null;
let lastCheckAt = 0;
const RECHECK_INTERVAL_MS = 15000; // depois de marcar como indisponível, tenta de novo a cada 15s

async function pingHealth(timeoutMs) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

async function checkBackend() {
  if (import.meta.env.VITE_STANDALONE === 'true') return false;

  // Se já sabemos que está disponível, confia (evita checar a cada request).
  if (isBackendAvailable === true) return true;

  // Se marcamos como indisponível recentemente, só tenta de novo depois do intervalo
  // (em vez de ficar travado no modo offline até a página ser recarregada).
  const now = Date.now();
  if (isBackendAvailable === false && (now - lastCheckAt) < RECHECK_INTERVAL_MS) {
    return false;
  }
  lastCheckAt = now;

  // Primeira tentativa: timeout curto. Se falhar, dá mais tempo (Render free
  // pode levar 30-50s pra "acordar" um serviço que estava inativo).
  let ok = await pingHealth(4000);
  if (!ok) ok = await pingHealth(45000);

  isBackendAvailable = ok;
  return ok;
}

async function request(method, path, body) {
  const hasBackend = await checkBackend();

  if (!hasBackend) {
    return routeToLocalStore(method, path, body);
  }

  const token = localStorage.getItem('volei_token');
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    // Falha real de conectividade (fetch nem completou) — aí sim é modo offline de verdade.
    console.warn(`[API] Backend inacessível (${path}), alternando para modo local...`, networkErr);
    isBackendAvailable = false;
    return routeToLocalStore(method, path, body);
  }

  let data = null;
  try { data = await res.json(); } catch { /* resposta sem corpo JSON */ }

  if (!res.ok) {
    // O backend respondeu (está no ar) — o erro é da aplicação (ex: sessão expirada,
    // validação, permissão). NÃO cai pro modo local mascarando como se tivesse salvo:
    // propaga o erro de verdade pra tela poder avisar o usuário.
    const err = new Error(data?.error || `Erro ${res.status} na requisição`);
    err.status = res.status;
    if (res.status === 401) {
      err.isAuthError = true;
      localStorage.removeItem('volei_token');
    }
    throw err;
  }

  // Sincroniza mutações (POST, PUT, DELETE, PATCH) no armazenamento local do dispositivo
  if (method !== 'GET') {
    try {
      await routeToLocalStore(method, path, body || data);
    } catch (syncErr) {
      console.warn('[API Sync] Falha ao sincronizar localmente:', syncErr);
    }
  }

  return data;
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

  const matchVote = path.match(/^\/matches\/(\d+)\/vote$/);
  if (matchVote && method === 'POST') return localStore.voteMatch(matchVote[1], body.player_id);

  const matchVotes = path.match(/^\/matches\/(\d+)\/votes$/);
  if (matchVotes && method === 'GET') return localStore.getMatchVotes(matchVotes[1]);

  // Teams
  if (path === '/teams' && method === 'GET') return localStore.getTeams();
  if (path === '/teams' && method === 'POST') return localStore.createTeam(body);

  const teamDetail = path.match(/^\/teams\/(\d+)$/);
  if (teamDetail && method === 'GET') return localStore.getTeam(teamDetail[1]);
  if (teamDetail && method === 'PUT') return localStore.updateTeam(teamDetail[1], body);
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

  // Users Management (Admin)
  if (path === '/auth/users' && method === 'GET') return localStore.getUsers();
  const userDeleteMatch = path.match(/^\/auth\/users\/(\d+)$/);
  if (userDeleteMatch && method === 'DELETE') return localStore.deleteUser(userDeleteMatch[1]);
  if (path === '/auth/wipe-users' && method === 'POST') return localStore.wipeUsers();

  throw new Error(`Rota localStore não implementada: ${method} ${path}`);
}

// Guarda uma cópia em cache no localStorage sem nunca derrubar os dados reais
// que vieram do servidor caso o cache falhe (ex: QuotaExceededError - "sem espaço").
function safeCacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[API Cache] Não foi possível guardar cache local de "${key}" (provavelmente localStorage cheio):`, e);
  }
}

export const api = {
  // Players
  getPlayers: async () => {
    try {
      const remote = await request('GET', '/players');
      if (Array.isArray(remote)) {
        safeCacheSet('volei_app_players', remote);
        return remote;
      }
    } catch (e) {
      console.warn('[API] Erro ao buscar jogadores remotos, usando cache local:', e);
    }
    return localStore.getPlayers();
  },
  getPlayer: (id) => request('GET', `/players/${id}`),
  createPlayer: (data) => request('POST', '/players', data),
  updatePlayer: (id, data) => request('PUT', `/players/${id}`, data),
  deletePlayer: (id) => request('DELETE', `/players/${id}`),
  saveRating: (id, data) => request('POST', `/players/${id}/rating`, data),
  addObservation: (id, text) => request('POST', `/players/${id}/observations`, { text }),
  deleteObservation: (pid, obsId) => request('DELETE', `/players/${pid}/observations/${obsId}`),

  // Matches
  getMatches: async () => {
    try {
      const remote = await request('GET', '/matches');
      if (Array.isArray(remote)) {
        safeCacheSet('volei_app_matches', remote);
        return remote;
      }
    } catch (e) {
      console.warn('[API] Erro ao buscar partidas remotas, usando cache local:', e);
    }
    return localStore.getMatches();
  },
  getMatch: (id) => request('GET', `/matches/${id}`),
  createMatch: (data) => request('POST', '/matches', data),
  addPoint: (id, data) => request('POST', `/matches/${id}/point`, data),
  undoPoint: (id) => request('DELETE', `/matches/${id}/point`),
  finishMatch: (id) => request('PATCH', `/matches/${id}/finish`),
  deleteMatch: (id) => request('DELETE', `/matches/${id}`),
  voteMatch: (id, player_id) => request('POST', `/matches/${id}/vote`, { player_id }),
  getMatchVotes: (id) => request('GET', `/matches/${id}/votes`),

  // Teams
  getTeams: async () => {
    try {
      const remote = await request('GET', '/teams');
      if (Array.isArray(remote)) {
        safeCacheSet('volei_app_teams', remote);
        return remote;
      }
    } catch (e) {
      console.warn('[API] Erro ao buscar equipes remotas, usando cache local:', e);
    }
    return localStore.getTeams();
  },
  getTeam: (id) => request('GET', `/teams/${id}`),
  createTeam: (data) => request('POST', '/teams', data),
  updateTeam: (id, data) => request('PUT', `/teams/${id}`, data),
  deleteTeam: (id) => request('DELETE', `/teams/${id}`),
  addPlayerToTeam: (id, player_id) => request('POST', `/teams/${id}/players`, { player_id }),
  removePlayerFromTeam: (id, player_id) => request('DELETE', `/teams/${id}/players/${player_id}`),

  // Users Management (Admin)
  getUsers: () => request('GET', '/auth/users'),
  deleteUser: (id) => request('DELETE', `/auth/users/${id}`),
  wipeUsers: () => request('POST', '/auth/wipe-users'),

  // Utilitário
  isOfflineMode: () => isBackendAvailable === false,
};