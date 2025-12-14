import React from 'react';
import { render, screen } from '@testing-library/react';
import { FrequencySpectrum } from '@/src/components/FrequencySpectrum';
import 'jest-canvas-mock';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('FrequencySpectrum', () => {
    let mockAnalyser: AnalyserNode;

    beforeAll(() => {
        mockAnalyser = {
            frequencyBinCount: 128,
            getByteFrequencyData: jest.fn((array: Uint8Array) => {
                array.fill(100);
            })
        } as unknown as AnalyserNode;
    });

    it('renders canvas element', () => {
        render(<FrequencySpectrum analyser={mockAnalyser} isPlaying={false} />);
        const canvas = screen.getByTestId('frequency-spectrum');
        expect(canvas).toBeInTheDocument();
    });

    it('renders when playing', () => {
        render(<FrequencySpectrum analyser={mockAnalyser} isPlaying={true} />);
        const canvas = screen.getByTestId('frequency-spectrum');
        expect(canvas).toBeInTheDocument();
    });
});
