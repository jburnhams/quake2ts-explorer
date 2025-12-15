import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHUD } from '@/src/components/GameHUD';
import { PakService } from '@/src/services/pakService';
import { PlayerState, PlayerStat } from 'quake2ts/shared';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('GameHUD', () => {
    let mockPakService: PakService;
    let mockPlayerState: PlayerState;
    let mockConfigstrings: Map<number, string>;

    beforeEach(() => {
        mockPakService = {
            readFile: jest.fn().mockResolvedValue(new Uint8Array(0))
        } as unknown as PakService;

        mockPlayerState = {
            stats: []
        } as unknown as PlayerState;
        // Fill stats array with 0s
        for(let i=0; i<32; i++) mockPlayerState.stats[i] = 0;

        mockConfigstrings = new Map();
    });

    it('renders health, armor, and ammo', () => {
        mockPlayerState.stats[PlayerStat.STAT_HEALTH] = 100;
        mockPlayerState.stats[PlayerStat.STAT_ARMOR] = 50;
        mockPlayerState.stats[PlayerStat.STAT_AMMO] = 25;

        render(
            <GameHUD
                playerState={mockPlayerState}
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
        mockPlayerState.stats[PlayerStat.STAT_HEALTH] = 0;

        render(
            <GameHUD
                playerState={mockPlayerState}
                configstrings={mockConfigstrings}
                pakService={mockPakService}
            />
        );

        expect(screen.getByText('YOU DIED')).toBeInTheDocument();
        expect(screen.queryByText('Health')).not.toBeInTheDocument();
    });
});
