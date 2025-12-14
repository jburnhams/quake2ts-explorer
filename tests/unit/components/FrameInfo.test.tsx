import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FrameInfo } from '../../../src/components/FrameInfo';
import { DemoPlaybackController } from 'quake2ts/engine';

const mockController = {
  getCurrentFrame: jest.fn(),
  getCurrentTime: jest.fn(),
  getDemoHeader: jest.fn(),
} as unknown as DemoPlaybackController;

describe('FrameInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockController.getCurrentFrame as jest.Mock).mockReturnValue(42);
    (mockController.getCurrentTime as jest.Mock).mockReturnValue(1.5);
    (mockController.getDemoHeader as jest.Mock).mockReturnValue({ tickRate: 40 });

    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
  });

  afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
  });

  it('renders frame and time information', async () => {
    render(<FrameInfo controller={mockController} />);

    // Initial render might trigger immediately if state is set, but RAF updates it
    await act(async () => {
        jest.advanceTimersByTime(50);
    });

    expect(screen.getByText('Frame: 42')).toBeInTheDocument();
    expect(screen.getByText('Time: 1500 ms')).toBeInTheDocument();
    expect(screen.getByText('Tick Rate: 40 Hz')).toBeInTheDocument();
  });
});
