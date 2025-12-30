import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '../../src/components/UniversalViewer/UniversalViewer';
import { PakService } from '../../src/services/pakService';
import { DebugMode } from '../../src/types/debugMode';
import '@testing-library/jest-dom';
import { createMockWebGL2Context } from '@quake2ts/test-utils';
import { createWebGLContext } from '@quake2ts/engine';

// Mocks
const mockAddBox = vi.fn();
const mockRender = vi.fn();
const mockClear = vi.fn();

vi.mock('../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
  return {
    DebugRenderer: vi.fn().mockImplementation(() => ({
      init: vi.fn(),
      clear: mockClear,
      addBox: mockAddBox,
      addLine: vi.fn(),
      render: mockRender
    }))
  };
});

vi.mock('@quake2ts/engine', () => {
    return {
        createWebGLContext: vi.fn(),
        Camera: vi.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            position: new Float32Array(3),
            updateMatrices: vi.fn(),
        })),
        BspSurfacePipeline: vi.fn().mockImplementation(() => ({
            bind: vi.fn().mockReturnValue({}),
        })),
        createBspSurfaces: vi.fn().mockReturnValue([]),
        buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            uploadImage: vi.fn(),
            setParameters: vi.fn(),
        })),
        parseWal: vi.fn(),
        walToRgba: vi.fn(),
        resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: vi.fn(),
        findLeafForPoint: vi.fn().mockReturnValue(-1),
    };
});

describe('Debug Rendering Integration', () => {
    let mockPakService: PakService;

    beforeEach(() => {
        mockPakService = {
            hasFile: vi.fn().mockReturnValue(false),
            readFile: vi.fn(),
            getPalette: vi.fn(),
        } as unknown as PakService;

        vi.clearAllMocks();

        const mockGl = createMockWebGL2Context();
        (createWebGLContext as vi.Mock).mockReturnValue({ gl: mockGl });
    });

    it('enables bounding box visualization when selected in UI', async () => {
        const mockMap = {
            models: [{ min: [-10, -10, -10], max: [10, 10, 10] }],
            entities: {
                entities: [
                    { classname: 'worldspawn' }, // Should map to model 0
                    { classname: 'info_player_start', properties: { origin: '100 100 100' } } // Should draw box at origin
                ],
                getUniqueClassnames: vi.fn().mockReturnValue(['worldspawn', 'info_player_start'])
            },
            pickEntity: vi.fn(),
            leafs: []
        };

        const parsedFile = {
            type: 'bsp',
            map: mockMap
        } as any;

        await act(async () => {
            render(
                <UniversalViewer
                    parsedFile={parsedFile}
                    pakService={mockPakService}
                    showControls={true}
                />
            );
        });

        // Wait for WebGL context and adapter init
        await waitFor(() => expect(screen.getByRole('combobox', { name: 'Debug Mode:' })).toBeInTheDocument());

        // Initially debug mode is None, addBox should not be called (or cleared only)
        // Note: The render loop runs continuously in UniversalViewer via requestAnimationFrame.
        // In JSDOM requestAnimationFrame is mocked or handled via vi.useFakeTimers typically,
        // but here we are relying on the effect loop.
        // We might need to advance timers if we want to test loop behavior rigorously,
        // but let's see if selecting the option triggers state update and subsequent render calls.

        // Select Bounding Boxes
        const select = screen.getByRole('combobox', { name: 'Debug Mode:' });
        fireEvent.change(select, { target: { value: DebugMode.BoundingBoxes } });

        // Wait for next render cycle
        await waitFor(() => {
             // We expect addBox to be called for worldspawn (model) and info_player_start (origin)
             expect(mockAddBox).toHaveBeenCalled();
        }, { timeout: 1000 });

        // Check if render was called
        expect(mockRender).toHaveBeenCalled();

        // Check arguments for worldspawn box
        // model 0: min -10,-10,-10 max 10,10,10
        expect(mockAddBox).toHaveBeenCalledWith(
             expect.objectContaining({ 0: -10, 1: -10, 2: -10 }), // roughly matching vec3
             expect.objectContaining({ 0: 10, 1: 10, 2: 10 }),
             expect.anything()
        );

        // Check arguments for point entity box
        // origin 100,100,100 -> min 92,92,92 max 108,108,108 (size 16)
        expect(mockAddBox).toHaveBeenCalledWith(
            expect.objectContaining({ 0: 92, 1: 92, 2: 92 }),
            expect.objectContaining({ 0: 108, 1: 108, 2: 108 }),
            expect.anything()
       );
    });
});
