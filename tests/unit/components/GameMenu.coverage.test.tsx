import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameMenu } from '@/src/components/GameMenu';
import { demoRecorderService } from '@/src/services/demoRecorder';

// Mock dependencies
vi.mock('@/src/services/demoRecorder', () => ({
  demoRecorderService: {
    isRecording: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  },
}));

vi.mock('@/src/components/SaveLoadDialog', () => ({
  SaveLoadDialog: ({ mode, onClose, onActionComplete }: any) => (
    <div data-testid="save-load-dialog">
      <button onClick={onClose}>Close Dialog</button>
      <button onClick={() => onActionComplete && onActionComplete()}>Complete Action</button>
      <span>Mode: {mode}</span>
    </div>
  ),
}));

describe('GameMenu', () => {
  const mockProps = {
    onResume: vi.fn(),
    onSave: vi.fn(),
    onLoad: vi.fn(),
    onQuit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (demoRecorderService.isRecording as vi.Mock).mockReturnValue(false);
    // Mock URL methods
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();

    // Mock HTMLAnchorElement.click to prevent navigation
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
        writable: true,
        value: vi.fn()
    });
  });

  it('renders menu items', () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByText('Game Paused')).toBeInTheDocument();
    expect(screen.getByText('Resume Game')).toBeInTheDocument();
    expect(screen.getByText('Save Game')).toBeInTheDocument();
    expect(screen.getByText('Load Game')).toBeInTheDocument();
    expect(screen.getByText('Record Demo')).toBeInTheDocument();
    expect(screen.getByText('Quit to Browser')).toBeInTheDocument();
  });

  it('handles resume', () => {
    render(<GameMenu {...mockProps} />);
    fireEvent.click(screen.getByText('Resume Game'));
    expect(mockProps.onResume).toHaveBeenCalled();
  });

  it('handles quit', () => {
    render(<GameMenu {...mockProps} />);
    fireEvent.click(screen.getByText('Quit to Browser'));
    expect(mockProps.onQuit).toHaveBeenCalled();
  });

  it('opens save dialog', () => {
    render(<GameMenu {...mockProps} />);
    fireEvent.click(screen.getByText('Save Game'));
    expect(screen.getByTestId('save-load-dialog')).toBeInTheDocument();
    expect(screen.getByText('Mode: save')).toBeInTheDocument();
  });

  it('opens load dialog', () => {
    render(<GameMenu {...mockProps} />);
    fireEvent.click(screen.getByText('Load Game'));
    expect(screen.getByTestId('save-load-dialog')).toBeInTheDocument();
    expect(screen.getByText('Mode: load')).toBeInTheDocument();
  });

  it('closes dialog', () => {
    render(<GameMenu {...mockProps} />);
    fireEvent.click(screen.getByText('Save Game'));
    fireEvent.click(screen.getByText('Close Dialog'));
    expect(screen.queryByTestId('save-load-dialog')).not.toBeInTheDocument();
  });

  it('completes load action and resumes', () => {
    render(<GameMenu {...mockProps} />);
    fireEvent.click(screen.getByText('Load Game'));
    fireEvent.click(screen.getByText('Complete Action'));
    expect(screen.queryByTestId('save-load-dialog')).not.toBeInTheDocument();
    expect(mockProps.onResume).toHaveBeenCalled();
  });

  it('starts recording', async () => {
    (demoRecorderService.isRecording as vi.Mock).mockReturnValue(false);
    render(<GameMenu {...mockProps} />);

    const recordBtn = screen.getByText('Record Demo');
    fireEvent.click(recordBtn);

    expect(demoRecorderService.startRecording).toHaveBeenCalled();
    expect(mockProps.onResume).toHaveBeenCalled();
    // State update triggers re-render, button text should change
    expect(screen.getByText('Stop Recording Demo')).toBeInTheDocument();
  });

  it('stops recording and downloads', async () => {
    (demoRecorderService.isRecording as vi.Mock).mockReturnValue(true);
    (demoRecorderService.stopRecording as vi.Mock).mockResolvedValue(new Uint8Array([1, 2, 3]));

    render(<GameMenu {...mockProps} />);

    const recordBtn = screen.getByText('Stop Recording Demo');
    fireEvent.click(recordBtn);

    await waitFor(() => {
        expect(demoRecorderService.stopRecording).toHaveBeenCalled();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    expect(screen.getByText('Record Demo')).toBeInTheDocument();
  });

  it('stops recording without download if no data', async () => {
    (demoRecorderService.isRecording as vi.Mock).mockReturnValue(true);
    (demoRecorderService.stopRecording as vi.Mock).mockResolvedValue(null);

    render(<GameMenu {...mockProps} />);

    const recordBtn = screen.getByText('Stop Recording Demo');
    fireEvent.click(recordBtn);

    await waitFor(() => {
        expect(demoRecorderService.stopRecording).toHaveBeenCalled();
        expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });

    expect(await screen.findByText(/Record Demo/i)).toBeInTheDocument();
  });

  it('logs unimplemented settings', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      render(<GameMenu {...mockProps} />);
      fireEvent.click(screen.getByText('Settings'));
      expect(consoleSpy).toHaveBeenCalledWith('Settings not implemented yet');
      consoleSpy.mockRestore();
  });
});
