import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BspOptimizationTab } from '@/src/components/BspOptimizationTab';
import { BspMap } from 'quake2ts/engine';

describe('BspOptimizationTab', () => {
    it('shows no suggestions when map is optimized', () => {
        const mockMap = {
            faces: [],
            entities: [],
            texInfo: []
        } as unknown as BspMap;

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('No significant optimization issues found!')).toBeInTheDocument();
    });

    it('detects oversized surfaces', () => {
        const mockMap = {
            faces: [
                { numEdges: 70 }, // > 64 triangles
                { numEdges: 4 }
            ],
            entities: [],
            texInfo: []
        } as unknown as BspMap;

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('Oversized Surfaces')).toBeInTheDocument();
        expect(screen.getByText(/1 surfaces have more than/)).toBeInTheDocument();
    });

    it('detects unused textures', () => {
        const mockMap = {
            faces: [
                { numEdges: 4, texInfo: 0 }
            ],
            entities: [],
            texInfo: [
                { texture: 'used_tex' },
                { texture: 'unused_tex' }
            ]
        } as unknown as BspMap;

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('Unused Textures')).toBeInTheDocument();
        expect(screen.getByText(/1 textures are defined but not used/)).toBeInTheDocument();
    });

     it('detects degenerate faces', () => {
        const mockMap = {
            faces: [
                { numEdges: 2 } // < 3 edges
            ],
            entities: [],
            texInfo: []
        } as unknown as BspMap;

        render(<BspOptimizationTab map={mockMap} />);
        expect(screen.getByText('Degenerate Faces')).toBeInTheDocument();
    });
});
