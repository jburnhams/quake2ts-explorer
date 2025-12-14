import React from 'react';
import { render, fireEvent, act, screen, waitFor } from '@testing-library/react';
import { SoundAnalyzer } from '../../../src/components/SoundAnalyzer';

// Mock Web Audio API
const mockAudioContext = {
    createBuffer: jest.fn().mockReturnValue({
        duration: 10,
        getChannelData: jest.fn().mockReturnValue(new Float32Array(100)),
        length: 100,
        numberOfChannels: 1,
        sampleRate: 44100
    }),
    createAnalyser: jest.fn().mockReturnValue({
        fftSize: 2048,
        connect: jest.fn(),
        frequencyBinCount: 1024,
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn(),
    }),
    createBufferSource: jest.fn().mockReturnValue({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
    }),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
    state: 'suspended',
    currentTime: 0,
    destination: {},
};

(window as any).AudioContext = jest.fn(() => mockAudioContext);

jest.mock('../../../src/components/WaveformCanvas', () => ({
    WaveformCanvas: () => <div data-testid="waveform" />
}));
jest.mock('../../../src/components/FrequencySpectrum', () => ({
    FrequencySpectrum: () => <div data-testid="spectrum" />
}));

describe('SoundAnalyzer Branch Coverage', () => {
    const mockAudio = {
        channels: 1,
        sampleRate: 44100,
        bitsPerSample: 16,
        samples: new Int16Array(100)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAudioContext.currentTime = 0;
        mockAudioContext.state = 'suspended';
    });

    it('handles initialization error', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        (window as any).AudioContext.mockImplementationOnce(() => {
            throw new Error('Audio init failed');
        });

        render(<SoundAnalyzer audio={mockAudio} fileName="test.wav" />);

        expect(consoleSpy).toHaveBeenCalledWith("Failed to initialize audio", expect.any(Error));
        consoleSpy.mockRestore();
    });

    it('handles play/pause/stop', async () => {
        render(<SoundAnalyzer audio={mockAudio} fileName="test.wav" />);

        const playBtn = screen.getByTestId('play-pause-btn');

        // Play
        await act(async () => {
            fireEvent.click(playBtn);
        });
        expect(mockAudioContext.resume).toHaveBeenCalled();
        expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
        expect(screen.getByText('Pause')).toBeInTheDocument();

        // Pause
        await act(async () => {
            fireEvent.click(playBtn);
        });
        expect(screen.getByText('Play')).toBeInTheDocument();

        // Play again
        await act(async () => {
            fireEvent.click(playBtn);
        });

        // Stop
        const stopBtn = screen.getByTestId('stop-btn');
        await act(async () => {
            fireEvent.click(stopBtn);
        });
        expect(screen.getByText('Play')).toBeInTheDocument();
    });

    it('handles zoom and scroll limits', async () => {
        render(<SoundAnalyzer audio={mockAudio} fileName="test.wav" />);

        const zoomIn = screen.getByText('+');
        const zoomOut = screen.getByText('-');

        // Zoom in to max
        for (let i = 0; i < 10; i++) {
            fireEvent.click(zoomIn);
        }
        expect(zoomIn).toBeDisabled();

        // Zoom out
        fireEvent.click(zoomOut);
        expect(zoomIn).not.toBeDisabled();

        // Scroll should appear when zoomed
        const slider = await screen.findByTestId('scroll-slider');
        fireEvent.change(slider, { target: { value: '5' } });

        // Zoom out to 1x
        for (let i = 0; i < 10; i++) {
            fireEvent.click(zoomOut);
        }
        expect(zoomOut).toBeDisabled();
        expect(screen.queryByTestId('scroll-slider')).not.toBeInTheDocument();
    });

    it('handles float samples', () => {
        const floatAudio = {
            channels: 1,
            sampleRate: 44100,
            bitsPerSample: 32,
            samples: new Float32Array(100)
        };
        render(<SoundAnalyzer audio={floatAudio} fileName="test.wav" />);
        expect(screen.getByTestId('sound-analyzer')).toBeInTheDocument();
    });
});
