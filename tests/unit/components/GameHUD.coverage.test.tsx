import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHUD } from '@/src/components/GameHUD';
import { GameStateSnapshot } from '@/src/services/gameService';
import { PlayerStat } from '@quake2ts/shared';

// Mock dependencies
vi.mock('@quake2ts/shared', () => ({
  PlayerStat: {
    STAT_HEALTH: 0,
    STAT_AMMO_ICON: 1,
    STAT_AMMO: 2,
    STAT_ARMOR_ICON: 3,
    STAT_ARMOR: 4,
    STAT_SELECTED_ICON: 5,
    STAT_PICKUP_ICON: 6,
    STAT_PICKUP_STRING: 7,
    STAT_TIMER_ICON: 8,
    STAT_TIMER: 9,
    STAT_HELPICON: 10,
    STAT_SELECTED_ITEM: 11,
    STAT_LAYOUTS: 12,
    STAT_FRAGS: 13,
    STAT_FLASHES: 14
  }
}));

const mockPakService = {
  readFile: vi.fn(),
  hasFile: vi.fn().mockReturnValue(true)
};

describe('GameHUD Coverage', () => {
    const createMockSnapshot = (stats: number[] = []): GameStateSnapshot => ({
        stats: stats.length ? stats : new Array(32).fill(0),
        inventory: new Array(256).fill(0),
        // configstrings are passed as separate prop now
        configstrings: new Map() // Ignored in snapshot, used from prop
    } as any);

    it('should render health icon and value', () => {
        const stats = new Array(32).fill(0);
        stats[0] = 100; // Health

        render(<GameHUD
            gameState={createMockSnapshot(stats)}
            configstrings={new Map()}
            pakService={mockPakService as any}
        />);
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('Health')).toBeInTheDocument();
    });

    it('should render death overlay when health <= 0', () => {
        const stats = new Array(32).fill(0);
        stats[0] = 0; // Dead

        render(<GameHUD
            gameState={createMockSnapshot(stats)}
            configstrings={new Map()}
            pakService={mockPakService as any}
        />);
        expect(screen.getByText('YOU DIED')).toBeInTheDocument();
    });

    it('should render ammo', () => {
        const stats = new Array(32).fill(0);
        stats[0] = 100; // Alive
        stats[2] = 50; // Ammo

        render(<GameHUD
            gameState={createMockSnapshot(stats)}
            configstrings={new Map()}
            pakService={mockPakService as any}
        />);
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('Ammo')).toBeInTheDocument();
    });

    it('should render armor', () => {
        const stats = new Array(32).fill(0);
        stats[0] = 100; // Alive
        stats[4] = 75; // Armor

        render(<GameHUD
            gameState={createMockSnapshot(stats)}
            configstrings={new Map()}
            pakService={mockPakService as any}
        />);
        expect(screen.getByText('75')).toBeInTheDocument();
        expect(screen.getByText('Armor')).toBeInTheDocument();
    });

    it('should handle damage flash', () => {
         const statsInitial = new Array(32).fill(0);
         statsInitial[0] = 100;

         const { rerender, container } = render(<GameHUD
            gameState={createMockSnapshot(statsInitial)}
            configstrings={new Map()}
            pakService={mockPakService as any}
        />);

        const statsDamaged = new Array(32).fill(0);
        statsDamaged[0] = 90;

        rerender(<GameHUD
            gameState={createMockSnapshot(statsDamaged)}
            configstrings={new Map()}
            pakService={mockPakService as any}
        />);

        // Check for damage flash element
        // The implementation renders: {damageFlash && <div className="damage-flash" />}
        const flash = container.querySelector('.damage-flash');
        expect(flash).toBeInTheDocument();
    });

    it('should attempt to load icons (even if unimplemented logic)', async () => {
        const stats = new Array(32).fill(0);
        stats[0] = 100;
        stats[1] = 1; // Ammo Icon Index

        const configstrings = new Map<number, string>();
        configstrings.set(544 + 1, 'pics/ammo.pcx');

        render(<GameHUD
            gameState={createMockSnapshot(stats)}
            configstrings={configstrings}
            pakService={mockPakService as any}
        />);

        // Logic just calls setter(null) currently, but effect runs.
        // We can verify no crash.
    });
});
