
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { GameHUD } from '@/src/components/GameHUD';
import { PlayerState, PlayerStat } from 'quake2ts/shared';

describe('GameHUD', () => {
  const createMockPlayerState = (overrides: Partial<PlayerState> = {}): PlayerState => {
    const stats = new Array(55).fill(0);
    stats[PlayerStat.STAT_HEALTH] = 100;
    stats[PlayerStat.STAT_ARMOR] = 0;
    stats[PlayerStat.STAT_AMMO] = 50;
    stats[PlayerStat.STAT_ACTIVE_WEAPON] = 1; // Blaster

    return {
      stats,
      ...overrides
    } as unknown as PlayerState;
  };

  test('renders player stats correctly', () => {
    const playerState = createMockPlayerState();
    // Set some values
    playerState.stats[PlayerStat.STAT_HEALTH] = 85;
    playerState.stats[PlayerStat.STAT_ARMOR] = 42;
    playerState.stats[PlayerStat.STAT_AMMO] = 120;

    render(<GameHUD playerState={playerState} />);

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  test('shows death screen when health <= 0', () => {
    const playerState = createMockPlayerState();
    playerState.stats[PlayerStat.STAT_HEALTH] = 0;

    render(<GameHUD playerState={playerState} />);

    expect(screen.getByText('YOU DIED')).toBeInTheDocument();
  });

  test('does not render when playerState is null', () => {
    const { container } = render(<GameHUD playerState={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('flashes damage overlay when health decreases', () => {
    const playerState = createMockPlayerState();
    playerState.stats[PlayerStat.STAT_HEALTH] = 100;

    const { rerender, container } = render(<GameHUD playerState={playerState} />);

    // Initial render, no flash
    expect(container.querySelector('.flash-damage')).not.toBeInTheDocument();

    // Decrease health
    playerState.stats[PlayerStat.STAT_HEALTH] = 90;

    // We need to pass a new object or force update.
    // Since GameHUD uses props, a new render with same object reference might work if React sees it?
    // Usually better to clone.
    const newState = { ...playerState, stats: [...playerState.stats] };

    rerender(<GameHUD playerState={newState} />);

    expect(container.querySelector('.flash-damage')).toBeInTheDocument();
  });
});
