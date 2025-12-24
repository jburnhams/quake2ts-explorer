import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BspAnalyzer } from '@/src/components/BspAnalyzer';
import { PakService } from '@/src/services/pakService';
import { BspMap } from 'quake2ts/engine';

// Mock dependencies
vi.mock('@/src/components/UniversalViewer/UniversalViewer', () => ({
    UniversalViewer: () => <div data-testid="universal-viewer">Universal Viewer</div>
}));

vi.mock('@/src/components/LightmapInspector', () => ({
    LightmapInspector: () => <div>Lightmap Inspector</div>
}));

describe('BspAnalyzer Integration', () => {
    let mockPakService: PakService;
    let mockMap: BspMap;

    beforeEach(() => {
        mockPakService = {
            // Mock methods as needed
        } as unknown as PakService;

        mockMap = {
            faces: [
                 { numEdges: 100, texInfo: 0 }, // Oversized
                 { numEdges: 4, texInfo: 0 }
            ],
            entities: [],
            texInfo: [
                { texture: 'wall' }
            ],
             // Add minimal props to satisfy BspMap if needed
            models: [],
            brushes: [],
            nodes: [],
            leafs: [],
            vis: {},
            vertices: []
        } as unknown as BspMap;
    });

    it('renders optimization tab and shows suggestions', () => {
        render(<BspAnalyzer map={mockMap} pakService={mockPakService} filePath="maps/test.bsp" />);

        // Click on Optimization tab
        fireEvent.click(screen.getByText('Optimization'));

        // Check if suggestion appeared
        expect(screen.getByText('Oversized Surfaces')).toBeInTheDocument();
        expect(screen.getByText(/1 surfaces have more than/)).toBeInTheDocument();
    });
});
