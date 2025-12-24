import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BspAnalyzer } from '@/src/components/BspAnalyzer';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BspMap } from 'quake2ts/engine';
import { PakService } from '@/src/services/pakService';

// Mock dependencies
vi.mock('@/src/components/UniversalViewer/UniversalViewer', () => ({
    UniversalViewer: () => <div data-testid="universal-viewer">Universal Viewer</div>
}));

vi.mock('@/src/components/LightmapInspector', () => ({
    LightmapInspector: () => <div data-testid="lightmap-inspector">Lightmap Inspector</div>
}));

describe('BspAnalyzer', () => {
    let mockMap: BspMap;
    let mockPakService: PakService;

    beforeEach(() => {
        // Setup mock map with stats data
        mockMap = {
            models: [{}],
            entities: [{ classname: 'worldspawn' }, { classname: 'info_player_start' }],
            faces: [
                { numEdges: 3, texInfo: 0 },
                { numEdges: 4, texInfo: 0 },
                { numEdges: 4, texInfo: 1 }
            ],
            vertices: new Array(10),
            brushes: new Array(5),
            nodes: new Array(5),
            leafs: new Array(5),
            vis: { numClusters: 10, buffer: new Uint8Array(100) },
            // Mock texture info
            texInfo: [
                 { texture: 'wall' },
                 { texture: 'floor' }
            ]
        } as unknown as BspMap;

        mockPakService = {} as PakService;
    });

    it('calculates and displays geometry stats correctly', () => {
        render(<BspAnalyzer map={mockMap} pakService={mockPakService} filePath="maps/test.bsp" />);

        // Switch to Geometry tab
        fireEvent.click(screen.getByText('Geometry'));

        // Check Faces count
        expect(screen.getByText('3')).toBeInTheDocument(); // 3 faces

        // Check Texture Usage
        const wallElements = screen.getAllByText('wall');
        expect(wallElements.length).toBeGreaterThan(0);

        // Percentages
        expect(screen.getByText('66.7%')).toBeInTheDocument();
        expect(screen.getByText('33.3%')).toBeInTheDocument();

        // Check Avg Tris/Face
        expect(screen.getByText('1.7')).toBeInTheDocument();
    });

    it('calculates and displays visibility stats correctly', () => {
        render(<BspAnalyzer map={mockMap} pakService={mockPakService} filePath="maps/test.bsp" />);

        // Switch to Visibility tab
        fireEvent.click(screen.getByText('Visibility'));

        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('0.1 KB')).toBeInTheDocument(); // 100 bytes
    });

    it('calculates and displays entity stats correctly', () => {
        render(<BspAnalyzer map={mockMap} pakService={mockPakService} filePath="maps/test.bsp" />);

        // Switch to Entities tab.
        const buttons = screen.getAllByRole('button');
        const entitiesButton = buttons.find(b => b.textContent === 'Entities');
        if (entitiesButton) {
            fireEvent.click(entitiesButton);
        } else {
            throw new Error('Entities button not found');
        }

        // Use getAllByText for "2" because it appears multiple times (Total Entities: 2, Unique Types: 2)
        const twos = screen.getAllByText('2');
        expect(twos.length).toBeGreaterThan(0);

        // worldspawn appears in both table body and header? No, just body.
        // But maybe twice? Once in 'Types' table, once in 'List' table.
        const worldspawns = screen.getAllByText('worldspawn');
        expect(worldspawns.length).toBeGreaterThan(0);

        const infoStarts = screen.getAllByText('info_player_start');
        expect(infoStarts.length).toBeGreaterThan(0);
    });
});
