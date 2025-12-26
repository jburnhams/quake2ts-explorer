import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoStats } from '../../../src/components/DemoStats';
import { DemoPlaybackController, PlayerStatistics, DemoStatistics } from '@quake2ts/engine';

// Mock the controller
const mockController = {
  getDemoStatistics: vi.fn(),
  getPlayerStatistics: vi.fn(),
  getFrameData: vi.fn(),
  getCurrentFrame: vi.fn(),
  getCurrentTime: vi.fn(),
  getFrameCount: vi.fn()
} as unknown as DemoPlaybackController;

describe('DemoStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockController.getCurrentFrame as vi.Mock).mockReturnValue(100);
    (mockController.getCurrentTime as vi.Mock).mockReturnValue(10.5);
    (mockController.getFrameCount as vi.Mock).mockReturnValue(1000);

    (mockController.getDemoStatistics as vi.Mock).mockReturnValue({
        duration: 120,
        averageFps: 60, // Changed from averageFrameTime based on actual type
        frameCount: 1000,
        mapName: 'test',
        playerCount: 1
    } as DemoStatistics);

    (mockController.getPlayerStatistics as vi.Mock).mockReturnValue({
        kills: 5,
        deaths: 2,
        damageDealt: 500
    } as PlayerStatistics);

    (mockController.getFrameData as vi.Mock).mockReturnValue({
        playerState: {
            origin: { x: 100, y: 200, z: 50 },
            velocity: { x: 300, y: 0, z: 0 }, // 300 ups
            viewangles: { x: 10, y: 90, z: 0 }
        }
    });
  });

  it('renders nothing when not visible', () => {
    render(<DemoStats controller={mockController} visible={false} onClose={vi.fn()} />);
    expect(screen.queryByText('Demo Stats')).not.toBeInTheDocument();
  });

  it('renders stats when visible', async () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });

    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={vi.fn()} />);
    });

    // Advance timers to trigger RAF update
    await act(async () => {
        vi.advanceTimersByTime(50);
    });

    expect(screen.getByText('Demo Stats')).toBeInTheDocument();

    // Check static stats
    expect(screen.getByText(/Kills: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Deaths: 2/)).toBeInTheDocument();

    // Check dynamic stats
    expect(screen.getByText(/Speed: 300 ups/)).toBeInTheDocument();
    expect(screen.getByText(/Pos: 100, 200, 50/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('updates dynamic stats on frame update', async () => {
      vi.useFakeTimers();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
          return setTimeout(() => cb(performance.now()), 16) as unknown as number;
      });

      await act(async () => {
          render(<DemoStats controller={mockController} visible={true} onClose={vi.fn()} />);
      });

      // Update mock return values
      (mockController.getFrameData as vi.Mock).mockReturnValue({
          playerState: {
              origin: { x: 150, y: 250, z: 60 },
              velocity: { x: 400, y: 0, z: 0 },
              viewangles: { x: 10, y: 90, z: 0 }
          }
      });

      // Advance time
      await act(async () => {
          vi.advanceTimersByTime(50);
      });

      expect(screen.getByText(/Speed: 400 ups/)).toBeInTheDocument();
      expect(screen.getByText(/Pos: 150, 250, 60/)).toBeInTheDocument();

      vi.useRealTimers();
  });
});
