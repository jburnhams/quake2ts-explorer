import React from 'react';
import './GameHUD.css';
import { PlayerState } from 'quake2ts/shared';

// We import the enum from shared if available, or define it locally if not exported
// Since we saw it in shared/dist/types/protocol/stats.d.ts, we can try to import it.
// However, it might be exported as `PlayerStat` or just consts.
// The grep showed `STAT_HEALTH = 1`.
// We will use the enum from `quake2ts/shared` if possible, but for now we rely on the indices we found.

export enum PlayerStat {
    STAT_HEALTH_ICON = 0,
    STAT_HEALTH = 1,
    STAT_AMMO_ICON = 2,
    STAT_AMMO = 3,
    STAT_ARMOR_ICON = 4,
    STAT_ARMOR = 5,
    STAT_SELECTED_ICON = 6,
    STAT_PICKUP_ICON = 7,
    STAT_PICKUP_STRING = 8,
    STAT_TIMER_ICON = 9,
    STAT_TIMER = 10,
    STAT_HELPICON = 11,
    STAT_SELECTED_ITEM = 12,
    STAT_LAYOUTS = 13,
    STAT_FRAGS = 14,
    STAT_FLASHES = 15
}

interface GameHUDProps {
  playerState: PlayerState | null;
  configStrings?: Map<number, string>;
}

export const GameHUD: React.FC<GameHUDProps> = ({ playerState, configStrings }) => {
  if (!playerState) return null;

  const health = playerState.stats[PlayerStat.STAT_HEALTH];
  const armor = playerState.stats[PlayerStat.STAT_ARMOR];
  const ammo = playerState.stats[PlayerStat.STAT_AMMO];

  // Flash effect based on blend
  // playerState.blend is [r, g, b, a]
  const flashStyle: React.CSSProperties = {
      backgroundColor: `rgba(${playerState.blend[0] * 255}, ${playerState.blend[1] * 255}, ${playerState.blend[2] * 255}, ${playerState.blend[3]})`
  };

  const isDead = health <= 0;

  return (
    <div className="game-hud">
      {/* Damage/Pickup Flash */}
      <div className="hud-flash" style={flashStyle} />

      {/* Crosshair */}
      <div className="hud-crosshair">+</div>

      {/* Stats Bar */}
      <div className="hud-stats-bar">
        <div className="stat-box health">
          <span className="stat-icon">❤️</span>
          <span className="stat-value">{health}</span>
        </div>

        <div className="stat-box armor">
           <span className="stat-icon">🛡️</span>
           <span className="stat-value">{armor}</span>
        </div>

        <div className="stat-box ammo">
           <span className="stat-icon">🔫</span>
           <span className="stat-value">{ammo}</span>
        </div>
      </div>

      {/* Death Screen */}
      {isDead && (
          <div className="death-overlay">
              <h1>YOU DIED</h1>
              <p>Press Fire to Respawn</p>
          </div>
      )}

      {/* Center Print */}
      {playerState.centerPrint && (
          <div className="center-print">
              {playerState.centerPrint}
          </div>
      )}
    </div>
  );
};
