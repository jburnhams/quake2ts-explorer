
import React, { useEffect, useState } from 'react';
import { PlayerState, PlayerStat } from 'quake2ts/shared';

export interface GameHUDProps {
  playerState: PlayerState | null;
}

const WEAPON_NAMES = [
  'Blaster',
  'Shotgun',
  'Super Shotgun',
  'Machinegun',
  'Chaingun',
  'Grenade Launcher',
  'Rocket Launcher',
  'Hyperblaster',
  'Railgun',
  'BFG10K'
];

export const GameHUD: React.FC<GameHUDProps> = ({ playerState }) => {
  const [flash, setFlash] = useState<string | null>(null);
  const [lastHealth, setLastHealth] = useState<number>(0);

  useEffect(() => {
    if (!playerState) return;

    const currentHealth = playerState.stats[PlayerStat.STAT_HEALTH];
    if (lastHealth > 0 && currentHealth < lastHealth) {
      setFlash('damage');
      const timer = setTimeout(() => setFlash(null), 200);
      return () => clearTimeout(timer);
    }
    setLastHealth(currentHealth);
  }, [playerState, lastHealth]);

  if (!playerState || playerState.stats[PlayerStat.STAT_HEALTH] <= 0) {
    if (playerState && playerState.stats[PlayerStat.STAT_HEALTH] <= 0) {
      return (
        <div className="game-hud death-screen" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(50, 0, 0, 0.5)',
          color: 'red',
          fontFamily: 'monospace',
          fontSize: '2rem',
          pointerEvents: 'none'
        }}>
          <h1>YOU DIED</h1>
          <p>Press Fire to Respawn</p>
        </div>
      );
    }
    return null;
  }

  const health = playerState.stats[PlayerStat.STAT_HEALTH];
  const armor = playerState.stats[PlayerStat.STAT_ARMOR];
  const ammo = playerState.stats[PlayerStat.STAT_AMMO];
  const weaponIndex = playerState.stats[PlayerStat.STAT_ACTIVE_WEAPON];
  // STAT_WEAPON is often an index into the weapon list.
  // NOTE: Quake 2 weapon indices might need mapping.
  // Usually 1=Blaster, 2=Shotgun etc.
  // Assuming 1-based index for display purposes.
  const weaponName = WEAPON_NAMES[weaponIndex - 1] || 'Unknown';

  return (
    <div className={`game-hud ${flash ? `flash-${flash}` : ''}`} style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      fontFamily: '"Courier New", Courier, monospace',
      color: '#0f0',
      textShadow: '1px 1px 0 #000'
    }}>
      {/* Damage Flash Overlay */}
      {flash === 'damage' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          zIndex: -1
        }} />
      )}

      {/* Crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '4px',
        height: '4px',
        backgroundColor: '#0f0',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 2px #000'
      }} />

      {/* Bottom Bar */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '0',
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 40px',
        boxSizing: 'border-box',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        <div style={{ display: 'flex', gap: '40px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#888' }}>HEALTH</div>
            <div style={{ fontSize: '48px', color: health <= 25 ? 'red' : '#0f0' }}>
              {Math.max(0, health)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#888' }}>ARMOR</div>
            <div style={{ fontSize: '48px' }}>{armor}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '40px', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#888' }}>AMMO</div>
            <div style={{ fontSize: '48px' }}>{ammo > -1 ? ammo : '-'}</div>
          </div>
          <div>
            <div style={{ fontSize: '14px', color: '#888' }}>WEAPON</div>
            <div style={{ fontSize: '24px', marginTop: '16px' }}>{weaponName}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
