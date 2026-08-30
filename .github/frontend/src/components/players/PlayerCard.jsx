import { getInitials, getPlayerProficiencies, avgTechnical } from '../../utils/constants';
import PositionProficiencyBadge from './PositionProficiencyBadge';
import { Crosshair, Ruler, Activity, Star } from 'lucide-react';

export default function PlayerCard({ player, onClick }) {
  const initials = getInitials(player.name);
  const proficiencies = getPlayerProficiencies(player);
  const avg = avgTechnical(player.attributes);
  const primaryProf = proficiencies.find(p => p.isPrimary) || proficiencies[0];

  return (
    <div className="geo-player-card" onClick={() => onClick?.(player)}>
      {/* Micro-textured Header Bar */}
      <div className="geo-card-header">
        <div className="geo-jersey-tag">
          <span className="jersey-num">{player.number ? `#${player.number}` : 'N/A'}</span>
        </div>

        {primaryProf && (
          <div className="geo-tier-pill" style={{ borderColor: primaryProf.tierColor, color: primaryProf.tierColor }}>
            <span className="tier-pill-label">{primaryProf.tier}</span>
            <span className="tier-pill-score">{primaryProf.score.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Main Identity Box */}
      <div className="geo-card-identity">
        <div className="geo-avatar-frame">
          {player.photo ? (
            <img src={player.photo} alt={player.name} className="geo-avatar-img" />
          ) : (
            <div className="geo-avatar-fallback">{initials}</div>
          )}
        </div>

        <div className="geo-identity-text">
          <h3 className="geo-player-name">{player.name}</h3>
          {player.nickname && (
            <span className="geo-player-alias">"{player.nickname}"</span>
          )}
        </div>
      </div>

      {/* Minimalist Data Grid (Position, Height, General Average) */}
      <div className="geo-specs-grid">
        <div className="geo-spec-cell">
          <div className="geo-spec-label">
            <Crosshair size={11} className="geo-spec-icon" />
            <span>POSIÇÃO</span>
          </div>
          <span className="geo-spec-val">{player.primary_position}</span>
        </div>

        <div className="geo-spec-cell">
          <div className="geo-spec-label">
            <Ruler size={11} className="geo-spec-icon" />
            <span>ALTURA</span>
          </div>
          <span className="geo-spec-val">{player.height ? `${player.height} cm` : '—'}</span>
        </div>

        <div className="geo-spec-cell highlight-cell">
          <div className="geo-spec-label">
            <Activity size={11} className="geo-spec-icon" />
            <span>MÉDIA GERAL</span>
          </div>
          <span className="geo-spec-val score-highlight" style={{
            color: parseFloat(avg) >= 7.5 ? '#10B981' : parseFloat(avg) >= 5.5 ? '#E5A93C' : '#EF4444'
          }}>
            {avg}
          </span>
        </div>
      </div>

      {/* Position Proficiency Segmented Breakdown */}
      <div className="geo-card-prof-panel">
        <div className="geo-prof-panel-title">
          <span>PROFICIÊNCIA NA POSIÇÃO</span>
        </div>
        <PositionProficiencyBadge proficiencies={proficiencies} variant="card" />
      </div>

      {/* Card Footer */}
      <div className="geo-card-footer">
        <span className="geo-footer-scouts">
          {player.rating_count > 0 ? `${player.rating_count} AVALIAÇÃO(ÕES)` : 'SEM SCOUT AINDA'}
        </span>
        <span className="geo-card-arrow">DETALHES →</span>
      </div>
    </div>
  );
}
