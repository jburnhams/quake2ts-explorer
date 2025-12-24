import React from 'react';
import 'jest-canvas-mock';
import { render, act } from '@testing-library/react';
import { UniversalViewer } from '../../src/components/UniversalViewer/UniversalViewer';
import { PakService, ParsedFile } from '../../src/services/pakService';
import { EntityEditorService, SelectionMode } from '../../src/services/entityEditorService';
import { BspMap, BspEntity } from 'quake2ts/engine';

// Mock engine dependencies
vi.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: vi.fn(() => ({ gl: {
            viewport: vi.fn(),
            clearColor: vi.fn(),
            clear: vi.fn(),
            enable: vi.fn(),
            getExtension: vi.fn(),
            createShader: vi.fn(),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn(() => true),
            createProgram: vi.fn(),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn(() => true),
            createBuffer: vi.fn(),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            createTexture: vi.fn(),
            bindTexture: vi.fn(),
            texImage2D: vi.fn(),
            texParameteri: vi.fn(),
            generateMipmap: vi.fn(),
            getUniformLocation: vi.fn(),
            getAttribLocation: vi.fn(),
            useProgram: vi.fn(),
            uniformMatrix4fv: vi.fn(),
            uniform1i: vi.fn(),
            uniform1f: vi.fn(),
            uniform3fv: vi.fn(),
            drawElements: vi.fn(),
            createVertexArray: vi.fn(),
            bindVertexArray: vi.fn(),
            deleteBuffer: vi.fn(),
            deleteTexture: vi.fn(),
            deleteProgram: vi.fn(),
            deleteShader: vi.fn(),
            deleteVertexArray: vi.fn(),
        } })),
        Camera: vi.fn().mockImplementation(() => ({
            projectionMatrix: [],
            viewMatrix: [],
            position: [0, 0, 0],
            aspect: 1,
            updateMatrices: vi.fn()
        })),
        BspSurfacePipeline: vi.fn().mockImplementation(() => ({
            bind: vi.fn(() => ({})),
        })),
        createBspSurfaces: vi.fn(() => []),
        buildBspGeometry: vi.fn(() => ({ surfaces: [], lightmaps: [] })),
        Texture2D: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            uploadImage: vi.fn(),
            setParameters: vi.fn()
        })),
        parseWal: vi.fn(),
        walToRgba: vi.fn(),
        resolveLightStyles: vi.fn(() => new Float32Array(256)),
        applySurfaceState: vi.fn(),
        findLeafForPoint: vi.fn(() => 0)
    };
});

describe('Entity Manipulation Integration', () => {
    let mockPakService: PakService;
    let mockBspMap: BspMap;
    let mockEntities: BspEntity[];

    beforeEach(() => {
        EntityEditorService.getInstance().reset();

        mockEntities = [
            { classname: 'worldspawn', properties: { origin: '0 0 0' } } as any,
            { classname: 'info_player_start', properties: { origin: '100 0 0' } } as any,
            { classname: 'weapon_shotgun', properties: { origin: '200 0 0' } } as any
        ];

        mockBspMap = {
            entities: {
                entities: mockEntities,
                getUniqueClassnames: () => ['worldspawn', 'info_player_start', 'weapon_shotgun']
            },
            pickEntity: vi.fn((ray) => {
                // Mock picking logic: always pick 2nd entity if ray direction is roughly X
                if (ray.direction[0] > 0.9) {
                    return { entity: mockEntities[1], distance: 100 };
                }
                return null;
            }),
            models: [],
            faces: [],
            planes: [],
            leafs: []
        } as any;

        mockPakService = {
            hasFile: vi.fn(() => false),
            readFile: vi.fn(),
            getPalette: vi.fn()
        } as any;
    });

    test('Loads BSP, populates EntityEditorService, and selects entity on click', async () => {
        const parsedFile: ParsedFile = {
            type: 'bsp',
            map: mockBspMap
        };

        let viewer: any;
        await act(async () => {
            const result = render(
                <UniversalViewer
                    parsedFile={parsedFile}
                    pakService={mockPakService}
                    filePath="maps/test.bsp"
                />
            );
            viewer = result;
        });

        // Wait for async load (simulated in act)

        // Verify service was populated
        expect(EntityEditorService.getInstance().getEntity(0)).toBe(mockEntities[0]);
        expect(EntityEditorService.getInstance().getEntity(1)).toBe(mockEntities[1]);

        // Simulate picking (we can't easily simulate click -> raycast in JSDOM)
        // So we test the service integration directly by verifying that calling selectEntity triggers updates.

        act(() => {
            EntityEditorService.getInstance().selectEntity(1, SelectionMode.Single);
        });

        expect(EntityEditorService.getInstance().getSelectedEntityIds()).toEqual([1]);

        // In a real browser test we would click the canvas and assert selection.
        // Here we rely on unit tests for the interaction and integration tests for wiring.
    });
});
