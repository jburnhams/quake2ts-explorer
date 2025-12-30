import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BspOptimizationTab } from '@/src/components/BspOptimizationTab';
import { BspMap } from '@quake2ts/engine';
import { createMockBspMap } from '@quake2ts/test-utils';

describe('BspOptimizationTab', () => {
    it('shows no suggestions when map is optimized', () => {
        const mockMap = createMockBspMap({
            faces: [] as any,
            entities: { entities: [] } as any,
            texInfo: [] as any
        });

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('No significant optimization issues found!')).toBeInTheDocument();
    });

    it('detects oversized surfaces', () => {
        const mockMap = createMockBspMap({
            faces: [
                { numEdges: 70 }, // > 64 triangles
                { numEdges: 4 }
            ] as any,
            entities: { entities: [] } as any,
            texInfo: [] as any
        });

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('Oversized Surfaces')).toBeInTheDocument();
        expect(screen.getByText(/1 surfaces have more than/)).toBeInTheDocument();
    });

    it('detects unused textures', () => {
        // Need to ensure texInfo structure matches BspAnalyzer expectations
        // The component likely uses faces[i].texInfo/texinfo to index into texInfo array
        // We need to match what BspOptimizationTab expects.
        // Assuming it's consistent with BspAnalyzer.
        const mockMap = createMockBspMap({
            faces: [
                { numEdges: 4, texInfo: 0 }
            ] as any,
            entities: { entities: [] } as any,
            texInfo: [
                { texture: 'used_tex' },
                { texture: 'unused_tex' }
            ] as any
        });

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('Unused Textures')).toBeInTheDocument();
        expect(screen.getByText(/1 textures are defined but not used/)).toBeInTheDocument();
    });

     it('detects degenerate faces', () => {
        const mockMap = createMockBspMap({
            faces: [
                { numEdges: 2 } // < 3 edges
            ] as any,
            entities: { entities: [] } as any,
            texInfo: [] as any
        });

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('Degenerate Faces')).toBeInTheDocument();
    });
});
