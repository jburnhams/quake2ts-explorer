import React from 'react';
import { render, screen } from '@testing-library/react';
import { GameHUD } from '@/src/components/GameHUD';
import { PakService } from '@/src/services/pakService';
import { PlayerStat } from 'quake2ts/shared';
import { GameStateSnapshot } from '@/src/services/gameService';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('GameHUD', () => {
    let mockPakService: PakService;
    let mockGameState: GameStateSnapshot;
    let mockConfigstrings: Map<number, string>;

    beforeEach(() => {
        mockPakService = {
            readFile: jest.fn().mockResolvedValue(new Uint8Array(0))
        } as unknown as PakService;

        // Mock GameStateSnapshot
        mockGameState = {
            stats: new Array(32).fill(0),
            // Other required fields (stubbed as any since we only test stats usage mostly)
            time: 0,
            gravity: { x: 0, y: 0, z: 0 },
            origin: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            viewangles: { x: 0, y: 0, z: 0 },
            pmFlags: 0,
            pmType: 0,
            waterlevel: 0,
            deltaAngles: { x: 0, y: 0, z: 0 },
            health: 0,
            armor: 0,
            ammo: 0,
            blend: [0, 0, 0, 0],
            damageAlpha: 0,
            damageIndicators: [],
            kick_angles: { x: 0, y: 0, z: 0 },
            kick_origin: { x: 0, y: 0, z: 0 },
            gunoffset: { x: 0, y: 0, z: 0 },
            gunangles: { x: 0, y: 0, z: 0 },
            gunindex: 0,
            pm_time: 0,
            gun_frame: 0,
            rdflags: 0,
            fov: 90,
            renderfx: 0,
            level: {} as any,
            entities: { activeCount: 0, worldClassname: 'world' },
            packetEntities: []
        } as unknown as GameStateSnapshot;

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
