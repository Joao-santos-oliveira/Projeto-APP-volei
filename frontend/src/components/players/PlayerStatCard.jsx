import { Shield, Lock, Award, Zap, TrendingUp, BarChart2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateStatAttributes } from '../../utils/statAttributes';
import { positionBadgeClass, getInitials } from '../../utils/constants';

export default function PlayerStatCard({ player }) {
  if (!player) return null;

  const statData = calculateStatAttributes(player);
  const { ovr, tierName, tierColor, attributes, badges, plusMinus, totalActions, pointsMade, errors, counts } = statData;

  return (
    <div className="geo-stat-sheet-panel">
      {/* Immutability Banner */}
      <div className="geo-immutability-bar">
        <div className="geo-immutability-left">
          <Lock size={13} className="text-gold" />
          <span className="geo-immutability-title">FICHA ESTATÍSTICA REAL (IMUTÁVEL)</span>
        </div>
        <span className="geo-immutability-chip">
          100% CÁLCULO ALGORÍTMICO DE JOGO
        </span>
      </div>

      <div className="geo-stat-sheet-content">
        {/* Top Header Card */}
        <div className="geo-stat-hero-card">
          <div className="geo-stat-hero-left">
            <div className="geo-stat-avatar-wrap" style={{ borderColor: tierColor }}>
              {player.photo ? (
                <img src={player.photo} alt={player.name} className="geo-stat-avatar-img" />
              ) : (
                <span className="geo-stat-avatar-fallback">{getInitials(player.name)}</span>
              )}
              <div className="geo-stat-jersey-badge">
                {player.number ? `#${player.number}` : 'S/N'}
              </div>
            </div>

            <div className="geo-stat-hero-info">
              <div className="geo-stat-pos-row">
                <span className={positionBadgeClass(player.primary_position)}>{player.primary_position}</span>
                <span className="geo-tier-text-pill" style={{ color: tierColor, borderColor: `${tierColor}40`, background: `${tierColor}15` }}>
                  {tierName}
                </span>
              </div>
              <h2 className="geo-stat-player-name">{player.name}</h2>
              {player.nickname && <span className="geo-stat-player-alias">"{player.nickname}"</span>}
              <div className="geo-stat-badge-tags">
                {badges.map((b, i) => (
                  <span key={i} className="geo-merit-badge" style={{ borderColor: `${b.color}50`, color: b.color, background: `${b.color}15` }} title={b.desc}>
                    <Award size={11} /> {b.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* OVR Rating Box */}
          <div className="geo-ovr-big-badge" style={{ borderColor: tierColor }}>
            <span className="geo-ovr-caption">RATING OVR</span>
            <span className="geo-ovr-number" style={{ color: tierColor }}>{ovr}</span>
            <span className="geo-ovr-scale">ESCALA 10-99</span>
          </div>
        </div>

        {/* Real Match Metrics KPIs */}
        <div className="geo-stat-kpis-grid">
          <div className="geo-stat-kpi-box">
            <span className="kpi-label">TOTAL DE AÇÕES</span>
            <span className="kpi-value">{totalActions}</span>
            <span className="kpi-sub">Scouts computados</span>
          </div>
          <div className="geo-stat-kpi-box" style={{ borderLeftColor: '#10B981' }}>
            <span className="kpi-label">PONTOS CONVERTIDOS</span>
            <span className="kpi-value text-emerald-400">+{pointsMade}</span>
            <span className="kpi-sub">Ataques / Aces / Blocks</span>
          </div>
          <div className="geo-stat-kpi-box" style={{ borderLeftColor: '#EF4444' }}>
            <span className="kpi-label">ERROS COMETIDOS</span>
            <span className="kpi-value text-rose-400">-{errors}</span>
            <span className="kpi-sub">Ataque / Saque / Passe</span>
          </div>
          <div className="geo-stat-kpi-box" style={{ borderLeftColor: plusMinus >= 0 ? '#10B981' : '#EF4444' }}>
            <span className="kpi-label">SALDO LÍQUIDO (+/-)</span>
            <span className="kpi-value" style={{ color: plusMinus >= 0 ? '#10B981' : '#EF4444' }}>
              {plusMinus >= 0 ? `+${plusMinus}` : plusMinus}
            </span>
            <span className="kpi-sub">Pontos menos erros</span>
          </div>
        </div>

        {/* Attribute Breakdown (Non-editable bars) */}
        <div className="geo-stat-attrs-block">
          <div className="geo-stat-section-title">
            <span>ATRIBUTOS ESTATÍSTICOS DERIVADOS (0-99)</span>
            <span className="geo-lock-note">
              <Lock size={11} /> Somente leitura · Calculado em tempo real
            </span>
          </div>

          <div className="geo-stat-bars-grid">
            {attributes.map(attr => {
              const barColor = attr.val >= 80 ? '#10B981' : attr.val >= 70 ? '#3B82F6' : attr.val >= 60 ? '#F59E0B' : '#EF4444';
              return (
                <div key={attr.key} className="geo-stat-attr-card">
                  <div className="geo-stat-attr-header">
                    <div className="geo-stat-attr-title-group">
                      <span className="geo-stat-abbr">{attr.abbr}</span>
                      <span className="geo-stat-name">{attr.label}</span>
                    </div>
                    <div className="geo-stat-val-group">
                      <span className="geo-stat-score-num" style={{ color: barColor }}>{attr.val}</span>
                      <span className="geo-stat-max">/99</span>
                    </div>
                  </div>

                  <div className="geo-stat-bar-track">
                    <div
                      className="geo-stat-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(5, attr.val))}%`,
                        backgroundColor: barColor
                      }}
                    />
                  </div>

                  <div className="geo-stat-attr-meta">
                    {attr.points !== undefined && attr.err !== undefined ? (
                      <span>{attr.points} acertos · {attr.err} erros {attr.eff !== undefined ? `(${attr.eff.toFixed(0)}% efic.)` : ''}</span>
                    ) : (
                      <span>{attr.err} erros registrados</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Descriptive Footer Notice */}
        <div className="geo-stat-disclaimer">
          <p>
            ℹ️ <strong>Critério Técnico:</strong> Esta ficha quantifica exclusivamente o desempenho do atleta durante os confrontos oficiais registrados na plataforma (ataques convertidos, erros de fundamentos, aces, bloqueios e saldo de pontos). Não sofre influência de notas manuais nem pode ser alterada por atletas ou administradores.
          </p>
        </div>
      </div>
    </div>
  );
}
