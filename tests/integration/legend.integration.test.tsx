import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../src/App';
import { usePakExplorer } from '../../src/hooks/usePakExplorer';
import { createMockBspMap, createMockWebGL2Context } from '@quake2ts/test-utils';

// Helper to access the engine mock
import * as quake2tsEngine from '@quake2ts/engine';

vi.mock('../../src/hooks/usePakExplorer');

// Mock gl-matrix
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

// Mock quake2ts/engine parts used by BspAdapter
vi.mock('@quake2ts/engine', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@quake2ts/engine')>();
    return {
        ...actual,
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
        createWebGLContext: vi.fn().mockImplementation(() => ({
            gl: createMockWebGL2Context(),
            extensions: new Map(),
            isLost: () => false,
            onLost: () => () => {},
            onRestored: () => () => {},
            dispose: () => {}
        })),
        Camera: vi.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            position: { set: vi.fn() },
            angles: { set: vi.fn() },
            updateMatrices: vi.fn(),
        })),
        BspSurfacePipeline: vi.fn().mockImplementation(() => ({ bind: vi.fn() })),
        // Explicitly defining as vi.fn() to allow .mockReturnValue
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
    };
});

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
        const mockMap = createMockBspMap({
            header: { version: 38, lumps: new Map() },
            entities: {
                getUniqueClassnames: vi.fn().mockReturnValue(classnames),
                entities: [],
                raw: '',
                worldspawn: undefined
            }
        } as any);

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
        const mockMap = createMockBspMap({
            header: { version: 38, lumps: new Map() },
            entities: {
                getUniqueClassnames: vi.fn().mockReturnValue(classnames),
                entities: [],
                raw: '',
                worldspawn: undefined
            }
        } as any);

        // Need surfaces to prevent bail out
        vi.mocked(quake2tsEngine.createBspSurfaces).mockReturnValue([{} as any]);

        // Setup buildBspGeometry return
        vi.mocked(quake2tsEngine.buildBspGeometry).mockReturnValue({ surfaces: [], lightmaps: [] });

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
        vi.mocked(quake2tsEngine.buildBspGeometry).mockClear();

        const toggle = screen.getByTestId('toggle-func_door');
        fireEvent.click(toggle);

        // Expect rebuild with hidden classname
        await waitFor(() => {
            expect(quake2tsEngine.buildBspGeometry).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                mockMap,
                { hiddenClassnames: new Set(['func_door']) }
            );
        });
    });
});
