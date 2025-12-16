import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameMenu } from '../../../src/components/GameMenu';

describe('GameMenu', () => {
  const mockResume = jest.fn();
  const mockSave = jest.fn();
  const mockLoad = jest.fn();
  const mockQuit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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

    fireEvent.click(screen.getByText('Save Game'));
    expect(mockSave).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Load Game'));
    expect(mockLoad).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Quit to Browser'));
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });
});
