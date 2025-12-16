import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SaveLoadDialog } from '../../../src/components/SaveLoadDialog';
import { saveService } from '../../../src/services/saveService';

// Mock dependencies
jest.mock('../../../src/services/saveService', () => ({
  saveService: {
    listSaves: jest.fn(),
    saveGame: jest.fn(),
    loadGame: jest.fn(),
    deleteSave: jest.fn(),
  },
}));

jest.mock('../../../src/services/consoleService', () => ({
  consoleService: {
    log: jest.fn(),
  },
  LogLevel: {
    INFO: 'INFO',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
    WARNING: 'WARNING',
  },
}));

describe('SaveLoadDialog', () => {
  const mockSaves = [
    { slot: 0, name: 'Quick Save', timestamp: Date.now(), mapName: 'base1', playerState: {}, data: {} },
    { slot: 1, name: 'Level 2 Start', timestamp: Date.now(), mapName: 'bunker1', playerState: {}, data: {} }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (saveService.listSaves as jest.Mock).mockReturnValue(mockSaves);
  });

  test('renders save slots correctly', () => {
    render(<SaveLoadDialog mode="save" onClose={jest.fn()} onActionComplete={jest.fn()} />);

    expect(screen.getByText('Save Game')).toBeInTheDocument();
    expect(screen.getByText('Slot 0')).toBeInTheDocument();
    expect(screen.getByText('Quick Save')).toBeInTheDocument();
    expect(screen.getByText('Slot 1')).toBeInTheDocument();
    expect(screen.getByText('Level 2 Start')).toBeInTheDocument();
    expect(screen.getAllByText('Empty').length).toBe(6); // 8 slots total, 2 filled
  });

  test('handles slot selection', () => {
    render(<SaveLoadDialog mode="save" onClose={jest.fn()} onActionComplete={jest.fn()} />);

    fireEvent.click(screen.getByText('Slot 2')); // Empty slot
    const input = screen.getByPlaceholderText('Enter save name...') as HTMLInputElement;
    expect(input.value).toBe('Save Slot 2');

    fireEvent.click(screen.getByText('Slot 0')); // Existing slot
    expect(input.value).toBe('Quick Save');
  });

  test('saves game successfully', async () => {
    const onActionComplete = jest.fn();
    render(<SaveLoadDialog mode="save" onClose={jest.fn()} onActionComplete={onActionComplete} />);

    // Select empty slot 2
    fireEvent.click(screen.getByText('Slot 2'));

    // Click Save
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    await act(async () => {
        fireEvent.click(saveBtn);
    });

    expect(saveService.saveGame).toHaveBeenCalledWith(2, 'Save Slot 2');
    expect(onActionComplete).toHaveBeenCalled();
  });

  test('loads game successfully', async () => {
    const onActionComplete = jest.fn();
    (saveService.loadGame as jest.Mock).mockResolvedValue(mockSaves[0]);

    render(<SaveLoadDialog mode="load" onClose={jest.fn()} onActionComplete={onActionComplete} />);

    // Select slot 0
    fireEvent.click(screen.getByText('Slot 0'));

    // Click Load
    const loadBtn = screen.getByRole('button', { name: 'Load' });
    await act(async () => {
        fireEvent.click(loadBtn);
    });

    expect(saveService.loadGame).toHaveBeenCalledWith(0);
    expect(onActionComplete).toHaveBeenCalled();
  });

  test('delete save functionality', async () => {
    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(<SaveLoadDialog mode="load" onClose={jest.fn()} onActionComplete={jest.fn()} />);

    // Find delete button for slot 0
    const deleteButtons = screen.getAllByTitle('Delete Save');
    await act(async () => {
        fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(saveService.deleteSave).toHaveBeenCalledWith(0);
  });
});
