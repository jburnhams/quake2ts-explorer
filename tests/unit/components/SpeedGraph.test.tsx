import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { SpeedGraph } from '../../../src/components/SpeedGraph';

describe('SpeedGraph', () => {
    it('renders without crashing', () => {
        render(<SpeedGraph history={[100, 200, 300]} />);
    });

    it('renders with empty history', () => {
        const { container } = render(<SpeedGraph history={[]} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
    });

    it('renders with custom size', () => {
        const { container } = render(<SpeedGraph history={[100]} width={500} height={200} />);
        const canvas = container.querySelector('canvas');
        expect(canvas).toHaveAttribute('width', '500');
        expect(canvas).toHaveAttribute('height', '200');
    });
});
