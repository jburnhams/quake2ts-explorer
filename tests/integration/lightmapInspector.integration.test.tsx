import React from 'react';
import { render, screen } from '@testing-library/react';
import { BspAnalyzer } from '@/src/components/BspAnalyzer';
import { PakService } from '@/src/services/pakService';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';

// Mock dependencies
vi.mock('quake2ts/engine', () => ({
    BspMap: class {},
    Texture2D: vi.fn(),
    createBspSurfaces: vi.fn().mockReturnValue([]),
    buildBspGeometry: vi.fn().mockReturnValue({ lightmaps: [], surfaces: [] }),
    BspSurfacePipeline: vi.fn().mockImplementation(() => ({
        bind: vi.fn()
    })),
    resolveLightStyles: vi.fn().mockReturnValue([]),
    applySurfaceState: vi.fn(),
    findLeafForPoint: vi.fn().mockReturnValue(-1)
}));

vi.mock('@/src/components/UniversalViewer/UniversalViewer', () => {
    // Import React dynamically inside the mock
    const React = require('react');
    return {
        UniversalViewer: ({ onAdapterReady }: any) => {
            React.useEffect(() => {
                if (onAdapterReady) {
                    onAdapterReady({
                        getLightmaps: () => [
                            { gl: {}, texture: {} },
                            { gl: {}, texture: {} }
                        ],
                        load: vi.fn(),
                        update: vi.fn(),
                        render: vi.fn(),
                        cleanup: vi.fn()
                    });
                }
            }, [onAdapterReady]);
            return <div>UniversalViewer Mock</div>;
        }
    };
});

describe('LightmapInspector Integration', () => {
    let mockPakService: PakService;
    let mockMap: any;

    beforeEach(() => {
        mockPakService = {
            hasFile: vi.fn(),
            readFile: vi.fn(),
            getPalette: vi.fn()
        } as any;

        mockMap = {
            models: [],
            vertices: [],
            faces: [],
            brushes: [],
            nodes: [],
            leafs: [],
            planes: [],
            entities: { entities: [], getUniqueClassnames: vi.fn().mockReturnValue([]) },
            lightmaps: new Uint8Array(100)
        };
    });

    it('integrates with BspAnalyzer and shows lightmap tab', async () => {
        await act(async () => {
            render(<BspAnalyzer map={mockMap} pakService={mockPakService} filePath="maps/test.bsp" />);
        });

        // Switch to Lightmaps tab
        const lightmapTab = screen.getByText('Lightmaps');
        await act(async () => {
            lightmapTab.click();
        });

        expect(screen.getByText('Lightmap Inspector')).toBeInTheDocument();

        // Should show lightmaps from the mock adapter
        // The mock adapter provides 2 lightmaps
        expect(screen.getByText('LM 0')).toBeInTheDocument();
        expect(screen.getByText('LM 1')).toBeInTheDocument();
    });
});
