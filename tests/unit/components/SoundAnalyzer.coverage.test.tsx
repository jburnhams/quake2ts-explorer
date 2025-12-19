import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SoundAnalyzer } from '@/src/components/SoundAnalyzer';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mocks
jest.mock('@/src/services/assetCrossRefService', () => {
    const { jest } = require('@jest/globals');
    return {
        AssetCrossRefService: jest.fn().mockImplementation(() => ({
            findSoundUsage: jest.fn().mockResolvedValue([])
        }))
    };
});

jest.mock('@/src/components/WaveformCanvas', () => ({
    WaveformCanvas: () => <div data-testid="waveform-canvas">Canvas</div>
}));
jest.mock('@/src/components/FrequencySpectrum', () => ({
    FrequencySpectrum: () => <div data-testid="frequency-spectrum">Spectrum</div>
}));

// Mock AudioContext
const mockAudioContext = {
    createBufferSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        disconnect: jest.fn(),
        onended: null
    }),
    createGain: jest.fn().mockReturnValue({
        connect: jest.fn(),
        gain: { value: 1 }
    }),
    createAnalyser: jest.fn().mockReturnValue({
        connect: jest.fn(),
        frequencyBinCount: 128,
        getByteFrequencyData: jest.fn()
    }),
    createBuffer: jest.fn().mockReturnValue({
        numberOfChannels: 1,
        duration: 10,
        length: 441000,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(441000)
    }),
    decodeAudioData: jest.fn().mockImplementation((buf, cb) => {
        cb({ duration: 10, length: 441000, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(441000) });
    }),
    state: 'suspended',
    resume: jest.fn().mockResolvedValue(undefined),
    destination: {},
    currentTime: 0,
    close: jest.fn()
};

(global as any).window.AudioContext = jest.fn().mockImplementation(() => mockAudioContext);
(global as any).window.webkitAudioContext = (global as any).window.AudioContext;
(global as any).requestAnimationFrame = jest.fn();
(global as any).cancelAnimationFrame = jest.fn();

describe('SoundAnalyzer Coverage', () => {
    let mockPakService: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPakService = {
            readFile: jest.fn().mockResolvedValue(new Uint8Array(100)),
            getFileName: (path: string) => path.split('/').pop() || '',
            getVfs: jest.fn()
        };
    });

    const mockAudioData = {
        channels: 1,
        sampleRate: 44100,
        bitsPerSample: 16,
        samples: new Int16Array(100)
    };

    it('should render and handle file selection', async () => {
        await act(async () => {
            render(<SoundAnalyzer
                audio={mockAudioData}
                fileName="test.wav"
                pakService={mockPakService}
            />);
        });

        expect(screen.getByText('test.wav')).toBeInTheDocument();
        expect(screen.getByText('44100 Hz')).toBeInTheDocument();
    });

    it('should handle playback controls', async () => {
        await act(async () => {
            render(<SoundAnalyzer
                audio={mockAudioData}
                fileName="test.wav"
                pakService={mockPakService}
            />);
        });

        const playBtn = screen.getByTestId('play-pause-btn');

        await act(async () => {
            fireEvent.click(playBtn);
        });

        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(playBtn).toHaveTextContent('Pause');

        await act(async () => {
            fireEvent.click(playBtn); // Pause
        });
        expect(playBtn).toHaveTextContent('Play');

        // Stop
        const stopBtn = screen.getByTestId('stop-btn');
        fireEvent.click(stopBtn);
    });

    it('should handle zoom controls', async () => {
        await act(async () => {
            render(<SoundAnalyzer
                audio={mockAudioData}
                fileName="test.wav"
                pakService={mockPakService}
            />);
        });

        const zoomIn = screen.getByTestId('zoom-in-btn');
        const zoomOut = screen.getByTestId('zoom-out-btn');

        await act(async () => {
            fireEvent.click(zoomIn);
        });

        // When zoomed in, scroll slider should appear
        const slider = screen.queryByTestId('scroll-slider');
        expect(slider).toBeInTheDocument();

        if (slider) {
            fireEvent.change(slider, { target: { value: 1 } });
        }

        await act(async () => {
            fireEvent.click(zoomOut);
        });
    });

    it('should handle export wav', async () => {
        // Mock URL.createObjectURL
        global.URL.createObjectURL = jest.fn() as any;
        global.URL.revokeObjectURL = jest.fn() as any;

        await act(async () => {
            render(<SoundAnalyzer
                audio={mockAudioData}
                fileName="test.wav"
                pakService={mockPakService}
            />);
        });

        const exportBtn = screen.getByTestId('export-wav-btn');
        fireEvent.click(exportBtn);

        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
});
