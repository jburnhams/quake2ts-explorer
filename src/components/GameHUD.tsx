import React, { useEffect, useState, useMemo } from 'react';
import { PlayerStat } from '@quake2ts/shared';
import { GameStateSnapshot } from '@/src/services/gameService';
import { PakService } from '@/src/services/pakService';
import './GameHUD.css';

interface GameHUDProps {
  gameState: GameStateSnapshot;
  configstrings: Map<number, string>;
  pakService: PakService;
}

export function GameHUD({ gameState, configstrings, pakService }: GameHUDProps) {
  const [damageFlash, setDamageFlash] = useState(false);
  const [pickupFlash, setPickupFlash] = useState(false);
  const [lastHealth, setLastHealth] = useState(0);
  const [weaponIconUrl, setWeaponIconUrl] = useState<string | null>(null);
  const [ammoIconUrl, setAmmoIconUrl] = useState<string | null>(null);
  const [armorIconUrl, setArmorIconUrl] = useState<string | null>(null);

  const health = gameState.stats[PlayerStat.STAT_HEALTH] || 0;
  const ammo = gameState.stats[PlayerStat.STAT_AMMO] || 0;
  const armor = gameState.stats[PlayerStat.STAT_ARMOR] || 0;
  const weaponIconIndex = gameState.stats[PlayerStat.STAT_SELECTED_ICON];
  const ammoIconIndex = gameState.stats[PlayerStat.STAT_AMMO_ICON];
  const armorIconIndex = gameState.stats[PlayerStat.STAT_ARMOR_ICON];

  // Note: STAT_SELECTED_ICON (6) is usually the icon.
  // I'll stick to PlayerStat enum.
  // If icons are missing, I'll fallback to text.

  const selectedIconIndex = gameState.stats[PlayerStat.STAT_SELECTED_ICON];

  // Load icons
  useEffect(() => {
    // Placeholder logic for now as decoding PCX in UI requires canvas/texture atlas logic
    // which is heavy for this component.
    // We will render text labels instead.
  }, [selectedIconIndex, ammoIconIndex, armorIconIndex, configstrings, pakService]);

  // Flash detection
  useEffect(() => {
    if (health < lastHealth) {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 200);
    }
    setLastHealth(health);
  }, [health, lastHealth]);

  // Centerprint
  // playerState doesn't have centerprint directly, it comes from events/server commands.
  // But checking PlayerState interface in usage.md, it doesn't show centerprint.
  // Usually centerprint is handled by client receiving commands.
  // For now, we omit centerprint.

  if (health <= 0) {
      return (
          <div className="game-hud">
              <div className="hud-death-overlay">
                  <div className="hud-death-message">YOU DIED</div>
                  <div className="hud-respawn-hint">Press Jump to Respawn</div>
              </div>
          </div>
      );
  }

  return (
    <div className="game-hud">
      {damageFlash && <div className="damage-flash" />}
      {pickupFlash && <div className="pickup-flash" />}

      <div className="hud-crosshair" />

      <div className="hud-bottom-bar">
        <div className="hud-stat hud-armor">
            <span className="hud-stat-value">{armor}</span>
            <span className="hud-stat-label">Armor</span>
        </div>

        <div className="hud-stat hud-health">
            <span className="hud-stat-value">{health}</span>
            <span className="hud-stat-label">Health</span>
        </div>

        <div className="hud-stat hud-ammo">
            <span className="hud-stat-value">{ammo}</span>
            <span className="hud-stat-label">Ammo</span>
        </div>
      </div>
    </div>
  );
}
