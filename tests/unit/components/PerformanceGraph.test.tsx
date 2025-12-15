
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PerformanceGraph } from '@/src/components/PerformanceGraph';

// Mock canvas
import 'jest-canvas-mock';

describe('PerformanceGraph', () => {
    it('renders canvas element', () => {
        const history = [{ fps: 60, frameTime: 16.6 }];
        render(<PerformanceGraph history={history} />);
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas).toHaveAttribute('width', '280');
        expect(canvas).toHaveAttribute('height', '100');
    });

    it('handles empty history', () => {
        render(<PerformanceGraph history={[]} />);
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        // Should not crash
    });

    it('draws with history', () => {
        const history = [
            { fps: 60, frameTime: 16 },
            { fps: 55, frameTime: 18 },
            { fps: 30, frameTime: 33 }
        ];
        render(<PerformanceGraph history={history} />);
        const canvas = document.querySelector('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        expect(ctx?.clearRect).toHaveBeenCalled();
        expect(ctx?.lineTo).toHaveBeenCalled();
        expect(ctx?.stroke).toHaveBeenCalled();
    });
});
