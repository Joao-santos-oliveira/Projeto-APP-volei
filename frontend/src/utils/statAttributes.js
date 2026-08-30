/**
 * statAttributes.js
 * Sistema dinâmico e posicional de atributos estatísticos.
 * 
 * Evita a homogeneização onde todos os atletas terminam com a mesma nota (ex: notas 90+ em LEV
 * para quem nunca levantou apenas por ter 0 erros).
 * 
 * Pilares do cálculo:
 * 1. Âncora Técnica Individual: Cada atributo parte do perfil do jogador (player.attributes, escala 1-10 -> 10-99).
 * 2. Modulação por Desempenho Real (Scouts da partida):
 *    - Ações diretas (Ataques, Bloqueios, Aces, Erros) geram bônus ou penalidades dinâmicas proporcionais ao volume e eficiência.
 *    - Atributos não executados (ex: LEV para centrais/opostos, ATQ para líberos) mantêm o perfil individual do atleta sem gerar notas genéricas infladas.
 * 3. Correlações Posicionais Específicas:
 *    - Levantadores: LEV é amplamente calibrado pela conversão dos ataques da equipe e volume de distribuição.
 *    - Líberos: DEF é calibrado pelo volume de partidas e estabilidade de passe.
 * 4. OVR Ponderado por Posição: Reflete as prioridades táticas reais de cada função no vôlei.
 */

