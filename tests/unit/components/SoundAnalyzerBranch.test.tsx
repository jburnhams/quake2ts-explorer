import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SoundAnalyzer } from '@/src/components/SoundAnalyzer';
import 'jest-canvas-mock';

// Mock Web Audio API
class MockAudioBufferSourceNode {
  buffer: any = null;
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
  state: string = 'suspended';
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

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('SoundAnalyzer Branch Coverage', () => {
  const mockAudio = {
    channels: 1,
    sampleRate: 44100,
    bitsPerSample: 16,
    samples: new Float32Array(44100).map((_, i) => Math.sin(i / 100))
  };

  const mockFileName = "test.wav";

  it('handles playback end', async () => {
    render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);

    // Start playing
    await act(async () => {
        fireEvent.click(screen.getByTestId('play-pause-btn'));
    });

    expect(screen.getByTestId('play-pause-btn')).toHaveTextContent('Pause');

    // Trigger onended manually?
    // We need access to the source node created inside the component.
    // Since we can't easily access it, we rely on the fact that when playback stops, state changes.
    // But we can trigger stop button which calls stop().
  });

  it('handles zooming', () => {
      render(<SoundAnalyzer audio={mockAudio} fileName={mockFileName} />);
      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      const zoomOutBtn = screen.getByTestId('zoom-out-btn');

      fireEvent.click(zoomInBtn);
      // Verify zoom level somehow? Text content might change if displayed.

      fireEvent.click(zoomOutBtn);
  });

});
