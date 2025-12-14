import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DemoTimeline } from '../../../src/components/DemoTimeline';
import { DemoPlaybackController } from 'quake2ts/engine';

// Mock the controller
const mockController = {
  getDuration: jest.fn().mockReturnValue(60), // 60 seconds
  getFrameCount: jest.fn().mockReturnValue(600),
  getCurrentTime: jest.fn().mockReturnValue(0),
  getCurrentFrame: jest.fn().mockReturnValue(0),
  seekToTime: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
} as unknown as DemoPlaybackController;

// Helper for RAF
let rafCallbacks: FrameRequestCallback[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  rafCallbacks = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
     // No-op for now
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

const tick = () => {
    act(() => {
        rafCallbacks.forEach(cb => cb(performance.now()));
        rafCallbacks = [];
    });
};

describe('DemoTimeline', () => {
  test('renders with initial values', () => {
    render(<DemoTimeline controller={mockController} />);

    expect(screen.getByText('0:00.00')).toBeInTheDocument(); // Current time
    expect(screen.getByText('1:00.00')).toBeInTheDocument(); // Duration
    expect(screen.getByText(/Frame: 0 \/ 600/)).toBeInTheDocument();
  });

  test('updates time when raf fires', () => {
    (mockController.getCurrentTime as jest.Mock).mockReturnValue(10.5);
    (mockController.getCurrentFrame as jest.Mock).mockReturnValue(105);

    render(<DemoTimeline controller={mockController} />);

    tick(); // Trigger RAF

    expect(screen.getByText('0:10.50')).toBeInTheDocument();
    expect(screen.getByText(/Frame: 105 \/ 600/)).toBeInTheDocument();
  });

  test('seeks on click', () => {
    render(<DemoTimeline controller={mockController} />);
    const trackContainer = screen.getByTitle(''); // This is the container with the ref and events

    // Mock getBoundingClientRect on the element that has the ref
    jest.spyOn(trackContainer, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 20,
        right: 100,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => {}
    });

    fireEvent.mouseDown(trackContainer, { clientX: 50 }); // Click in middle (50%)

    // Should seek to 50% of 60s = 30s
    expect(mockController.seekToTime).toHaveBeenCalledWith(30);
  });

  test('scrubbing functionality', () => {
    render(<DemoTimeline controller={mockController} />);
    const trackContainer = screen.getByTitle('');

    jest.spyOn(trackContainer, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 20,
        right: 100,
        bottom: 20,
        x: 0,
        y: 0,
        toJSON: () => {}
    });

    // Start dragging
    fireEvent.mouseDown(trackContainer, { clientX: 0 }); // Start at 0
    expect(mockController.seekToTime).toHaveBeenCalledWith(0);

    // Reset mock to check drag behavior
    (mockController.seekToTime as jest.Mock).mockClear();

    // Move to 75%
    fireEvent.mouseMove(window, { clientX: 75 });

    // During drag, seekToTime should NOT be called (only UI update)
    expect(mockController.seekToTime).not.toHaveBeenCalled();

    // Mouse up
    fireEvent.mouseUp(window, { clientX: 75 });

    // Now it should seek to final pos
    expect(mockController.seekToTime).toHaveBeenCalledWith(45); // 75% of 60 = 45
  });
});
