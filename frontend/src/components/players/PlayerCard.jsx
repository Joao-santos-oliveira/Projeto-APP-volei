import { positionBadgeClass, getInitials } from '../../utils/constants';
import PlayerRadarMini from './PlayerRadarMini';

export default function PlayerCard({ player, onClick }) {
  const initials = getInitials(player.name);
  const pos = player.primary_position;

  return (
    <div className="player-card" onClick={() => onClick?.(player)}>
      {/* Banner colorido */}
      <div className="player-card-banner">
        {player.number && (
          <div className="player-card-number">#{player.number}</div>
        )}
        {/* Avatar */}
        <div className="player-card-avatar">
          {player.photo
            ? <img src={player.photo} alt={player.name} />
            : initials
          }
        </div>
      </div>

      <div className="player-card-body">
        <div className="player-card-name">{player.name}</div>
        {player.nickname && (
          <div className="player-card-nickname">"{player.nickname}"</div>
        )}

        <div className="player-card-meta">
          <span className={positionBadgeClass(pos)}>{pos}</span>
          {player.secondary_positions?.map(sp => (
            <span key={sp} className={positionBadgeClass(sp)} style={{ opacity: 0.6, fontSize: 10 }}>
              {sp}
            </span>
          ))}
          {player.height && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {player.height}cm
            </span>
          )}
        </div>

        <div className="player-card-radar">
          <PlayerRadarMini attributes={player.attributes} />
        </div>
      </div>
    </div>
  );
}
