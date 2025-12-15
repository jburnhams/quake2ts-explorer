import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoStats } from '@/src/components/DemoStats';
import { DemoPlaybackController, PlayerStatistics, DemoStatistics } from 'quake2ts/engine';

// Mock the controller
const mockController = {
  getDemoStatistics: jest.fn(),
  getPlayerStatistics: jest.fn(),
  getFrameData: jest.fn(),
  getCurrentFrame: jest.fn(),
  getCurrentTime: jest.fn(),
  getFrameCount: jest.fn()
} as unknown as DemoPlaybackController;

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('DemoStats Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    (mockController.getCurrentFrame as jest.Mock).mockReturnValue(100);
    (mockController.getCurrentTime as jest.Mock).mockReturnValue(10.5);
    (mockController.getFrameCount as jest.Mock).mockReturnValue(1000);

    (mockController.getDemoStatistics as jest.Mock).mockReturnValue({
        duration: 120,
        averageFps: 60,
        frameCount: 1000,
        mapName: 'test',
        playerCount: 1
    } as DemoStatistics);

    (mockController.getPlayerStatistics as jest.Mock).mockReturnValue({
        kills: 5,
        deaths: 2,
        damageDealt: 500
    } as PlayerStatistics);

    (mockController.getFrameData as jest.Mock).mockReturnValue({
        playerState: {
            origin: { x: 100, y: 200, z: 50 },
            velocity: { x: 300, y: 0, z: 0 },
            viewangles: { x: 10, y: 90, z: 0 }
        }
    });
  });

  it('renders settings toggle', async () => {
    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
    });

    // Look for a settings button (icon or text)
    expect(screen.getByTitle('Configure Stats')).toBeInTheDocument();
  });

  it('toggles settings panel visibility', async () => {
    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
    });

    const settingsBtn = screen.getByTitle('Configure Stats');
    fireEvent.click(settingsBtn);

    expect(screen.getByText('Show Speed Graph')).toBeInTheDocument();
    expect(screen.getByText('Show Player State')).toBeInTheDocument();
  });

  it('hides sections when configured to false', async () => {
    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
    });

    // Open settings
    const settingsBtn = screen.getByTitle('Configure Stats');
    fireEvent.click(settingsBtn);

    // Uncheck "Show Player State"
    const checkbox = screen.getByLabelText('Show Player State');
    fireEvent.click(checkbox);

    expect(screen.queryByText(/Speed: 300 ups/)).not.toBeInTheDocument();
  });

  it('renders SpeedGraph when enabled', async () => {
    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
    });

    // Open settings and enable graph (it might be disabled by default or enabled, check implementation)
    // Assuming default is disabled for test, or we toggle it.
    const settingsBtn = screen.getByTitle('Configure Stats');
    fireEvent.click(settingsBtn);

    // Enable graph if not already
    const checkbox = screen.getByLabelText('Show Speed Graph');
    if (!checkbox.hasAttribute('checked')) {
         fireEvent.click(checkbox);
    }

    // Check if canvas is rendered
    expect(screen.getByRole('img', { name: /Speed Graph/i })).toBeInTheDocument();
  });

  it('persists configuration to localStorage', async () => {
    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
    });

    const settingsBtn = screen.getByTitle('Configure Stats');
    fireEvent.click(settingsBtn);

    const checkbox = screen.getByLabelText('Show Match Stats');
    fireEvent.click(checkbox); // Toggle it

    expect(localStorageMock.setItem).toHaveBeenCalledWith('quake2ts-stats-config', expect.any(String));
  });

  it('allows changing scale', async () => {
    await act(async () => {
        render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
    });

    const settingsBtn = screen.getByTitle('Configure Stats');
    fireEvent.click(settingsBtn);

    const rangeInput = screen.getByRole('slider'); // Range input usually maps to slider role
    fireEvent.change(rangeInput, { target: { value: '1.5' } });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('quake2ts-stats-config', expect.stringContaining('"scale":1.5'));
  });

  // Since we can't easily test real drag-and-drop in jsdom without extra libs or complex setups,
  // we can test if the event handlers are attached or if we can simulate the state change logic if we exposed it.
  // But typically checking if localStorage updates with new coordinates after a simulated drag sequence is good enough.
  it('updates position on drag', async () => {
      await act(async () => {
          render(<DemoStats controller={mockController} visible={true} onClose={jest.fn()} />);
      });

      const header = screen.getByText('Demo Stats').closest('div');

      // Simulate Drag Start
      fireEvent.mouseDown(header!, { clientX: 100, clientY: 100 });

      // Simulate Drag Move
      fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

      // Simulate Drag End
      fireEvent.mouseUp(window);

      // Verify localStorage was updated with new position
      // Initial X is window.innerWidth - 270. Let's assume window.innerWidth is 1024.
      // 1024 - 270 = 754.
      // MouseDown at 100, 100. Offset = 100 - 754 = -654.
      // MouseMove to 150. New X = 150 - (-654) = 804.
      // Delta is +50.
      expect(localStorageMock.setItem).toHaveBeenCalledWith('quake2ts-stats-config', expect.stringContaining('"x"'));
  });
});