export function calculateStatAttributes(player) {
  const stats = player?.game_stats || {};
  const totalActions = stats.total_actions || 0;
  const pointsMade = stats.points_made || 0;
  const errors = stats.errors || 0;
  const byAction = stats.by_action || [];

  const matchesPlayed = stats.matches_played || 0;
  const teamAttackPoints = stats.team_attack_points || 0;
  const teamAttackErrors = stats.team_attack_errors || 0;
  const teamPointsTotal = stats.team_points_total || 0;

  const counts = {
    attack_point: 0,
    attack_error: 0,
    serve_ace: 0,
    serve_error: 0,
    block_point: 0,
    block_error: 0,
    reception_error: 0,
    setting_error: 0,
    fault: 0,
    opponent_error: 0
  };

  byAction.forEach(item => {
    if (counts[item.action] !== undefined) {
      counts[item.action] += Number(item.count) || Number(item.value) || 0;
    }
  });

  const pos = player?.primary_position || 'Ponteiro';
  const isSetter = pos === 'Levantador';
  const isLibero = pos === 'Líbero';
  const hasGameData = totalActions > 0 || matchesPlayed > 0 || teamAttackPoints > 0;

  // ── 1. Âncora Base Técnica (Perfil do Atleta ou Default Ponderado por Posição) ──
  const rawAttrs = player?.attributes || {};
  const defaultByPos = {
    'Levantador': { attack: 45, serve: 60, reception: 55, block: 45, defense: 65, setting: 75, communication: 70 },
    'Líbero':     { attack: 25, serve: 55, reception: 78, block: 20, defense: 80, setting: 60, communication: 65 },
    'Central':    { attack: 72, serve: 58, reception: 40, block: 78, defense: 45, setting: 35, communication: 50 },
    'Oposto':     { attack: 80, serve: 70, reception: 45, block: 65, defense: 50, setting: 35, communication: 55 },
    'Ponteiro':   { attack: 72, serve: 65, reception: 70, block: 60, defense: 68, setting: 45, communication: 60 },
  };
  const defaults = defaultByPos[pos] || defaultByPos['Ponteiro'];

  const getBaseVal = (key, fallback) => {
    const val = rawAttrs[key];
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      return Math.min(99, Math.max(10, Math.round(val * 10)));
    }
    return fallback;
  };

  const baseAttack    = getBaseVal('attack', defaults.attack);
  const baseServe     = getBaseVal('serve', defaults.serve);
  const baseReception = getBaseVal('reception', defaults.reception);
  const baseBlock     = getBaseVal('block', defaults.block);
  const baseDefense   = getBaseVal('defense', defaults.defense);
  const baseSetting   = getBaseVal('setting', defaults.setting);

  // ── 2. Ataque (ATQ) ──
  const attackTotal = counts.attack_point + counts.attack_error;
  let attackScore = baseAttack;
  let attackEfficiency = 0;
  if (attackTotal > 0) {
    attackEfficiency = ((counts.attack_point - counts.attack_error) / attackTotal) * 100;
    const killRate = counts.attack_point / attackTotal;
    const volBonus = Math.min(12, counts.attack_point * 1.5);
    attackScore = Math.round((baseAttack * 0.4) + (killRate * 38) + (attackEfficiency * 0.12) + volBonus);
  } else if (isLibero) {
    attackScore = Math.min(40, baseAttack);
  }
  attackScore = Math.min(99, Math.max(10, attackScore));

  // ── 3. Saque (SAQ) ──
  const serveTotal = counts.serve_ace + counts.serve_error;
  let serveScore = baseServe;
  let serveEfficiency = 0;
  if (serveTotal > 0) {
    serveEfficiency = ((counts.serve_ace - counts.serve_error) / serveTotal) * 100;
    const aceRatio = counts.serve_ace / serveTotal;
    const aceBonus = Math.min(15, counts.serve_ace * 3.5);
    const errPenalty = counts.serve_error * 3;
    serveScore = Math.round((baseServe * 0.5) + (aceRatio * 35) + aceBonus - errPenalty);
  } else if (totalActions > 0 && !isLibero) {
    // Jogou mas não teve aces nem erros registrados no saque
    serveScore = Math.round(baseServe * 0.95);
  }
  serveScore = Math.min(99, Math.max(10, serveScore));

  // ── 4. Bloqueio (BLO) ──
  const blockTotal = counts.block_point + counts.block_error;
  let blockScore = baseBlock;
  let blockEfficiency = 0;
  if (blockTotal > 0) {
    blockEfficiency = ((counts.block_point - counts.block_error) / blockTotal) * 100;
    const blockRatio = counts.block_point / blockTotal;
    const blockBonus = Math.min(16, counts.block_point * 3.5);
    const errPenalty = counts.block_error * 3.5;
    blockScore = Math.round((baseBlock * 0.45) + (blockRatio * 35) + blockBonus - errPenalty);
  } else if (isLibero) {
    blockScore = Math.min(30, baseBlock);
  }
  blockScore = Math.min(99, Math.max(10, blockScore));

  // ── 5. Recepção / Defesa (DEF) ──
  let defScore = baseDefense;
  const passErrors = counts.reception_error;
  if (isLibero) {
    const libVolume = Math.max(totalActions, matchesPlayed * 10, teamPointsTotal * 0.3);
    const volBonus = Math.min(18, (matchesPlayed * 3) + (libVolume * 0.12));
    const errPenalty = passErrors * 7;
    defScore = Math.round((baseDefense * 0.45) + 30 + volBonus - errPenalty);
  } else {
    // Não-líbero: reflete o perfil individual e penaliza erros cometidos
    if (passErrors > 0) {
      defScore = Math.round(baseDefense - (passErrors * 6));
    } else if (totalActions > 5 && (pos === 'Ponteiro' || pos === 'Central')) {
      const bonus = Math.min(6, totalActions * 0.15);
      defScore = Math.round(baseDefense + bonus);
    }
  }
  defScore = Math.min(99, Math.max(10, defScore));

  // ── 6. Levantamento (LEV) ──
  let levScore = baseSetting;
  const settingErrors = counts.setting_error;

  if (isSetter) {
    const teamAttackTotal = teamAttackPoints + teamAttackErrors;
    const teamKillRate = teamAttackTotal > 0 ? (teamAttackPoints / teamAttackTotal) : 0.5;
    const distribBonus = Math.min(18, (teamAttackPoints * 1.2) + (matchesPlayed * 2));
    const errPenalty = settingErrors * 7;
    levScore = Math.round((baseSetting * 0.35) + 20 + (teamKillRate * 25) + distribBonus - errPenalty);
  } else {
    // Para NÃO-LEVANTADORES:
    // Mantém a nota ancorada no atributo técnico real (baseSetting).
    // Se cometer erro de levantamento, sofre penalidade; se não levantou, NÃO ganha 90+ artificial!
    if (settingErrors > 0) {
      levScore = Math.round(baseSetting - (settingErrors * 7));
    } else {
      const secondaries = Array.isArray(player?.secondary_positions) ? player.secondary_positions : [];
      if (secondaries.includes('Levantador') && teamAttackPoints > 0) {
        levScore = Math.round(baseSetting + Math.min(6, teamAttackPoints * 0.3));
      }
    }
  }
  levScore = Math.min(99, Math.max(10, levScore));

  // ── 7. Disciplina & Saldo (DIS) ──
  const plusMinus = pointsMade - errors;
  let disScore = 60;
  if (totalActions > 0) {
    const faultPenalty = counts.fault * 4;
    const netInfluence = Math.min(25, Math.max(-25, plusMinus * 2.5));
    disScore = Math.round(65 + netInfluence - faultPenalty);
  } else if (matchesPlayed > 0) {
    disScore = Math.round(62 + Math.min(8, matchesPlayed * 2) - (counts.fault * 4));
  }
  disScore = Math.min(99, Math.max(10, disScore));

  // ── 8. Overall OVR (Ponderado por Posição) ──
  let ovr = 60;
  if (pos === 'Central') {
    ovr = Math.round(blockScore * 0.38 + attackScore * 0.32 + serveScore * 0.15 + disScore * 0.15);
  } else if (pos === 'Levantador') {
    ovr = Math.round(levScore * 0.42 + defScore * 0.20 + serveScore * 0.18 + disScore * 0.20);
  } else if (pos === 'Oposto') {
    ovr = Math.round(attackScore * 0.42 + blockScore * 0.22 + serveScore * 0.20 + disScore * 0.16);
  } else if (pos === 'Líbero') {
    ovr = Math.round(defScore * 0.52 + levScore * 0.20 + disScore * 0.28);
  } else {
    // Ponteiro
    ovr = Math.round(attackScore * 0.32 + defScore * 0.28 + serveScore * 0.16 + blockScore * 0.12 + disScore * 0.12);
  }

  ovr = Math.min(99, Math.max(10, ovr));

  // Título e Selos de Destaque por mérito estatístico
  const badges = [];
  if (isSetter && teamAttackPoints >= 5 && counts.setting_error <= 1) {
    badges.push({ label: 'Regente do Ataque', color: '#3B82F6', desc: `${teamAttackPoints} pts de ataque gerados` });
  }
  if (isLibero && matchesPlayed >= 1 && counts.reception_error === 0) {
    badges.push({ label: 'Guardião do Passe', color: '#10B981', desc: `${matchesPlayed} jogos sem erros de recepção` });
  }
  if (counts.attack_point >= 5 && attackEfficiency >= 30) {
    badges.push({ label: 'Artilheiro Eficaz', color: '#EF4444', desc: `${counts.attack_point} pts de ataque` });
  }
  if (counts.serve_ace >= 3) {
    badges.push({ label: 'Mestre do Ace', color: '#F59E0B', desc: `${counts.serve_ace} aces de saque` });
  }
  if (counts.block_point >= 3) {
    badges.push({ label: 'Muralha Defensiva', color: '#10B981', desc: `${counts.block_point} blocks convertidos` });
  }
  if ((totalActions >= 10 || (isLibero && matchesPlayed >= 1)) && counts.reception_error === 0) {
    badges.push({ label: 'Recepção Blindada', color: '#3B82F6', desc: '0 erros de recepção' });
  }
  if (plusMinus >= 5) {
    badges.push({ label: 'Impacto Líquido +', color: '#8B5CF6', desc: `+${plusMinus} saldo de pontos` });
  }
  if (badges.length === 0) {
    const actLabel = matchesPlayed > 0 ? `${matchesPlayed} jogos em quadra` : `${totalActions} ações registradas`;
    badges.push({ label: 'Em Atividade', color: '#94A3B8', desc: actLabel });
  }

  // Tier do Atleta
  let tierName = 'Base';
  let tierColor = '#94A3B8';
  if (ovr >= 90) { tierName = 'Lendário'; tierColor = '#E5A93C'; }
  else if (ovr >= 80) { tierName = 'Elite Pro'; tierColor = '#10B981'; }
  else if (ovr >= 70) { tierName = 'Titular Consolidado'; tierColor = '#3B82F6'; }
  else if (ovr >= 60) { tierName = 'Regular'; tierColor = '#F59E0B'; }
  else { tierName = 'Em Evolução'; tierColor = '#EF4444'; }

  // Meta descritiva para a visualização dos cards
  const levMetaDesc = isSetter && teamAttackPoints > 0
    ? `${teamAttackPoints} ataques gerados pela equipe · ${counts.setting_error} erros`
    : `${counts.setting_error} erros de levantamento`;

  const defMetaDesc = isLibero && matchesPlayed > 0
    ? `${matchesPlayed} jogos escalados · ${counts.reception_error} erros de passe`
    : `${counts.reception_error} erros de recepção`;

  return {
    hasGameData,
    totalActions,
    pointsMade,
    errors,
    plusMinus,
    matchesPlayed,
    teamAttackPoints,
    teamAttackErrors,
    teamPointsTotal,
    counts,
    attributes: [
      { key: 'ATQ', label: 'Ataque', val: attackScore, abbr: 'ATQ', points: counts.attack_point, err: counts.attack_error, eff: attackEfficiency },
      { key: 'SAQ', label: 'Saque', val: serveScore, abbr: 'SAQ', points: counts.serve_ace, err: counts.serve_error, eff: serveEfficiency },
      { key: 'BLO', label: 'Bloqueio', val: blockScore, abbr: 'BLO', points: counts.block_point, err: counts.block_error, eff: blockEfficiency },
      { key: 'DEF', label: 'Recepção / Defesa', val: defScore, abbr: 'DEF', points: 0, err: counts.reception_error, customMeta: defMetaDesc },
      { key: 'LEV', label: 'Levantamento', val: levScore, abbr: 'LEV', points: 0, err: counts.setting_error, customMeta: levMetaDesc },
      { key: 'DIS', label: 'Disciplina & Saldo', val: disScore, abbr: 'DIS', points: plusMinus, err: counts.fault },
    ],
    ovr,
    tierName,
    tierColor,
    badges
  };
}
