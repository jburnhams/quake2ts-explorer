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
    connect = jest.fn();
    start = jest.fn();
    stop = jest.fn();
    onended: ((event?: any) => void) | null = null;
}
class MockAnalyserNode {
    fftSize: number = 2048;
    frequencyBinCount: number = 1024;
    connect = jest.fn();
    getByteFrequencyData = jest.fn((array: Uint8Array) => {
        array.fill(128);
    });
}
class MockAudioContext {
    state: string = 'running';
    currentTime: number = 0;
    createBuffer = jest.fn(() => ({
        length: 44100,
        duration: 1.0,
        numberOfChannels: 1,
        sampleRate: 44100,
        getChannelData: jest.fn(() => new Float32Array(44100))
    }));
    createBufferSource = jest.fn(() => new MockAudioBufferSourceNode());
    createAnalyser = jest.fn(() => new MockAnalyserNode());
    resume = jest.fn(async () => {
        this.state = 'running';
    });
    close = jest.fn();
    destination = {};
}
Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: MockAudioContext
});

// Mock other heavy components
jest.mock('../../src/components/UniversalViewer/UniversalViewer', () => ({
    UniversalViewer: () => <div data-testid="universal-viewer" />
}));
jest.mock('../../src/components/BspAnalyzer', () => ({
    BspAnalyzer: () => <div data-testid="bsp-analyzer" />
}));
jest.mock('../../src/components/TextureAtlas', () => ({
    TextureAtlas: () => <div data-testid="texture-atlas" />
}));

describe('SoundAnalyzer Integration', () => {
    let pakServiceMock: PakService;

    beforeEach(() => {
        pakServiceMock = {
            hasFile: jest.fn(),
            readFile: jest.fn(),
            parseFile: jest.fn(),
            getPalette: jest.fn()
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

        render(
            <PreviewPanel
                parsedFile={parsedFile}
                filePath={filePath}
                pakService={pakServiceMock}
            />
        );

        expect(screen.getByTestId('sound-analyzer')).toBeInTheDocument();
        expect(screen.getByText('test.wav')).toBeInTheDocument();
        expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
        expect(screen.getByTestId('frequency-spectrum')).toBeInTheDocument();
    });
});
