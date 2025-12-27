import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHUD } from '@/src/components/GameHUD';
import { PakService } from '@/src/services/pakService';
import { PlayerStat } from '@quake2ts/shared';
import { GameStateSnapshot } from '@/src/services/gameService';

// Manual factory to avoid @quake2ts/test-utils dependency
const createGameStateSnapshotFactory = (overrides: Partial<GameStateSnapshot> = {}): GameStateSnapshot => ({
    time: 0,
    playerState: {
        origin: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        angles: { x: 0, y: 0, z: 0 },
        viewangles: { x: 0, y: 0, z: 0 },
        gunindex: 0,
        gunframe: 0,
        gunoffset: { x: 0, y: 0, z: 0 },
        gunangles: { x: 0, y: 0, z: 0 },
        fov: 90,
        stats: new Array(32).fill(0),
        pm_type: 0,
        pm_flags: 0,
        pm_time: 0,
        rdflags: 0,
    } as any, // Cast to any because PlayerState has many fields
    entities: {
        activeCount: 0,
        entities: []
    } as any,
    stats: new Array(32).fill(0), // Flattened stats as per memory
    ...overrides
});

describe('GameHUD', () => {
    let mockPakService: PakService;
    let mockGameState: GameStateSnapshot;
    let mockConfigstrings: Map<number, string>;

    beforeEach(() => {
        mockPakService = {
            readFile: vi.fn().mockResolvedValue(new Uint8Array(0))
        } as unknown as PakService;

        // Mock GameStateSnapshot using factory
        mockGameState = createGameStateSnapshotFactory({
            stats: new Array(32).fill(0)
        });

        mockConfigstrings = new Map();
    });

    it('renders health, armor, and ammo', () => {
        mockGameState.stats[PlayerStat.STAT_HEALTH] = 100;
        mockGameState.stats[PlayerStat.STAT_ARMOR] = 50;
        mockGameState.stats[PlayerStat.STAT_AMMO] = 25;

        render(
            <GameHUD
                gameState={mockGameState}
                configstrings={mockConfigstrings}
                pakService={mockPakService}
            />
        );

        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('Health')).toBeInTheDocument();
    });

    it('renders death screen when health <= 0', () => {
        mockGameState.stats[PlayerStat.STAT_HEALTH] = 0;

        render(
            <GameHUD
                gameState={mockGameState}
                configstrings={mockConfigstrings}
                pakService={mockPakService}
            />
        );

        expect(screen.getByText('YOU DIED')).toBeInTheDocument();
        expect(screen.queryByText('Health')).not.toBeInTheDocument();
    });
});
