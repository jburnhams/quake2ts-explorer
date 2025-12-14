import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoTimeline } from '../../../src/components/DemoTimeline';
import { DemoPlaybackController, DemoEventType } from 'quake2ts/engine';

// Mock the controller
const mockController = {
  getDuration: jest.fn(),
  getFrameCount: jest.fn(),
  getCurrentTime: jest.fn(),
  getCurrentFrame: jest.fn(),
  seekToTime: jest.fn(),
  getDemoEvents: jest.fn(),
} as unknown as DemoPlaybackController;

describe('DemoTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockController.getDuration as jest.Mock).mockReturnValue(120); // 2 minutes
    (mockController.getFrameCount as jest.Mock).mockReturnValue(1000);
    (mockController.getCurrentTime as jest.Mock).mockReturnValue(0);
    (mockController.getCurrentFrame as jest.Mock).mockReturnValue(0);
    (mockController.getDemoEvents as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
  });

  it('renders timeline with duration and current time', () => {
    render(<DemoTimeline controller={mockController} />);

    expect(screen.getByText('0:00.00')).toBeInTheDocument();
    expect(screen.getByText('2:00.00')).toBeInTheDocument();
  });

  it('updates current time on frame update', async () => {
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });

    render(<DemoTimeline controller={mockController} />);

    // Change mock return value
    (mockController.getCurrentTime as jest.Mock).mockReturnValue(10);

    // Advance time to trigger RAF
    await act(async () => {
        jest.advanceTimersByTime(50);
    });

    expect(screen.getByText('0:10.00')).toBeInTheDocument();
  });

  it('calls seekToTime when clicked', () => {
    // No fake timers here
    const { container } = render(<DemoTimeline controller={mockController} />);
    const track = container.querySelector('.timeline-track-container');

    // Mock getBoundingClientRect
    jest.spyOn(track!, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 100,
      top: 0,
      height: 10,
      right: 100,
      bottom: 10,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    act(() => {
        fireEvent.mouseDown(track!, { clientX: 50 }); // 50%
    });

    expect(mockController.seekToTime).toHaveBeenCalledWith(60); // 50% of 120s
  });

  it('renders event markers', () => {
    const events = [
      { type: DemoEventType.Death, time: 30, frame: 250, description: 'Player died' },
      { type: DemoEventType.WeaponFire, time: 60, frame: 500, description: 'Shot fired' }
    ];
    (mockController.getDemoEvents as jest.Mock).mockReturnValue(events);

    const { container } = render(<DemoTimeline controller={mockController} />);

    const markers = container.querySelectorAll('.timeline-marker');
    expect(markers.length).toBe(2);

    // Check styles
    expect(markers[0]).toHaveStyle('left: 25%'); // 30/120
    expect(markers[1]).toHaveStyle('left: 50%'); // 60/120
  });
});
