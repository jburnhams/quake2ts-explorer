import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { usePakExplorer } from '../../src/hooks/usePakExplorer';

jest.mock('../../src/hooks/usePakExplorer');

// Mock quake2ts/engine parts used by BspAdapter
jest.mock('quake2ts/engine', () => ({
    createWebGLContext: jest.fn().mockReturnValue({
        gl: {
            getExtension: jest.fn(),
            getParameter: jest.fn(),
            enable: jest.fn(),
            clear: jest.fn(),
            clearColor: jest.fn(),
            viewport: jest.fn(),
            createVertexArray: jest.fn(),
            bindVertexArray: jest.fn(),
            drawElements: jest.fn(),
            activeTexture: jest.fn(),
        }
    }),
    Camera: jest.fn().mockImplementation(() => ({
        projectionMatrix: new Float32Array(16),
        viewMatrix: new Float32Array(16),
        position: { set: jest.fn() },
        angles: { set: jest.fn() },
        updateMatrices: jest.fn(),
    })),
    BspSurfacePipeline: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
    createBspSurfaces: jest.fn().mockReturnValue([]),
    buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
    resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(32)),
    applySurfaceState: jest.fn(),
    Texture2D: jest.fn().mockImplementation(() => ({ bind: jest.fn() })),
    parseWal: jest.fn(),
    walToRgba: jest.fn(),
}));

jest.mock('gl-matrix', () => ({
    mat4: {
        create: () => new Float32Array(16),
        multiply: jest.fn(),
        lookAt: jest.fn(),
        copy: jest.fn()
    },
    vec3: {
        create: () => new Float32Array(3),
        fromValues: () => new Float32Array(3),
        copy: jest.fn(),
        set: jest.fn(),
        clone: jest.fn().mockImplementation(v => new Float32Array(v)),
        add: jest.fn(),
        scale: jest.fn(),
        cross: jest.fn(),
        normalize: jest.fn(),
    }
}));

// Mock ViewerControls to avoid complexity
jest.mock('../../src/components/UniversalViewer/ViewerControls', () => ({
    ViewerControls: () => <div />
}));

describe('Legend Integration', () => {
    beforeEach(() => {
         jest.clearAllMocks();
         (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
         (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
    });

    it('shows entity legend when BSP is loaded', async () => {
        const classnames = ['worldspawn', 'func_door'];
        const mockMap = {
            header: { version: 38 },
            entities: {
                getUniqueClassnames: jest.fn().mockReturnValue(classnames),
                entities: []
            },
            texInfo: [],
            models: [],
            faces: [],
            vertices: [],
            leafs: []
        };

        (usePakExplorer as jest.Mock).mockReturnValue({
            pakService: { hasFile: jest.fn(), readFile: jest.fn() },
            fileTree: { name: 'root', children: [] },
            selectedPath: 'maps/test.bsp',
            metadata: { name: 'test.bsp', extension: 'bsp', size: 100, path: 'maps/test.bsp' },
            parsedFile: { type: 'bsp', map: mockMap },
            pakCount: 1,
            fileCount: 5,
            loading: false,
            error: null,
            handleFileSelect: jest.fn(),
            handleTreeSelect: jest.fn(),
            hasFile: jest.fn(),
            dismissError: jest.fn(),
            loadFromUrl: jest.fn(),
        });

        render(<App />);

        // Wait for rendering and async effects
        await waitFor(() => {
            expect(screen.getByText(/Entities \(2\)/)).toBeInTheDocument();
        });

        expect(screen.getByText('worldspawn')).toBeInTheDocument();
        expect(screen.getByText('func_door')).toBeInTheDocument();
    });

    it('rebuilds geometry when entity visibility is toggled', async () => {
        const classnames = ['worldspawn', 'func_door'];
        const mockMap = {
            header: { version: 38 },
            entities: {
                getUniqueClassnames: jest.fn().mockReturnValue(classnames),
                entities: []
            },
            texInfo: [],
            models: [],
            faces: [],
            vertices: [],
            leafs: []
        };
        const quake2ts = require('quake2ts/engine');

        // Need surfaces to prevent bail out
        quake2ts.createBspSurfaces.mockReturnValue([{}]);

        // Setup buildBspGeometry return
        quake2ts.buildBspGeometry.mockReturnValue({ surfaces: [], lightmaps: [] });

        (usePakExplorer as jest.Mock).mockReturnValue({
            pakService: { hasFile: jest.fn(), readFile: jest.fn() },
            fileTree: { name: 'root', children: [] },
            selectedPath: 'maps/test.bsp',
            metadata: { name: 'test.bsp', extension: 'bsp', size: 100, path: 'maps/test.bsp' },
            parsedFile: { type: 'bsp', map: mockMap },
            pakCount: 1,
            fileCount: 5,
            loading: false,
            error: null,
            handleFileSelect: jest.fn(),
            handleTreeSelect: jest.fn(),
            hasFile: jest.fn(),
            dismissError: jest.fn(),
            loadFromUrl: jest.fn(),
        });

        render(<App />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByTestId('toggle-func_door')).toBeInTheDocument();
        });

        // Wait for adapter load
        await new Promise(resolve => setTimeout(resolve, 0));

        // Clear initial build call
        quake2ts.buildBspGeometry.mockClear();

        const toggle = screen.getByTestId('toggle-func_door');
        fireEvent.click(toggle);

        // Expect rebuild with hidden classname
        await waitFor(() => {
            expect(quake2ts.buildBspGeometry).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                mockMap,
                { hiddenClassnames: new Set(['func_door']) }
            );
        });
    });
});
