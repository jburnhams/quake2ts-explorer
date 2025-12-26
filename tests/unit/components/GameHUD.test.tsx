import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHUD } from '@/src/components/GameHUD';
import { PakService } from '@/src/services/pakService';
import { PlayerStat } from '@quake2ts/shared';
import { GameStateSnapshot } from '@/src/services/gameService';


// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createGameStateSnapshotFactory } = require('@quake2ts/test-utils');

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
