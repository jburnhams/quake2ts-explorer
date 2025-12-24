import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SoundAnalyzer } from '@/src/components/SoundAnalyzer';


// Mocks
vi.mock('@/src/services/assetCrossRefService', () => {
    
    return {
        AssetCrossRefService: vi.fn().mockImplementation(() => ({
            findSoundUsage: vi.fn().mockResolvedValue([])
        }))
    };
});

vi.mock('@/src/components/WaveformCanvas', () => ({
    WaveformCanvas: () => <div data-testid="waveform-canvas">Canvas</div>
}));
vi.mock('@/src/components/FrequencySpectrum', () => ({
    FrequencySpectrum: () => <div data-testid="frequency-spectrum">Spectrum</div>
}));

// Mock AudioContext
const mockAudioContext = {
    createBufferSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        disconnect: vi.fn(),
        onended: null
    }),
    createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: { value: 1 }
    }),
    createAnalyser: vi.fn().mockReturnValue({
        connect: vi.fn(),
        frequencyBinCount: 128,
        getByteFrequencyData: vi.fn()
    }),
    createBuffer: vi.fn().mockReturnValue({
        numberOfChannels: 1,
        duration: 10,
        length: 441000,
        sampleRate: 44100,
        getChannelData: () => new Float32Array(441000)
    }),
    decodeAudioData: vi.fn().mockImplementation((buf, cb) => {
        cb({ duration: 10, length: 441000, sampleRate: 44100, numberOfChannels: 1, getChannelData: () => new Float32Array(441000) });
    }),
    state: 'suspended',
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {},
    currentTime: 0,
    close: vi.fn()
};

(global as any).window.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
(global as any).window.webkitAudioContext = (global as any).window.AudioContext;
(global as any).requestAnimationFrame = vi.fn();
(global as any).cancelAnimationFrame = vi.fn();

describe('SoundAnalyzer Coverage', () => {
    let mockPakService: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPakService = {
            readFile: vi.fn().mockResolvedValue(new Uint8Array(100)),
            getFileName: (path: string) => path.split('/').pop() || '',
            getVfs: vi.fn()
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
        global.URL.createObjectURL = vi.fn() as any;
        global.URL.revokeObjectURL = vi.fn() as any;

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
