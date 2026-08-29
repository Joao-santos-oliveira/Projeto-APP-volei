// Posições disponíveis
export const POSITIONS = ['Levantador', 'Oposto', 'Ponteiro', 'Central', 'Líbero'];

// Atributos técnicos
export const TECHNICAL_ATTRS = [
  { key: 'attack',    label: 'Ataque' },
  { key: 'serve',     label: 'Saque' },
  { key: 'reception', label: 'Recepção' },
  { key: 'block',     label: 'Bloqueio' },
  { key: 'defense',   label: 'Defesa' },
  { key: 'setting',   label: 'Levantamento' },
];

// Atributos complementares
export const COMPLEMENTARY_ATTRS = [
  { key: 'communication', label: 'Comunicação' },
  { key: 'consistency',   label: 'Consistência' },
  { key: 'versatility',   label: 'Versatilidade' },
];

export const ALL_ATTRS = [...TECHNICAL_ATTRS, ...COMPLEMENTARY_ATTRS];

// Ações de ponto no jogo
export const POINT_ACTIONS = [
  { key: 'attack_point',   label: 'Ataque (Ponto)',         type: 'point', icon: '💥' },
  { key: 'attack_error',   label: 'Ataque (Erro)',          type: 'error', icon: '❌' },
  { key: 'serve_ace',      label: 'Saque (Ace)',            type: 'point', icon: '🎯' },
  { key: 'serve_error',    label: 'Saque (Erro)',           type: 'error', icon: '❌' },
  { key: 'block_point',    label: 'Bloqueio (Ponto)',       type: 'point', icon: '🛡️' },
  { key: 'block_error',    label: 'Bloqueio (Erro)',        type: 'error', icon: '❌' },
  { key: 'reception_error',label: 'Recepção (Erro)',        type: 'error', icon: '❌' },
  { key: 'setting_error',  label: 'Levantamento (Erro)',    type: 'error', icon: '❌' },
  { key: 'fault',          label: 'Falta',                  type: 'error', icon: '⚠️' },
  { key: 'opponent_error', label: 'Erro do Adversário',     type: 'point', icon: '🎁' },
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
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// Helper: cor do atributo (0-10)
export function attrColor(val) {
  if (val >= 8) return '#22c55e';
  if (val >= 6) return '#f5c518';
  if (val >= 4) return '#f97316';
  return '#ef4444';
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
  const vals = keys.map(k => attrs[k] ?? 5);
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}
