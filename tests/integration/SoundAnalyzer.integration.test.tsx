import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { PreviewPanel } from '../../src/components/PreviewPanel';
import { PakService, ParsedFile } from '../../src/services/pakService';
import 'jest-canvas-mock';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mock AudioContext
class MockAudioBufferSourceNode {
    buffer: AudioBuffer | null = null;
    loop: boolean = false;
    connect = vi.fn();
    start = vi.fn();
    stop = vi.fn();
    onended: ((event?: any) => void) | null = null;
}
class MockAnalyserNode {
    fftSize: number = 2048;
    frequencyBinCount: number = 1024;
    connect = vi.fn();
    getByteFrequencyData = vi.fn((array: Uint8Array) => {
        array.fill(128);
    });
}
class MockAudioContext {
    state: string = 'running';
    currentTime: number = 0;
    createBuffer = vi.fn(() => ({
        length: 44100,
        duration: 1.0,
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: vi.fn(() => new Float32Array(44100))
    }));
    createBufferSource = vi.fn(() => new MockAudioBufferSourceNode());
    createAnalyser = vi.fn(() => new MockAnalyserNode());
    resume = vi.fn(async () => {
        this.state = 'running';
    });
    close = vi.fn();
    destination = {};
}
Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: MockAudioContext
});

// Mock AssetCrossRefService
vi.mock('../../src/services/assetCrossRefService', () => ({
    AssetCrossRefService: class {
        constructor() {}
        findSoundUsage = vi.fn().mockResolvedValue([]);
    }
}));

// Mock other heavy components
vi.mock('../../src/components/UniversalViewer/UniversalViewer', () => ({
    UniversalViewer: () => <div data-testid="universal-viewer" />
}));
vi.mock('../../src/components/BspAnalyzer', () => ({
    BspAnalyzer: () => <div data-testid="bsp-analyzer" />
}));
vi.mock('../../src/components/TextureAtlas', () => ({
    TextureAtlas: () => <div data-testid="texture-atlas" />
}));

describe('SoundAnalyzer Integration', () => {
    let pakServiceMock: PakService;

    beforeEach(() => {
        pakServiceMock = {
            hasFile: vi.fn(),
            readFile: vi.fn(),
            parseFile: vi.fn(),
            getPalette: vi.fn(),
            getVfs: vi.fn(() => ({
                findByExtension: vi.fn().mockReturnValue([]),
            })),
        } as unknown as PakService;
    });

    it('PreviewPanel renders SoundAnalyzer for WAV files', async () => {
        const audioData = {
            channels: 1,
            sampleRate: 44100,
            bitsPerSample: 16,
            samples: new Float32Array(44100)
        };

        const parsedFile: ParsedFile = {
            type: 'wav',
            audio: audioData
        };

        const filePath = 'sound/test.wav';

        await act(async () => {
            render(
                <PreviewPanel
                    parsedFile={parsedFile}
                    filePath={filePath}
                    pakService={pakServiceMock}
                />
            );
        });

        expect(screen.getByTestId('sound-analyzer')).toBeInTheDocument();
        expect(screen.getByText('test.wav')).toBeInTheDocument();
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        expect(screen.getByTestId('frequency-spectrum')).toBeInTheDocument();

        // Wait for usage analysis to complete to avoid act warning
        await waitFor(() => {
            expect(screen.queryByText('Scanning...')).not.toBeInTheDocument();
        });
    });
});
