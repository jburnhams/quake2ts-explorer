import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FrameInfo } from '../../../src/components/FrameInfo';
import { DemoPlaybackController } from '@quake2ts/engine';

const mockController = {
  getCurrentFrame: vi.fn(),
  getCurrentTime: vi.fn(),
  getDemoHeader: vi.fn(),
} as unknown as DemoPlaybackController;

describe('FrameInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockController.getCurrentFrame as vi.Mock).mockReturnValue(42);
    (mockController.getCurrentTime as vi.Mock).mockReturnValue(1.5);
    (mockController.getDemoHeader as vi.Mock).mockReturnValue({ tickRate: 40 });

    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
  });

  afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
  });

  it('renders frame and time information', async () => {
    render(<FrameInfo controller={mockController} />);

    // Initial render might trigger immediately if state is set, but RAF updates it
    await act(async () => {
        vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('Frame: 42')).toBeInTheDocument();
    expect(screen.getByText('Time: 1500 ms')).toBeInTheDocument();
    expect(screen.getByText('Tick Rate: 40 Hz')).toBeInTheDocument();
  });
});
