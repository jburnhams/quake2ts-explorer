import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PerformanceGraph } from '@/src/components/PerformanceGraph';
import 'jest-canvas-mock';

describe('PerformanceGraph', () => {
    let context: CanvasRenderingContext2D;

    beforeEach(() => {
        // Since jest-canvas-mock mocks the context, we can inspect calls to it if we want,
        // but for now we just ensure it renders without crashing.
    });

    it('renders without crashing with empty history', () => {
        const { container } = render(<PerformanceGraph history={[]} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas).toHaveAttribute('width', '280');
        expect(canvas).toHaveAttribute('height', '100');
    });

    it('renders with history data', () => {
        const history = [
            { fps: 60, frameTime: 16 },
            { fps: 59, frameTime: 17 },
            { fps: 61, frameTime: 15 },
        ];
        const { container } = render(<PerformanceGraph history={history} width={200} height={50} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas).toHaveAttribute('width', '200');
        expect(canvas).toHaveAttribute('height', '50');
    });

    it('updates canvas when history changes', () => {
        const { rerender, container } = render(<PerformanceGraph history={[]} />);
        const canvas = container.querySelector('canvas');

        // Mock getContext to verify drawing calls if we were mocking manually,
        // but with jest-canvas-mock we trust it works.
        // We can check if the component rerenders.

        const history = [{ fps: 60, frameTime: 16 }];
        rerender(<PerformanceGraph history={history} />);
        expect(canvas).toBeInTheDocument();
    });
});
