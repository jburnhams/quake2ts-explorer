import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameMenu } from '../../../src/components/GameMenu';

// Mock SaveLoadDialog to verify it gets rendered
vi.mock('../../../src/components/SaveLoadDialog', () => ({
  SaveLoadDialog: ({ mode, onClose }: { mode: string, onClose: () => void }) => (
    <div data-testid="save-load-dialog">
      Dialog Mode: {mode}
      <button onClick={onClose}>Close Dialog</button>
    </div>
  )
}));

describe('GameMenu', () => {
  const mockResume = vi.fn();
  const mockSave = vi.fn();
  const mockLoad = vi.fn();
  const mockQuit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <GameMenu
        onResume={mockResume}
        onSave={mockSave}
        onLoad={mockLoad}
        onQuit={mockQuit}
      />
    );

    expect(screen.getByText('Game Paused')).toBeInTheDocument();
    expect(screen.getByText('Resume Game')).toBeInTheDocument();
    expect(screen.getByText('Save Game')).toBeInTheDocument();
    expect(screen.getByText('Load Game')).toBeInTheDocument();
    expect(screen.getByText('Quit to Browser')).toBeInTheDocument();
  });

  it('calls handlers when buttons are clicked', () => {
    render(
      <GameMenu
        onResume={mockResume}
        onSave={mockSave}
        onLoad={mockLoad}
        onQuit={mockQuit}
      />
    );

    fireEvent.click(screen.getByText('Resume Game'));
    expect(mockResume).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Quit to Browser'));
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });

  it('opens save/load dialog when buttons are clicked', () => {
    render(
      <GameMenu
        onResume={mockResume}
        onSave={mockSave}
        onLoad={mockLoad}
        onQuit={mockQuit}
      />
    );

    // Save
    fireEvent.click(screen.getByText('Save Game'));
    expect(screen.getByTestId('save-load-dialog')).toHaveTextContent('Dialog Mode: save');

    // Close it
    fireEvent.click(screen.getByText('Close Dialog'));
    expect(screen.queryByTestId('save-load-dialog')).not.toBeInTheDocument();

    // Load
    fireEvent.click(screen.getByText('Load Game'));
    expect(screen.getByTestId('save-load-dialog')).toHaveTextContent('Dialog Mode: load');
  });
});
