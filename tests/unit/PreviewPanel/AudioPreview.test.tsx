import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PreviewPanel } from '@/src/components/PreviewPanel';
import type { ParsedFile } from '@/src/services/pakService';

describe('Audio Preview', () => {
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
    render(<PreviewPanel parsedFile={parsedWav} filePath="sounds/test.wav" />);
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
    render(<PreviewPanel parsedFile={parsedWav} filePath="sounds/test.wav" />);
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
    render(<PreviewPanel parsedFile={parsedWav} filePath="sounds/test.wav" />);
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
    render(<PreviewPanel parsedFile={parsedWav} filePath="sounds/test.wav" />);
    expect(screen.getByText(/1 channel,/)).toBeInTheDocument();
  });
});
