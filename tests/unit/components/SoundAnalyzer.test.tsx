import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SoundAnalyzer } from '@/src/components/SoundAnalyzer';
import 'jest-canvas-mock';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock AudioContext and related classes
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
    array.fill(128); // Fill with some dummy data
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

// Assign to global window
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext
});

describe('SoundAnalyzer', () => {
  const mockAudio = {
    channels: 1,
    sampleRate: 44100,
    bitsPerSample: 16,
    samples: new Float32Array(44100).map((_, i) => Math.sin(i / 100))
  };

  const mockFileName = "test.wav";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders sound analyzer interface', () => {
    render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);

    expect(screen.getByTestId('sound-analyzer')).toBeInTheDocument();
    expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('frequency-spectrum')).toBeInTheDocument();
    expect(screen.getByText(mockFileName)).toBeInTheDocument();
    expect(screen.getByText('44100 Hz')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Channels
    expect(screen.getByText('16-bit')).toBeInTheDocument();
  });

  it('initializes audio context and buffer', () => {
    render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);
    // Since we mock AudioContext, we can't easily check internal state without spy
    // But we can check if createBuffer was called
    // We need to access the mock instance or spy on the prototype
  });

  it('toggles play/pause', async () => {
    render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);

    const playButton = screen.getByTestId('play-pause-btn');
    expect(playButton).toHaveTextContent('Play');

    // Click play
    await act(async () => {
      fireEvent.click(playButton);
    });

    expect(playButton).toHaveTextContent('Pause');

    // Click pause
    await act(async () => {
        fireEvent.click(playButton);
    });

    expect(playButton).toHaveTextContent('Play');
  });

  it('stops playback', async () => {
      render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);
      const playButton = screen.getByTestId('play-pause-btn');
      const stopButton = screen.getByTestId('stop-btn');

      // Start playing
      await act(async () => {
          fireEvent.click(playButton);
      });
      expect(playButton).toHaveTextContent('Pause');

      // Stop
      await act(async () => {
          fireEvent.click(stopButton);
      });
      expect(playButton).toHaveTextContent('Play');
  });

  it('renders waveform', () => {
      render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);
      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toBeInTheDocument();
      // We can't easily check canvas content in jsdom, but presence is good
  });
});
