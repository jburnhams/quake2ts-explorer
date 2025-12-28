import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../../src/App';
import * as pakServiceModule from '../../src/services/pakService';
import { createGameSimulation } from '../../src/services/gameService';
import { createGameLoop } from '../../src/utils/gameLoop';
import { PakService, ParsedFile } from '../../src/services/pakService';
import { VirtualFileSystem, BspMap } from '@quake2ts/engine';
import { GameSimulation, GameStateSnapshot } from '@quake2ts/game';
import { indexedDBService } from '../../src/services/indexedDBService';

// Mock AutoSizer to render children with fixed dimensions
vi.mock('react-virtualized-auto-sizer', () => {
  return {
    default: ({ children }: any) => {
      return children({ height: 500, width: 500 });
    }
  };
});

// Mock react-window (v2) to render all items
vi.mock('react-window', () => {
  const React = require('react');
  return {
    List: ({ rowComponent, rowProps, rowCount }: any) => {
      const Row = rowComponent;
      return (
        <div data-testid="virtual-list">
          {Array.from({ length: rowCount }).map((_, index) => (
            <Row key={index} index={index} style={{}} {...rowProps} />
          ))}
        </div>
      );
    },
  };
});

// Mock dependencies
vi.mock('../../src/services/pakService');
vi.mock('../../src/services/gameService');
vi.mock('../../src/utils/gameLoop');
vi.mock('../../src/services/indexedDBService');
vi.mock('../../src/components/UniversalViewer/UniversalViewer', () => ({
    UniversalViewer: () => <div data-testid="universal-viewer">Universal Viewer</div>
}));

// Mock resize observer
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('Game Mode Integration', () => {
    let mockPakService: any;
    let mockGameSimulation: any;
    let mockGameLoop: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup PakService mock
        mockPakService = {
            buildFileTree: vi.fn().mockReturnValue({
                name: 'root',
                path: '',
                isDirectory: true,
                children: [
                    {
                        name: 'maps',
                        path: 'maps',
                        isDirectory: true,
                        children: [
                            {
                                name: 'demo1.bsp',
                                path: 'maps/demo1.bsp',
                                isDirectory: false
                            }
                        ]
                    }
                ]
            }),
            listDirectory: vi.fn().mockReturnValue({ files: [], directories: [] }),
            getMountedPaks: vi.fn().mockReturnValue([{ id: 'pak0', name: 'pak0.pak' }]),
            getFileMetadata: vi.fn().mockReturnValue({ size: 1000, compressedSize: 500, extension: 'bsp', sourcePak: 'pak0.pak' }),
            hasFile: vi.fn().mockReturnValue(true),
            loadPakFromBuffer: vi.fn().mockResolvedValue(undefined),
            parseFile: vi.fn().mockResolvedValue({
                type: 'bsp',
                map: {
                    header: { version: 38 },
                    models: [],
                    entities: { entities: [] },
                    faces: [],
                    texInfo: [],
                    vertices: [],
                    leafs: [],
                    brushes: [],
                    nodes: []
                } as unknown as BspMap
            } as ParsedFile),
            vfs: {} as VirtualFileSystem
        };

        // Use Object.defineProperty to handle the 'prototype' read that might happen during instantiation
        // or just return the mock instance when new PakService() is called.
        (pakServiceModule.PakService as unknown as vi.Mock).mockImplementation(() => mockPakService);
        // Also mock static method
        (pakServiceModule.PakService as any).getVfsPath = (path: string) => path;

        // Setup IndexedDB mock
        (indexedDBService.getPaks as vi.Mock).mockResolvedValue([]);

        // Setup GameSimulation mock
        mockGameSimulation = {
            start: vi.fn(),
            stop: vi.fn(),
            shutdown: vi.fn(),
            tick: vi.fn(),
            getSnapshot: vi.fn().mockReturnValue({
                playerState: {},
                entities: [],
                events: []
            } as GameStateSnapshot),
            getConfigStrings: vi.fn().mockReturnValue(new Map()),
            createSave: vi.fn(),
            loadSave: vi.fn()
        };
        (createGameSimulation as vi.Mock).mockResolvedValue(mockGameSimulation);

        // Setup GameLoop mock
        mockGameLoop = {
            start: vi.fn(),
            stop: vi.fn(),
            isRunning: vi.fn().mockReturnValue(true),
            pause: vi.fn(),
            resume: vi.fn()
        };
        (createGameLoop as vi.Mock).mockReturnValue(mockGameLoop);
    });

    it('switches to game mode when "Play Map" is clicked', async () => {
        await act(async () => {
            render(<App />);
        });

        // 1. Expand maps folder
        const mapsNode = await screen.findByText('maps');
        await act(async () => {
            fireEvent.click(mapsNode);
        });

        // 2. Select the map file
        const fileNode = await screen.findByText('demo1.bsp');
        await act(async () => {
            fireEvent.click(fileNode);
        });

        // 3. Wait for preview to load and "Play Map" button to appear
        const playButton = await screen.findByText('▶ Play Map');
        expect(playButton).toBeInTheDocument();

        // 3. Click Play Map
        await act(async () => {
            fireEvent.click(playButton);
        });

        // 4. Verify Game Initialization
        await waitFor(() => {
            expect(createGameSimulation).toHaveBeenCalledWith(mockPakService.vfs, 'demo1');
            expect(mockGameSimulation.start).toHaveBeenCalled();
            expect(createGameLoop).toHaveBeenCalled();
            expect(mockGameLoop.start).toHaveBeenCalled();
        });

        // 6. Verify Game UI is rendered (UniversalViewer in game mode)
        expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();

        // 7. Verify File Tree is NOT rendered (hidden in game mode)
        expect(screen.queryByTestId('file-tree-panel')).not.toBeInTheDocument();
    });

    it('handles pause menu and quitting', async () => {
        await act(async () => {
            render(<App />);
        });

        // Start game
        const mapsNode = await screen.findByText('maps');
        await act(async () => {
            fireEvent.click(mapsNode);
        });

        const fileNode = await screen.findByText('demo1.bsp');
        await act(async () => {
            fireEvent.click(fileNode);
        });
        const playButton = await screen.findByText('▶ Play Map');
        await act(async () => {
            fireEvent.click(playButton);
        });
        await waitFor(() => {
            expect(screen.getByTestId('universal-viewer')).toBeInTheDocument();
        });

        // Simulate ESC key to pause
        await act(async () => {
            fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
        });

        // Verify Game Menu appears
        expect(await screen.findByText('Game Paused')).toBeInTheDocument();
        expect(screen.getByText('Resume Game')).toBeInTheDocument();
        expect(screen.getByText('Quit to Browser')).toBeInTheDocument();

        // Click Quit
        const quitButton = screen.getByText('Quit to Browser');
        await act(async () => {
            fireEvent.click(quitButton);
        });

        // Verify cleanup
        expect(mockGameLoop.stop).toHaveBeenCalled();
        expect(mockGameSimulation.shutdown).toHaveBeenCalled();

        // Verify returned to Browser Mode
        expect(await screen.findByTestId('file-tree-panel')).toBeInTheDocument();
    });
});
