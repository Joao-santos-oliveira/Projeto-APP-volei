/**
 * statAttributes.js
 * Cálculo de atributos 100% puramente estatísticos derivados das ações reais
 * de jogo e scouts registrados em partidas.
 * Totalmente imutável e livre de subjetividade de avaliações manuais.
 * 
 * Inclui correlação tática para funções estratégicas:
 * - Levantadores: herdam a eficácia de distribuição e conversão de ataques da equipe em quadra.
 * - Líberos: herdam o volume defensivo e estabilidade de passe nos confrontos disputados.
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

  const isSetter = player?.primary_position === 'Levantador';
  const isLibero = player?.primary_position === 'Líbero';
  const hasGameData = totalActions > 0 || matchesPlayed > 0 || teamAttackPoints > 0;

  // 1. Ataque (ATQ)
  const attackTotal = counts.attack_point + counts.attack_error;
  let attackScore = 55;
  let attackEfficiency = 0;
  if (attackTotal > 0) {
    attackEfficiency = ((counts.attack_point - counts.attack_error) / attackTotal) * 100;
    const killRate = counts.attack_point / attackTotal;
    const volBonus = Math.min(10, counts.attack_point * 1.5);
    attackScore = Math.round(45 + (killRate * 35) + ((attackEfficiency / 100) * 15) + volBonus);
  } else if (player?.primary_position === 'Oposto' || player?.primary_position === 'Ponteiro') {
    attackScore = 58;
  }
  attackScore = Math.min(99, Math.max(10, attackScore));

  // 2. Saque (SAQ)
  const serveTotal = counts.serve_ace + counts.serve_error;
  let serveScore = 55;
  let serveEfficiency = 0;
  if (serveTotal > 0) {
    serveEfficiency = ((counts.serve_ace - counts.serve_error) / serveTotal) * 100;
    const aceRatio = counts.serve_ace / serveTotal;
    const aceBonus = Math.min(15, counts.serve_ace * 3);
    serveScore = Math.round(50 + (aceRatio * 35) - ((counts.serve_error / serveTotal) * 15) + aceBonus);
  }
  serveScore = Math.min(99, Math.max(10, serveScore));

  // 3. Bloqueio (BLO)
  const blockTotal = counts.block_point + counts.block_error;
  let blockScore = 55;
  let blockEfficiency = 0;
  if (blockTotal > 0) {
    blockEfficiency = ((counts.block_point - counts.block_error) / blockTotal) * 100;
    const blockRatio = counts.block_point / blockTotal;
    const blockBonus = Math.min(15, counts.block_point * 3);
    blockScore = Math.round(50 + (blockRatio * 35) - ((counts.block_error / blockTotal) * 15) + blockBonus);
  } else if (player?.primary_position === 'Central') {
    blockScore = 58;
  }
  blockScore = Math.min(99, Math.max(10, blockScore));

  // 4. Recepção / Defesa (DEF)
  let defScore = isLibero ? 65 : 60;
  const effectiveDefVolume = isLibero ? Math.max(totalActions, matchesPlayed * 15, teamPointsTotal * 0.4) : totalActions;
  
  if (effectiveDefVolume > 0) {
    if (isLibero) {
      const cleanPassRate = Math.max(0, 1 - (counts.reception_error / Math.max(1, effectiveDefVolume * 0.2)));
      const defVolBonus = Math.min(18, (matchesPlayed * 4) + (effectiveDefVolume * 0.15));
      const passPenalty = counts.reception_error * 6;
      defScore = Math.round(55 + (cleanPassRate * 25) + defVolBonus - passPenalty);
    } else {
      const errorPenalty = counts.reception_error * 4;
      const cleanRatio = Math.max(0, 1 - (counts.reception_error / Math.max(1, totalActions * 0.4)));
      defScore = Math.round(55 + (cleanRatio * 35) - errorPenalty + Math.min(10, totalActions * 0.3));
    }
  }
  defScore = Math.min(99, Math.max(10, defScore));

  // 5. Levantamento / Armação (LEV)
  let levScore = isSetter ? 65 : 60;
  const teamAttackTotal = teamAttackPoints + teamAttackErrors;

  if (isSetter && (teamAttackTotal > 0 || matchesPlayed > 0 || totalActions > 0)) {
    const teamKillRate = teamAttackTotal > 0 ? (teamAttackPoints / teamAttackTotal) : 0.5;
    const cleanSettingRate = Math.max(0, 1 - (counts.setting_error / Math.max(1, (teamAttackPoints * 0.25) + (totalActions * 0.3) + 1)));
    const distribBonus = Math.min(18, (teamAttackPoints * 1.3) + (matchesPlayed * 2));
    const settingErrorPenalty = counts.setting_error * 6;
    levScore = Math.round(52 + (cleanSettingRate * 24) + (teamKillRate * 12) + distribBonus - settingErrorPenalty);
  } else if (totalActions > 0) {
    const settingErrorPenalty = counts.setting_error * 5;
    const cleanRate = Math.max(0, 1 - (counts.setting_error / Math.max(1, totalActions * 0.3)));
    levScore = Math.round(55 + (cleanRate * 35) - settingErrorPenalty + Math.min(10, totalActions * 0.2));
  }
  levScore = Math.min(99, Math.max(10, levScore));

  // 6. Disciplina & Consistência Tática (DIS)
  const plusMinus = pointsMade - errors;
  let disScore = 60;
  if (totalActions > 0) {
    const faultPenalty = counts.fault * 4;
    const netRatio = totalActions > 0 ? (plusMinus / totalActions) : 0;
    disScore = Math.round(60 + (netRatio * 25) - faultPenalty);
  } else if (matchesPlayed > 0) {
    disScore = Math.round(65 + Math.min(10, matchesPlayed * 2) - (counts.fault * 4));
  }
  disScore = Math.min(99, Math.max(10, disScore));

  // 7. Overall OVR (Ponderado pela Posição)
  const pos = player?.primary_position || 'Ponteiro';
  let ovr = 60;

  if (pos === 'Central') {
    ovr = Math.round(blockScore * 0.38 + attackScore * 0.32 + serveScore * 0.15 + disScore * 0.15);
  } else if (pos === 'Levantador') {
    ovr = Math.round(levScore * 0.40 + defScore * 0.20 + serveScore * 0.20 + disScore * 0.20);
  } else if (pos === 'Oposto') {
    ovr = Math.round(attackScore * 0.42 + blockScore * 0.25 + serveScore * 0.20 + disScore * 0.13);
  } else if (pos === 'Líbero') {
    ovr = Math.round(defScore * 0.50 + levScore * 0.25 + disScore * 0.25);
  } else {
    // Ponteiro
    ovr = Math.round(attackScore * 0.32 + defScore * 0.28 + serveScore * 0.18 + blockScore * 0.12 + disScore * 0.10);
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
