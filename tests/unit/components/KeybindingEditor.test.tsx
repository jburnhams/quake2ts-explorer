import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeybindingEditor } from '@/src/components/KeybindingEditor';
import { keybindingService } from '@/src/services/keybindingService';

// Mock the service
vi.mock('@/src/services/keybindingService', () => ({
  keybindingService: {
    getBindings: vi.fn(),
    bindKey: vi.fn(),
    unbindKey: vi.fn(),
    checkConflict: vi.fn(),
    resetToDefaults: vi.fn(),
    resetCategory: vi.fn(),
    applyPreset: vi.fn(),
  },
  ACTION_CATEGORIES: {},
}));

const mockBindings = [
  { action: '+forward', category: 'Movement', description: 'Move Forward', primaryKey: 'KeyW', secondaryKey: 'ArrowUp' },
  { action: '+jump', category: 'Movement', description: 'Jump', primaryKey: 'Space', secondaryKey: null },
  { action: '+attack', category: 'Combat', description: 'Attack', primaryKey: 'Mouse1', secondaryKey: 'ControlRight' },
];

describe('KeybindingEditor', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    (keybindingService.getBindings as vi.Mock).mockReturnValue(mockBindings);
    vi.clearAllMocks();
  });

  test('renders binding list correctly', () => {
    render(<KeybindingEditor onClose={mockOnClose} />);

    expect(screen.getByText('Key Bindings')).toBeInTheDocument();
    expect(screen.getByText('Move Forward')).toBeInTheDocument();
    expect(screen.getByText('KeyW')).toBeInTheDocument();
    expect(screen.getByText('ArrowUp')).toBeInTheDocument();
    expect(screen.getByText('Jump')).toBeInTheDocument();
  });

  test('filters by search query', () => {
    render(<KeybindingEditor onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText('Search actions...');
    fireEvent.change(searchInput, { target: { value: 'Jump' } });

    expect(screen.getByText('Jump')).toBeInTheDocument();
    expect(screen.queryByText('Move Forward')).not.toBeInTheDocument();
  });

  test('filters by category', () => {
    render(<KeybindingEditor onClose={mockOnClose} />);

    const combatBtn = screen.getByText('Combat');
    fireEvent.click(combatBtn);

    expect(screen.getByText('Attack')).toBeInTheDocument();
    expect(screen.queryByText('Move Forward')).not.toBeInTheDocument();
  });

  test('enters capture mode on click', () => {
    render(<KeybindingEditor onClose={mockOnClose} />);

    const keyCell = screen.getByText('KeyW');
    fireEvent.click(keyCell); // Click primary key for Move Forward

    expect(screen.getByText('Press a key to bind (ESC to cancel)...')).toBeInTheDocument();
  });

  test('binds key on keydown in capture mode', () => {
    render(<KeybindingEditor onClose={mockOnClose} />);

    // Click unbound secondary slot for Jump
    // Need to find the secondary slot for Jump.
    // Since we mock bindings, we know jump is index 1.
    // Jump row: Jump, Space, Unbound
    // We can look for the "Unbound" text in the row containing "Jump"

    // Easier strategy: Just verify mocking works
    const jumpRow = screen.getByText('Jump').closest('.keybinding-row');
    const unboundCell = jumpRow?.querySelectorAll('.col-key')[1]; // Secondary slot

    if (!unboundCell) throw new Error('Unbound cell not found');

    fireEvent.click(unboundCell);

    fireEvent.keyDown(window, { key: 'X', code: 'KeyX' });

    expect(keybindingService.bindKey).toHaveBeenCalledWith('+jump', 'KeyX', 'secondary');
  });

  test('resets to defaults', () => {
    window.confirm = vi.fn(() => true);
    render(<KeybindingEditor onClose={mockOnClose} />);

    const resetBtn = screen.getByText('Reset All Defaults');
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(keybindingService.resetCategory).toHaveBeenCalledWith('All');
  });

  test('unbinds key', () => {
      render(<KeybindingEditor onClose={mockOnClose} />);

      const unbindBtns = screen.getAllByTitle('Unbind');
      fireEvent.click(unbindBtns[0]); // Unbind first available key (Move Forward Primary)

      expect(keybindingService.unbindKey).toHaveBeenCalledWith('+forward', 'primary');
  });
});
