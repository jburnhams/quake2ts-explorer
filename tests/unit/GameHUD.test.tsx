import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHUD, PlayerStat } from '../../src/components/GameHUD';
import { PlayerState } from 'quake2ts/shared';

// Mock PlayerState
const createMockPlayerState = (overrides: Partial<PlayerState> = {}): PlayerState => {
  const stats = new Array(32).fill(0);
  stats[PlayerStat.STAT_HEALTH] = 100;
  stats[PlayerStat.STAT_ARMOR] = 50;
  stats[PlayerStat.STAT_AMMO] = 25;

  return {
    origin: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    viewAngles: { x: 0, y: 0, z: 0 },
    stats,
    blend: [0, 0, 0, 0],
    ...overrides
  } as PlayerState;
};

jest.mock('quake2ts/shared', () => ({
  Vec3: {},
}));

describe('GameHUD', () => {
  it('should render nothing if playerState is null', () => {
    const { container } = render(<GameHUD playerState={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render health, armor, and ammo', () => {
    const state = createMockPlayerState();
    render(<GameHUD playerState={state} />);

    expect(screen.getByText('100')).toBeInTheDocument(); // Health
    expect(screen.getByText('50')).toBeInTheDocument();  // Armor
    expect(screen.getByText('25')).toBeInTheDocument();  // Ammo
  });

  it('should display death screen when health <= 0', () => {
    const state = createMockPlayerState();
    state.stats[PlayerStat.STAT_HEALTH] = 0;

    render(<GameHUD playerState={state} />);

    expect(screen.getByText('YOU DIED')).toBeInTheDocument();
  });

  it('should not display death screen when health > 0', () => {
    const state = createMockPlayerState();

    render(<GameHUD playerState={state} />);

    expect(screen.queryByText('YOU DIED')).not.toBeInTheDocument();
  });

  it('should render center print message', () => {
    const state = createMockPlayerState({ centerPrint: "Objective Updated" });

    render(<GameHUD playerState={state} />);

    expect(screen.getByText('Objective Updated')).toBeInTheDocument();
  });
});
