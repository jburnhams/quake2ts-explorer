import { describe, it, expect, jest, beforeAll, afterEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PreviewPanel } from '../../../src/components/PreviewPanel';
import type { ParsedFile, PakService } from '../../../src/services/pakService';

// Mock AudioContext
const mockSourceNode = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  onended: null as (() => void) | null,
  buffer: null,
};

const mockCreateBufferSource = jest.fn(() => mockSourceNode);

const mockAudioContext = {
  createBuffer: jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(100)),
  })),
  createBufferSource: mockCreateBufferSource,
  destination: {},
};

describe('Audio Preview', () => {
  beforeAll(() => {
    global.AudioContext = jest.fn(() => mockAudioContext) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockSourceNode.onended = null;
  });

  const mockPakService = {
    hasFile: jest.fn(),
    readFile: jest.fn(),
  } as unknown as PakService;

  it('renders audio preview for WAV', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 1,
        sampleRate: 22050,
        bitsPerSample: 16,
        samples: new Int16Array(22050),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );
    expect(screen.getByTestId('audio-preview')).toBeInTheDocument();
    expect(screen.getByTestId('audio-play-button')).toBeInTheDocument();
  });

  it('shows audio info', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 2,
        sampleRate: 44100,
        bitsPerSample: 16,
        samples: new Int16Array(88200),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );
    expect(screen.getByText(/44100 Hz/)).toBeInTheDocument();
    expect(screen.getByText(/2 channels/)).toBeInTheDocument();
  });

  it('shows Play button initially', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 1,
        sampleRate: 22050,
        bitsPerSample: 16,
        samples: new Int16Array(22050),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('shows singular channel text', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 1,
        sampleRate: 22050,
        bitsPerSample: 16,
        samples: new Int16Array(22050),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );
    expect(screen.getByText(/1 channel,/)).toBeInTheDocument();
  });

  it('toggles playback when button is clicked', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 1,
        sampleRate: 22050,
        bitsPerSample: 16,
        samples: new Int16Array(22050),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );

    const button = screen.getByTestId('audio-play-button');

    // Play
    fireEvent.click(button);
    expect(mockCreateBufferSource).toHaveBeenCalled();
    expect(mockSourceNode.start).toHaveBeenCalled();
    expect(screen.getByText('Stop')).toBeInTheDocument();

    // Stop
    fireEvent.click(button);
    expect(mockSourceNode.stop).toHaveBeenCalled();
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('reset playback state when audio ends', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 1,
        sampleRate: 22050,
        bitsPerSample: 16,
        samples: new Int16Array(22050),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );

    const button = screen.getByTestId('audio-play-button');
    fireEvent.click(button);
    expect(screen.getByText('Stop')).toBeInTheDocument();

    // Trigger onended
    act(() => {
        if (mockSourceNode.onended) {
            mockSourceNode.onended();
        }
    });

    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('handles Float32Array samples', () => {
    const parsedWav: ParsedFile = {
      type: 'wav',
      audio: {
        channels: 1,
        sampleRate: 22050,
        bitsPerSample: 32,
        samples: new Float32Array(22050),
      },
    };
    render(
      <PreviewPanel
        parsedFile={parsedWav}
        filePath="sounds/test.wav"
        pakService={mockPakService}
      />
    );

    const button = screen.getByTestId('audio-play-button');
    fireEvent.click(button);

    expect(mockCreateBufferSource).toHaveBeenCalled();
  });
});
