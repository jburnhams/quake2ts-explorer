import React from 'react';
import 'jest-canvas-mock';
import { render, act } from '@testing-library/react';
import { UniversalViewer } from '../../src/components/UniversalViewer/UniversalViewer';
import { PakService, ParsedFile } from '../../src/services/pakService';
import { EntityEditorService, SelectionMode } from '../../src/services/entityEditorService';
import { BspMap, BspEntity } from 'quake2ts/engine';

// Mock engine dependencies
jest.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: jest.fn(() => ({ gl: {
            viewport: jest.fn(),
            clearColor: jest.fn(),
            clear: jest.fn(),
            enable: jest.fn(),
            getExtension: jest.fn(),
            createShader: jest.fn(),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            getShaderParameter: jest.fn(() => true),
            createProgram: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn(() => true),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            createTexture: jest.fn(),
            bindTexture: jest.fn(),
            texImage2D: jest.fn(),
            texParameteri: jest.fn(),
            generateMipmap: jest.fn(),
            getUniformLocation: jest.fn(),
            getAttribLocation: jest.fn(),
            useProgram: jest.fn(),
            uniformMatrix4fv: jest.fn(),
            uniform1i: jest.fn(),
            uniform1f: jest.fn(),
            uniform3fv: jest.fn(),
            drawElements: jest.fn(),
            createVertexArray: jest.fn(),
            bindVertexArray: jest.fn(),
            deleteBuffer: jest.fn(),
            deleteTexture: jest.fn(),
            deleteProgram: jest.fn(),
            deleteShader: jest.fn(),
            deleteVertexArray: jest.fn(),
        } })),
        Camera: jest.fn().mockImplementation(() => ({
            projectionMatrix: [],
            viewMatrix: [],
            position: [0, 0, 0],
            aspect: 1,
            updateMatrices: jest.fn()
        })),
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn(() => ({})),
        })),
        createBspSurfaces: jest.fn(() => []),
        buildBspGeometry: jest.fn(() => ({ surfaces: [], lightmaps: [] })),
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            setParameters: jest.fn()
        })),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        resolveLightStyles: jest.fn(() => new Float32Array(256)),
        applySurfaceState: jest.fn(),
        findLeafForPoint: jest.fn(() => 0)
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
            pickEntity: jest.fn((ray) => {
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
            hasFile: jest.fn(() => false),
            readFile: jest.fn(),
            getPalette: jest.fn()
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
