// Posições oficiais de Voleibol
export const POSITIONS = ['Levantador', 'Oposto', 'Ponteiro', 'Central', 'Líbero'];

// Atributos técnicos principais (escala 0 a 10)
export const TECHNICAL_ATTRS = [
  { key: 'attack',    label: 'Ataque',        abbr: 'ATQ' },
  { key: 'serve',     label: 'Saque',         abbr: 'SAQ' },
  { key: 'reception', label: 'Recepção',      abbr: 'REC' },
  { key: 'block',     label: 'Bloqueio',      abbr: 'BLO' },
  { key: 'defense',   label: 'Defesa',        abbr: 'DEF' },
  { key: 'setting',   label: 'Levantamento',  abbr: 'LEV' },
];

// Atributos complementares e táticos
export const COMPLEMENTARY_ATTRS = [
  { key: 'communication', label: 'Comunicação',   abbr: 'COM' },
  { key: 'consistency',   label: 'Consistência',  abbr: 'CON' },
  { key: 'versatility',   label: 'Versatilidade', abbr: 'VER' },
];

export const ALL_ATTRS = [...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS];

// Pesos táticos por posição para cálculo de proficiência (0 a 5)
export const POSITION_WEIGHTS = {
  'Central': {
    block: 0.35,
    attack: 0.35,
    serve: 0.15,
    consistency: 0.15,
  },
  'Levantador': {
    setting: 0.40,
    communication: 0.20,
    defense: 0.15,
    serve: 0.15,
    versatility: 0.10,
  },
  'Ponteiro': {
    attack: 0.30,
    reception: 0.30,
    serve: 0.15,
    defense: 0.15,
    block: 0.10,
  },
  'Oposto': {
    attack: 0.40,
    block: 0.25,
    serve: 0.20,
    consistency: 0.15,
  },
  'Líbero': {
    reception: 0.40,
    defense: 0.35,
    communication: 0.15,
    consistency: 0.10,
  },
};

/**
 * Calcula a proficiência de um conjunto de atributos para uma posição específica (0.0 a 5.0).
 */
export function calculatePositionProficiency(attrs = {}, position = 'Ponteiro') {
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS['Ponteiro'];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const val = typeof attrs[key] === 'number' ? attrs[key] : (attrs[key] ? parseFloat(attrs[key]) : 5);
    weightedSum += val * weight;
    totalWeight += weight;
  }

  const rawScore10 = totalWeight > 0 ? weightedSum / totalWeight : 5;
  // Converte escala 0-10 para 0.0-5.0
  const score5 = Math.min(5, Math.max(0, parseFloat((rawScore10 / 2).toFixed(1))));

  let tier = 'Iniciante';
  let tierColor = '#94A3B8';
  if (score5 >= 4.5) { tier = 'Elite'; tierColor = '#10B981'; }
  else if (score5 >= 3.8) { tier = 'Avançado'; tierColor = '#3B82F6'; }
  else if (score5 >= 3.0) { tier = 'Competente'; tierColor = '#F59E0B'; }
  else if (score5 >= 2.0) { tier = 'Em Desenvolvimento'; tierColor = '#F97316'; }
  else { tier = 'Base'; tierColor = '#EF4444'; }

  return {
    position,
    score: score5,
    scorePercent: (score5 / 5) * 100,
    tier,
    tierColor
  };
}

/**
 * Retorna as proficiências de todas as posições que o jogador desempenha (primária + secundárias).
 */
export function getPlayerProficiencies(player) {
  if (!player) return [];
  const list = [];
  const attrs = player.attributes || {};

  if (player.primary_position) {
    list.push({
      ...calculatePositionProficiency(attrs, player.primary_position),
      isPrimary: true
    });
  }

  const secondaries = Array.isArray(player.secondary_positions) ? player.secondary_positions : [];
  for (const sec of secondaries) {
    if (sec && sec !== player.primary_position) {
      list.push({
        ...calculatePositionProficiency(attrs, sec),
        isPrimary: false
      });
    }
  }

  return list;
}

// Ações táticas de partida
export const POINT_ACTIONS = [
  { key: 'attack_point',    label: 'Ataque (Ponto)',      type: 'point', code: 'ATQ+' },
  { key: 'attack_error',    label: 'Ataque (Erro)',       type: 'error', code: 'ATQ-' },
  { key: 'serve_ace',       label: 'Saque (Ace)',         type: 'point', code: 'SAQ+' },
  { key: 'serve_error',     label: 'Saque (Erro)',        type: 'error', code: 'SAQ-' },
  { key: 'block_point',     label: 'Bloqueio (Ponto)',    type: 'point', code: 'BLO+' },
  { key: 'block_error',     label: 'Bloqueio (Erro)',     type: 'error', code: 'BLO-' },
  { key: 'reception_error', label: 'Recepção (Erro)',     type: 'error', code: 'REC-' },
  { key: 'setting_error',   label: 'Levantamento (Erro)', type: 'error', code: 'LEV-' },
  { key: 'fault',           label: 'Falta Tática',        type: 'error', code: 'FLT'  },
  { key: 'opponent_error',  label: 'Erro Adversário',     type: 'point', code: 'ADV-' },
];

// Helper: badge class por posição
export function positionBadgeClass(pos) {
  const map = {
    'Levantador': 'badge-levantador',
    'Oposto':     'badge-oposto',
    'Ponteiro':   'badge-ponteiro',
    'Central':    'badge-central',
    'Líbero':     'badge-libero',
  };
  return `badge ${map[pos] || 'badge-default'}`;
}

// Helper: iniciais do nome
export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// Helper: cor do atributo (0-10)
export function attrColor(val) {
  if (val >= 8) return '#10B981';
  if (val >= 6) return '#F59E0B';
  if (val >= 4) return '#F97316';
  return '#EF4444';
}

// Helper: formatar data
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Helper: calcular média dos atributos técnicos
export function avgTechnical(attrs = {}) {
  const keys = TECHNICAL_ATTRS.map(a => a.key);
  const vals = keys.map(k => typeof attrs[k] === 'number' ? attrs[k] : (attrs[k] ? parseFloat(attrs[k]) : 5));
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}
