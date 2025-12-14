import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PerformanceStats } from '@/src/components/PerformanceStats';
import { RenderStatistics } from '@/src/types/renderStatistics';

describe('PerformanceStats', () => {
    const mockStats: RenderStatistics = {
        cpuFrameTimeMs: 16.6,
        gpuTimeMs: 10.5,
        drawCalls: 10,
        triangles: 1000,
        vertices: 3000,
        textureBinds: 5,
        visibleSurfaces: 100,
        culledSurfaces: 50,
        textureMemoryBytes: 1024 * 1024 * 10, // 10 MB
        bufferMemoryBytes: 1024 * 1024 * 5,   // 5 MB
        simulationTimeMs: 4.5,
        renderTimeMs: 12.1
    };

    it('renders FPS correctly', () => {
        render(<PerformanceStats fps={60} stats={null} />);
        expect(screen.getByText('60')).toBeInTheDocument();
        expect(screen.getByText('FPS')).toBeInTheDocument();
    });

    it('renders color-coded FPS', () => {
        const { rerender } = render(<PerformanceStats fps={60} stats={null} />);
        let fpsElement = screen.getByText('60');
        expect(fpsElement).toHaveStyle({ color: '#4ade80' }); // Green

        rerender(<PerformanceStats fps={45} stats={null} />);
        fpsElement = screen.getByText('45');
        expect(fpsElement).toHaveStyle({ color: '#facc15' }); // Yellow

        rerender(<PerformanceStats fps={20} stats={null} />);
        fpsElement = screen.getByText('20');
        expect(fpsElement).toHaveStyle({ color: '#ef4444' }); // Red
    });

    it('renders render stats when provided', () => {
        render(<PerformanceStats fps={60} stats={mockStats} />);

        expect(screen.getByText('10')).toBeInTheDocument(); // Draw calls
        expect(screen.getByText('1,000')).toBeInTheDocument(); // Triangles
        expect(screen.getByText('3,000')).toBeInTheDocument(); // Vertices
        expect(screen.getByText('5')).toBeInTheDocument(); // Texture binds

        // Memory
        expect(screen.getByText('10 MB')).toBeInTheDocument();
        expect(screen.getByText('5 MB')).toBeInTheDocument();

        // Timing
        expect(screen.getByText('16.60 ms')).toBeInTheDocument();
        expect(screen.getByText('10.50 ms')).toBeInTheDocument();

        // Simulation/Rendering breakdown
        expect(screen.getByText('Simulation')).toBeInTheDocument();
        expect(screen.getByText(/4.50 ms/)).toBeInTheDocument();
        expect(screen.getAllByText('Rendering').length).toBeGreaterThan(0);
        expect(screen.getByText(/12.10 ms/)).toBeInTheDocument();
    });

    it('renders min/max fps when provided', () => {
        render(<PerformanceStats fps={60} minFps={30} maxFps={90} stats={null} />);
        expect(screen.getByText('30 / 90')).toBeInTheDocument();
    });
});
