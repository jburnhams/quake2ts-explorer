import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoTimeline } from '../../../src/components/DemoTimeline';
import { DemoEventType } from 'quake2ts/engine';

// Mock engine enum if not available in jest environment directly
jest.mock('quake2ts/engine', () => ({
  DemoEventType: {
    Death: 0,
    WeaponFire: 1,
    Pickup: 2,
    Spawn: 3,
    DamageDealt: 4,
    DamageReceived: 5,
  }
}));

describe('DemoTimeline Coverage', () => {
  let mockController: any;
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    rafCallbacks = [];
    mockController = {
      getDuration: jest.fn().mockReturnValue(120),
      getFrameCount: jest.fn().mockReturnValue(3600),
      getCurrentTime: jest.fn().mockReturnValue(10),
      getCurrentFrame: jest.fn().mockReturnValue(300),
      getDemoEvents: jest.fn().mockReturnValue([
        { time: 10, type: 0, description: 'Death' },
        { time: 20, type: 1, description: 'Fire' },
        { time: 30, type: 2, description: 'Pickup' },
        { time: 40, type: 3, description: 'Spawn' },
        { time: 50, type: 4, description: 'Deal' },
        { time: 60, type: 5, description: 'Receive' },
        { time: 70, type: 99, description: 'Unknown' },
      ]),
      seekToTime: jest.fn(),
    };

    // Mock RAF
    const rafMock = jest.fn((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
    });
    const cafMock = jest.fn();

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(rafMock);
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(cafMock);

    // Explicitly set on global for JSDOM if needed
    (global as any).requestAnimationFrame = rafMock;
    (global as any).cancelAnimationFrame = cafMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const triggerRaf = () => {
      act(() => {
          const callbacks = [...rafCallbacks];
          rafCallbacks.length = 0; // Clear before execution to allow new ones to be added
          callbacks.forEach(cb => cb(performance.now()));
      });
  };

  test('initializes and updates via RAF', () => {
    render(<DemoTimeline controller={mockController} bookmarks={[]} />);

    // Trigger RAF to update time
    triggerRaf();

    expect(screen.getByText('0:10.00')).toBeInTheDocument(); // Updated time
    expect(screen.getByText('2:00.00')).toBeInTheDocument(); // Duration
    expect(screen.getByText('Frame: 300 / 3600')).toBeInTheDocument();
  });

  test('zoom controls', () => {
    render(<DemoTimeline controller={mockController} bookmarks={[]} />);

    const zoomIn = screen.getByText('+');
    const zoomOut = screen.getByText('-');

    fireEvent.click(zoomIn);
    expect(screen.getByText('150%')).toBeInTheDocument();

    fireEvent.click(zoomOut);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('wheel zooming and panning', () => {
    render(<DemoTimeline controller={mockController} bookmarks={[]} />);
    // Need to use class selector because text might not be unique or accessible
    // But we can find by frame text
    const container = screen.getByText(/Frame:/).closest('.demo-timeline');

    // Mock getBoundingClientRect for track
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 1000, height: 50, bottom: 50, right: 1000, x: 0, y: 0, toJSON: () => {}
    });

    if (container) {
        // Zoom in
        fireEvent.wheel(container, { ctrlKey: true, deltaY: -100, clientX: 500 });

        // Pan
        fireEvent.click(screen.getByText('+')); // 150%
        fireEvent.wheel(container, { ctrlKey: false, deltaY: 100, deltaX: 0 });
    }
  });

  test('mouse interaction (hover, seek)', () => {
      render(<DemoTimeline controller={mockController} bookmarks={[]} />);
      const track = screen.getByTitle('').closest('.timeline-track-container');

      jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        left: 0, top: 0, width: 1000, height: 50, bottom: 50, right: 1000, x: 0, y: 0, toJSON: () => {}
    });

      if (track) {
          fireEvent.mouseMove(track, { clientX: 500 });
          expect(screen.getByText('1:00.00')).toBeInTheDocument();

          fireEvent.mouseDown(track, { clientX: 250, button: 0 });
          expect(mockController.seekToTime).toHaveBeenCalledWith(30);

          mockController.seekToTime.mockClear();

          fireEvent.mouseMove(window, { clientX: 500 });
          fireEvent.mouseUp(window, { clientX: 500 });
          expect(mockController.seekToTime).toHaveBeenCalledWith(60);
      }
  });

  test('bookmarks interaction', () => {
      const onBookmarkClick = jest.fn();
      const bookmarks = [{ id: '1', name: 'Test', timeSeconds: 15, frame: 450 }];

      render(<DemoTimeline controller={mockController} bookmarks={bookmarks} onBookmarkClick={onBookmarkClick} />);

      const marker = screen.getByTitle('Bookmark: Test (0:15.00)');
      fireEvent.click(marker);
      expect(onBookmarkClick).toHaveBeenCalledWith(450);
  });

  test('render event markers with correct colors', () => {
      render(<DemoTimeline controller={mockController} bookmarks={[]} />);
      expect(screen.getByTitle(/Death/)).toHaveStyle({ backgroundColor: '#ff4444' });
      expect(screen.getByTitle(/Unknown/)).toHaveStyle({ backgroundColor: '#cccccc' });
  });

  test('auto-scroll (zoom offset)', () => {
      render(<DemoTimeline controller={mockController} bookmarks={[]} />);
      fireEvent.click(screen.getByText('+'));

      mockController.getCurrentTime.mockReturnValue(115);

      triggerRaf();
  });
});
