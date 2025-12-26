import React from 'react';

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../../src/App';
import { usePakExplorer } from '../../src/hooks/usePakExplorer';

vi.mock('../../src/hooks/usePakExplorer');

// Mock quake2ts/engine parts used by BspAdapter
vi.mock('@quake2ts/engine', () => ({
    VirtualFileSystem: vi.fn().mockImplementation(() => ({
        readFile: vi.fn(),
        stat: vi.fn(),
        list: vi.fn(),
        mountPak: vi.fn(),
        hasFile: vi.fn(),
        findByExtension: vi.fn().mockReturnValue([]),
    })),
    PakArchive: {
        fromArrayBuffer: vi.fn(),
    },
    createWebGLContext: vi.fn().mockReturnValue({
        gl: {
            getExtension: vi.fn(),
            getParameter: vi.fn(),
            enable: vi.fn(),
            clear: vi.fn(),
            clearColor: vi.fn(),
            viewport: vi.fn(),
            createVertexArray: vi.fn(),
            bindVertexArray: vi.fn(),
            drawElements: vi.fn(),
            activeTexture: vi.fn(),
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
            useProgram: vi.fn(),
            getUniformLocation: vi.fn(),
            uniformMatrix4fv: vi.fn(),
            uniform3fv: vi.fn(),
            uniform4fv: vi.fn(),
            drawArrays: vi.fn(),
            deleteShader: vi.fn(),
        }
    }),
    Camera: vi.fn().mockImplementation(() => ({
        projectionMatrix: new Float32Array(16),
        viewMatrix: new Float32Array(16),
        position: { set: vi.fn() },
        angles: { set: vi.fn() },
        updateMatrices: vi.fn(),
    })),
    BspSurfacePipeline: vi.fn().mockImplementation(() => ({ bind: vi.fn() })),
    createBspSurfaces: vi.fn().mockReturnValue([]),
    buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
    resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(32)),
    applySurfaceState: vi.fn(),
    Texture2D: vi.fn().mockImplementation(() => ({
        bind: vi.fn(),
        uploadImage: vi.fn(),
        setParameters: vi.fn(),
    })),
    parseWal: vi.fn(),
    walToRgba: vi.fn(),
}));

vi.mock('gl-matrix', () => ({
    mat4: {
        create: () => new Float32Array(16),
        multiply: vi.fn(),
        lookAt: vi.fn(),
        copy: vi.fn()
    },
    vec3: {
        create: () => new Float32Array(3),
        fromValues: () => new Float32Array(3),
        copy: vi.fn(),
        set: vi.fn(),
        clone: vi.fn().mockImplementation(v => new Float32Array(v)),
        add: vi.fn(),
        sub: vi.fn(),
        scale: vi.fn(),
        scaleAndAdd: vi.fn(),
        cross: vi.fn(),
        normalize: vi.fn(),
        dot: vi.fn(),
        length: vi.fn(),
    },
    vec4: {
        create: () => new Float32Array(4),
        fromValues: () => new Float32Array(4),
    }
}));

// Mock ViewerControls to avoid complexity
vi.mock('../../src/components/UniversalViewer/ViewerControls', () => ({
    ViewerControls: () => <div />
}));

// Mock DebugRenderer
vi.mock('../../src/components/UniversalViewer/adapters/DebugRenderer', () => {
    return {
        DebugRenderer: vi.fn().mockImplementation(() => ({
            clear: vi.fn(),
            addBox: vi.fn(),
            addLine: vi.fn(),
            render: vi.fn(),
            init: vi.fn()
        }))
    };
});

describe('Legend Integration', () => {
    beforeEach(() => {
         vi.clearAllMocks();
         (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
         (global as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
    });

    it('shows entity legend when BSP is loaded', async () => {
        const classnames = ['worldspawn', 'func_door'];
        const mockMap = {
            header: { version: 38 },
            entities: {
                getUniqueClassnames: vi.fn().mockReturnValue(classnames),
                entities: []
            },
            texInfo: [],
            models: [],
            faces: [],
            vertices: [],
            leafs: []
        };

        (usePakExplorer as vi.Mock).mockReturnValue({
            pakService: { hasFile: vi.fn(), readFile: vi.fn() },
            fileTree: { name: 'root', children: [] },
            selectedPath: 'maps/test.bsp',
            metadata: { name: 'test.bsp', extension: 'bsp', size: 100, path: 'maps/test.bsp' },
            parsedFile: { type: 'bsp', map: mockMap },
            pakCount: 1,
            fileCount: 5,
            loading: false,
            error: null,
            handleFileSelect: vi.fn(),
            handleTreeSelect: vi.fn(),
            hasFile: vi.fn(),
            dismissError: vi.fn(),
            loadFromUrl: vi.fn(),
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
                getUniqueClassnames: vi.fn().mockReturnValue(classnames),
                entities: []
            },
            texInfo: [],
            models: [],
            faces: [],
            vertices: [],
            leafs: []
        };
        const quake2ts = require('@quake2ts/engine');

        // Need surfaces to prevent bail out
        quake2ts.createBspSurfaces.mockReturnValue([{}]);

        // Setup buildBspGeometry return
        quake2ts.buildBspGeometry.mockReturnValue({ surfaces: [], lightmaps: [] });

        (usePakExplorer as vi.Mock).mockReturnValue({
            pakService: { hasFile: vi.fn(), readFile: vi.fn() },
            fileTree: { name: 'root', children: [] },
            selectedPath: 'maps/test.bsp',
            metadata: { name: 'test.bsp', extension: 'bsp', size: 100, path: 'maps/test.bsp' },
            parsedFile: { type: 'bsp', map: mockMap },
            pakCount: 1,
            fileCount: 5,
            loading: false,
            error: null,
            handleFileSelect: vi.fn(),
            handleTreeSelect: vi.fn(),
            hasFile: vi.fn(),
            dismissError: vi.fn(),
            loadFromUrl: vi.fn(),
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
