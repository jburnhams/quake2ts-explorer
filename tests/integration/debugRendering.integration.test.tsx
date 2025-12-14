import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UniversalViewer } from '../../src/components/UniversalViewer/UniversalViewer';
import { PakService } from '../../src/services/pakService';
import { DebugMode } from '../../src/types/debugMode';
import '@testing-library/jest-dom';

// Mocks
const mockAddBox = jest.fn();
const mockRender = jest.fn();
const mockClear = jest.fn();

jest.mock('../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
  return {
    DebugRenderer: jest.fn().mockImplementation(() => ({
      init: jest.fn(),
      clear: mockClear,
      addBox: mockAddBox,
      addLine: jest.fn(),
      render: mockRender
    }))
  };
});

jest.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: jest.fn().mockReturnValue({
            gl: {
                clearColor: jest.fn(),
                clear: jest.fn(),
                enable: jest.fn(),
                viewport: jest.fn(),
                createShader: jest.fn(),
                createProgram: jest.fn(),
                createBuffer: jest.fn(),
                createVertexArray: jest.fn(),
                bindBuffer: jest.fn(),
                bindVertexArray: jest.fn(),
                bufferData: jest.fn(),
                vertexAttribPointer: jest.fn(),
                enableVertexAttribArray: jest.fn(),
                useProgram: jest.fn(),
                getUniformLocation: jest.fn(),
                uniformMatrix4fv: jest.fn(),
                drawElements: jest.fn(),
                drawArrays: jest.fn(),
                getShaderParameter: jest.fn().mockReturnValue(true),
                getProgramParameter: jest.fn().mockReturnValue(true),
                activeTexture: jest.fn(),
                generateMipmap: jest.fn(),
                texParameteri: jest.fn(),
                texImage2D: jest.fn(),
                deleteShader: jest.fn(),
                deleteProgram: jest.fn(),
                deleteBuffer: jest.fn(),
                deleteVertexArray: jest.fn(),
                COLOR_BUFFER_BIT: 16384,
                DEPTH_BUFFER_BIT: 256,
                DEPTH_TEST: 2929,
                CULL_FACE: 2884,
                TRIANGLES: 4,
                UNSIGNED_SHORT: 5123,
                FLOAT: 5126,
                ARRAY_BUFFER: 34962,
                STATIC_DRAW: 35044,
                DYNAMIC_DRAW: 35048,
                FRAGMENT_SHADER: 35632,
                VERTEX_SHADER: 35633,
                COMPILE_STATUS: 35713,
                LINK_STATUS: 35714,
                TEXTURE0: 33984,
                TEXTURE_2D: 3553,
                LINEAR: 9729,
                LINEAR_MIPMAP_LINEAR: 9987,
                REPEAT: 10497,
                RGBA: 6408,
                UNSIGNED_BYTE: 5121,
                LINES: 1,
            }
        }),
        Camera: jest.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            position: new Float32Array(3),
            updateMatrices: jest.fn(),
        })),
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn().mockReturnValue({}),
        })),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: jest.fn(),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
        applySurfaceState: jest.fn(),
        findLeafForPoint: jest.fn().mockReturnValue(-1),
    };
});

describe('Debug Rendering Integration', () => {
    let mockPakService: PakService;

    beforeEach(() => {
        mockPakService = {
            hasFile: jest.fn().mockReturnValue(false),
            readFile: jest.fn(),
            getPalette: jest.fn(),
        } as unknown as PakService;

        jest.clearAllMocks();
    });

    it('enables bounding box visualization when selected in UI', async () => {
        const mockMap = {
            models: [{ min: [-10, -10, -10], max: [10, 10, 10] }],
            entities: {
                entities: [
                    { classname: 'worldspawn' }, // Should map to model 0
                    { classname: 'info_player_start', properties: { origin: '100 100 100' } } // Should draw box at origin
                ],
                getUniqueClassnames: jest.fn().mockReturnValue(['worldspawn', 'info_player_start'])
            },
            pickEntity: jest.fn(),
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
        // In JSDOM requestAnimationFrame is mocked or handled via jest.useFakeTimers typically,
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
