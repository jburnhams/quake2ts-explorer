import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PakOrderManager } from '@/src/components/PakOrderManager.tsx';
import { PakService, MountedPak } from '@/src/services/pakService.ts';
import React from 'react';

// Mock PakArchive
const createMockArchive = (files: string[]) => ({
  listEntries: () => files.map(f => ({ name: f })),
} as any);

describe('PakOrderManager', () => {
  let mockPakService: Partial<PakService>;
  let mockPaks: MountedPak[];
  let onClose: jest.Mock;

  beforeEach(() => {
    mockPaks = [
      {
        id: 'pak1',
        name: 'baseq2/pak0.pak',
        archive: createMockArchive(['file1.txt', 'file2.txt']),
        isUser: false,
        priority: 0
      },
      {
        id: 'pak2',
        name: 'baseq2/pak1.pak',
        archive: createMockArchive(['file2.txt', 'file3.txt']), // Overrides file2.txt because priority is higher
        isUser: false,
        priority: 10
      }
    ];

    mockPakService = {
      getMountedPaks: jest.fn().mockReturnValue(mockPaks),
      reorderPaks: jest.fn(),
    };
    onClose = jest.fn();
  });

  test('renders list of paks', () => {
    render(<PakOrderManager pakService={mockPakService as PakService} onClose={onClose} />);

    expect(screen.getByText('baseq2/pak0.pak')).toBeInTheDocument();
    expect(screen.getByText('baseq2/pak1.pak')).toBeInTheDocument();
  });

  test('detects overridden files', () => {
    render(<PakOrderManager pakService={mockPakService as PakService} onClose={onClose} />);

    // Open file lists
    const showButtons = screen.getAllByText('Show Files');
    fireEvent.click(showButtons[0]); // pak0
    fireEvent.click(showButtons[1]); // pak1

    // pak0's file2.txt should be overridden
    // pak1's file2.txt should NOT be overridden
    // We need to find the specific elements.
    // The list is rendered in order: pak0, pak1.
    // So the first 'file2.txt' corresponds to pak0.

    const fileItems = screen.getAllByText('file2.txt');
    const pak0FileItem = fileItems[0].closest('.file-item');
    const pak1FileItem = fileItems[1].closest('.file-item');

    expect(pak0FileItem).toHaveClass('overridden');
    expect(pak0FileItem).toHaveTextContent('Overridden');
    expect(pak1FileItem).not.toHaveClass('overridden');
  });

  test('moves pak down swaps order and updates priority on save', () => {
    render(<PakOrderManager pakService={mockPakService as PakService} onClose={onClose} />);

    // Initial order: pak1 (0), pak2 (10)
    // Move pak1 down -> New order: pak2, pak1

    const moveDownButtons = screen.getAllByTitle(/Move Down/);
    // Only the first one (pak1) should be enabled/visible for moving down
    // Actually the last one is disabled.
    fireEvent.click(moveDownButtons[0]);

    const saveButton = screen.getByText('Apply Changes');
    fireEvent.click(saveButton);

    // Expect pak2 then pak1
    expect(mockPakService.reorderPaks).toHaveBeenCalledWith(['pak2', 'pak1']);
    expect(onClose).toHaveBeenCalled();
  });

  test('moves pak up swaps order', () => {
    render(<PakOrderManager pakService={mockPakService as PakService} onClose={onClose} />);

    // Initial order: pak1 (0), pak2 (10)
    // Move pak2 up -> New order: pak2, pak1

    const moveUpButtons = screen.getAllByTitle(/Move Up/);
    // pak0 is index 0, so moveUp is disabled.
    // pak1 is index 1, so moveUp is enabled.
    fireEvent.click(moveUpButtons[1]);

    const saveButton = screen.getByText('Apply Changes');
    fireEvent.click(saveButton);

    expect(mockPakService.reorderPaks).toHaveBeenCalledWith(['pak2', 'pak1']);
  });
});
