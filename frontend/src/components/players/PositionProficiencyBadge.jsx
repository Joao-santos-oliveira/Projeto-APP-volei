import { Star, Shield, Award } from 'lucide-react';
import { positionBadgeClass } from '../../utils/constants';

export default function PositionProficiencyBadge({
  proficiencies = [],
  variant = 'card', // 'card' | 'detailed' | 'compact'
  showBar = true
}) {
  if (!proficiencies || proficiencies.length === 0) return null;

  if (variant === 'compact') {
    return (
      <div className="geo-proficiency-compact">
        {proficiencies.map(p => (
          <div key={p.position} className="geo-pill-badge" style={{ borderColor: `${p.tierColor}60` }}>
            <span className="geo-pill-pos">{p.position}</span>
            <div className="geo-pill-score" style={{ color: p.tierColor }}>
              <Star size={10} fill={p.tierColor} strokeWidth={0} />
              <span>{p.score.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className="geo-proficiency-detailed-grid">
        {proficiencies.map(p => {
          // Number of active segments out of 5
          const activeSegments = Math.round(p.score);

          return (
            <div
              key={p.position}
              className={`geo-proficiency-panel ${p.isPrimary ? 'is-primary' : ''}`}
              style={{ borderLeftColor: p.tierColor }}
            >
              <div className="geo-panel-top">
                <div className="geo-pos-info">
                  <span className={positionBadgeClass(p.position)}>{p.position}</span>
                  <span className={`geo-specialty-badge ${p.isPrimary ? 'primary' : 'sec'}`}>
                    {p.isPrimary ? 'Especialidade Principal' : 'Função Secundária'}
                  </span>
                </div>

                <div className="geo-score-box">
                  <span className="geo-score-digits" style={{ color: p.tierColor }}>{p.score.toFixed(1)}</span>
                  <span className="geo-score-denom">/5.0</span>
                </div>
              </div>

              <div className="geo-tier-row">
                <span className="geo-tier-tag" style={{ color: p.tierColor, borderColor: `${p.tierColor}40` }}>
                  {p.tier}
                </span>
                <span className="geo-stat-pct">{Math.round(p.scorePercent)}% Eficiência</span>
              </div>

              {showBar && (
                <div className="geo-segmented-track" title={`${p.score.toFixed(1)} de 5.0`}>
                  {[1, 2, 3, 4, 5].map(step => {
                    const isFilled = p.score >= step;
                    const isPartial = !isFilled && p.score >= (step - 0.5);
                    return (
                      <div
                        key={step}
                        className="geo-segment"
                        style={{
                          backgroundColor: isFilled
                            ? p.tierColor
                            : isPartial
                            ? `${p.tierColor}70`
                            : 'var(--border)'
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Variant 'card' (for Player Cards)
  return (
    <div className="geo-card-proficiency-block">
      {proficiencies.map(p => (
        <div key={p.position} className="geo-prof-row">
          <div className="geo-prof-meta">
            <span className="geo-prof-pos-name">{p.position}</span>
            <div className="geo-prof-val-wrap">
              <span className="geo-prof-tier-sub" style={{ color: p.tierColor }}>{p.tier}</span>
              <span className="geo-prof-num" style={{ color: p.tierColor }}>{p.score.toFixed(1)}</span>
              <span className="geo-prof-max">/5</span>
            </div>
          </div>

          {showBar && (
            <div className="geo-segmented-mini-track">
              {[1, 2, 3, 4, 5].map(step => {
                const isFilled = p.score >= step;
                const isPartial = !isFilled && p.score >= (step - 0.5);
                return (
                  <div
                    key={step}
                    className="geo-segment-mini"
                    style={{
                      backgroundColor: isFilled
                        ? p.tierColor
                        : isPartial
                        ? `${p.tierColor}70`
                        : 'var(--border)'
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
