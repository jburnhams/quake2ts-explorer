import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DemoTimeline } from '@/src/components/DemoTimeline';
import { DemoPlaybackController, DemoEventType } from 'quake2ts/engine';
import { createMockRAF } from 'quake2ts/test-utils';

describe('DemoTimeline', () => {
  let mockController: jest.Mocked<DemoPlaybackController>;
  let mockRaf: ReturnType<typeof createMockRAF>;

  beforeEach(() => {
    mockRaf = createMockRAF();
    mockRaf.enable();

    mockController = {
      play: jest.fn(),
      pause: jest.fn(),
      stop: jest.fn(),
      stepForward: jest.fn(),
      stepBackward: jest.fn(),
      seekToFrame: jest.fn(),
      seekToTime: jest.fn(),
      setSpeed: jest.fn(),
      getSpeed: jest.fn().mockReturnValue(1),
      getCurrentFrame: jest.fn().mockReturnValue(0),
      getFrameCount: jest.fn().mockReturnValue(100),
      getCurrentTime: jest.fn().mockReturnValue(0),
      getDuration: jest.fn().mockReturnValue(10),
      getState: jest.fn(),
      isPlaying: jest.fn().mockReturnValue(false),
      isPaused: jest.fn().mockReturnValue(true),
      getDemoEvents: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<DemoPlaybackController>;
  });

  afterEach(() => {
    mockRaf.disable();
    jest.clearAllMocks();
  });

  it('renders correctly with initial state', () => {
    render(<DemoTimeline controller={mockController} />);

    expect(screen.getByText('Frame: 0 / 100')).toBeInTheDocument();
    expect(screen.getByText('0:00.00')).toBeInTheDocument(); // Current time
    expect(screen.getByText('0:10.00')).toBeInTheDocument(); // Duration
    expect(screen.getByText('100%')).toBeInTheDocument(); // Zoom level
  });

  it('updates time and frame when animation frame triggers', () => {
    render(<DemoTimeline controller={mockController} />);

    // Update mock return values
    mockController.getCurrentTime.mockReturnValue(5);
    mockController.getCurrentFrame.mockReturnValue(50);

    // Trigger update loop
    act(() => {
      mockRaf.tick();
    });

    expect(screen.getByText('Frame: 50 / 100')).toBeInTheDocument();
    expect(screen.getByText('0:05.00')).toBeInTheDocument();
  });

  it('calls seekToTime when clicking on track', () => {
    render(<DemoTimeline controller={mockController} />);

    const trackContainer = screen.getByTitle(''); // Title is empty initially

    // Mock getBoundingClientRect
    jest.spyOn(trackContainer, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 100,
      top: 0,
      height: 20,
      bottom: 20,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    fireEvent.mouseDown(trackContainer, { button: 0, clientX: 50 });

    // Should seek to 50% of 10s = 5s
    expect(mockController.seekToTime).toHaveBeenCalledWith(5);
  });

  it('shows event markers', () => {
    mockController.getDemoEvents.mockReturnValue([
      { type: DemoEventType.Death, time: 2.5, description: 'Player died' },
      { type: DemoEventType.Pickup, time: 7.5, description: 'Got item' }
    ]);

    render(<DemoTimeline controller={mockController} />);

    const markers = document.querySelectorAll('.timeline-marker');
    expect(markers).toHaveLength(2);

    // Check titles/tooltips
    expect(markers[0]).toHaveAttribute('title', 'Player died (0:02.50)');
    expect(markers[1]).toHaveAttribute('title', 'Got item (0:07.50)');
  });

  it('handles zoom interaction', () => {
    render(<DemoTimeline controller={mockController} />);

    // Initial zoom: 100%
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Click zoom in button
    const zoomInBtn = screen.getByText('+');
    fireEvent.click(zoomInBtn);

    expect(screen.getByText('150%')).toBeInTheDocument();

    // Click zoom out button
    const zoomOutBtn = screen.getByText('-');
    fireEvent.click(zoomOutBtn);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('adjusts view when zoomed and scrubbing', () => {
      render(<DemoTimeline controller={mockController} />);

      const zoomInBtn = screen.getByText('+');
      // Zoom to 200% (two clicks of +0.5 from 1.0)
      fireEvent.click(zoomInBtn);
      fireEvent.click(zoomInBtn);

      expect(screen.getByText('200%')).toBeInTheDocument();
      // Visible duration is now 5s (10s / 2)

      const trackContainer = screen.getByTitle('');
       jest.spyOn(trackContainer, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        width: 100,
        top: 0,
        height: 20,
        bottom: 20,
        right: 100,
        x: 0,
        y: 0,
        toJSON: () => {}
      });

      // Click at 50% (middle of view)
      // View is 0-5s. Middle is 2.5s.
      fireEvent.mouseDown(trackContainer, { button: 0, clientX: 50 });
      expect(mockController.seekToTime).toHaveBeenCalledWith(2.5);
  });
});
