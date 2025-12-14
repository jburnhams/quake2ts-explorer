import React from 'react';
import { render, screen } from '@testing-library/react';
import { WaveformCanvas } from '@/src/components/WaveformCanvas';
import 'jest-canvas-mock';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('WaveformCanvas', () => {
    let mockAudioBuffer: AudioBuffer;

    beforeAll(() => {
        mockAudioBuffer = {
            length: 100,
            duration: 1,
            sampleRate: 44100,
            numberOfChannels: 1,
            getChannelData: jest.fn(() => new Float32Array(100).fill(0.5)),
            copyFromChannel: jest.fn(),
            copyToChannel: jest.fn()
        } as unknown as AudioBuffer;
    });

    it('renders canvas element', () => {
        render(<WaveformCanvas audioBuffer={mockAudioBuffer} />);
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toBeInTheDocument();
    });

    it('renders with custom colors', () => {
        render(<WaveformCanvas audioBuffer={mockAudioBuffer} color="red" backgroundColor="blue" />);
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toBeInTheDocument();
    });

    it('renders with zoom and scroll', () => {
        render(<WaveformCanvas audioBuffer={mockAudioBuffer} zoom={2} scrollOffset={0.5} />);
        const canvas = screen.getByTestId('waveform-canvas');
        expect(canvas).toBeInTheDocument();
    });
});
