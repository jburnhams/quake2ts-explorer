import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BookmarkList, BookmarkListProps } from '@/src/components/BookmarkList';
import { Bookmark } from '@/src/services/bookmarkService';

describe('BookmarkList', () => {
  const mockBookmarks: Bookmark[] = [
    {
      id: '1',
      name: 'Test Bookmark 1',
      frame: 100,
      timeSeconds: 10,
      createdAt: 1234567890
    },
    {
      id: '2',
      name: 'Test Bookmark 2',
      frame: 200,
      timeSeconds: 20,
      createdAt: 1234567891
    }
  ];

  const defaultProps: BookmarkListProps = {
    bookmarks: mockBookmarks,
    onJumpTo: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn()
  };

  it('renders a list of bookmarks', () => {
    render(<BookmarkList {...defaultProps} />);
    expect(screen.getByText('Test Bookmark 1')).toBeInTheDocument();
    expect(screen.getByText('Test Bookmark 2')).toBeInTheDocument();
  });

  it('renders empty state when no bookmarks', () => {
    render(<BookmarkList {...defaultProps} bookmarks={[]} />);
    expect(screen.getByText('No bookmarks yet.')).toBeInTheDocument();
  });

  it('calls onJumpTo when clicking a bookmark info area', () => {
    render(<BookmarkList {...defaultProps} />);
    fireEvent.click(screen.getByText('Test Bookmark 1'));
    expect(defaultProps.onJumpTo).toHaveBeenCalledWith(100);
  });

  it('calls onEdit when clicking edit button', () => {
    render(<BookmarkList {...defaultProps} />);
    const editButtons = screen.getAllByTitle('Edit bookmark');
    fireEvent.click(editButtons[0]);
    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockBookmarks[0]);
  });

  it('calls onDelete when clicking delete button', () => {
    render(<BookmarkList {...defaultProps} />);
    const deleteButtons = screen.getAllByTitle('Delete bookmark');
    fireEvent.click(deleteButtons[0]);
    expect(defaultProps.onDelete).toHaveBeenCalledWith('1');
  });

  it('calls onExport when clicking export button', () => {
    render(<BookmarkList {...defaultProps} />);
    fireEvent.click(screen.getByText('Export'));
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('calls onImport when a file is selected', () => {
    render(<BookmarkList {...defaultProps} />);
    const importBtn = screen.getByText('Import');
    // The button clicks the hidden input.
    // We can simulate the click on the input directly or just rely on the button triggering it (but we can't easily mock click() on input in jsdom without refs setup correctly and integration).
    // Let's find the input.
    const fileInput = screen.getByTitle('Import Bookmarks JSON')?.nextSibling as HTMLInputElement;
    // Actually the input is separate.
    // Let's query by display:none if possible or look at structure.
    // The input has no label or visible text, so we might need to rely on container structure or modify component to have data-testid.

    // Actually, simply query selector by type="file"
    // Note: react-testing-library recommends role/label, but hidden inputs are hard.
    // Let's modify component to add data-testid if needed, or select by container.

    // In BookmarkList.tsx:
    // <input type="file" ... />

    // Let's try selecting by type.
    const inputs = document.querySelectorAll('input[type="file"]');
    // Since we rendered into document.body by default or container, it should be there.

    // But let's check render output.
    const fileNode = document.querySelector('input[type="file"]');
    expect(fileNode).not.toBeNull();

    const file = new File(['{}'], 'bookmarks.json', { type: 'application/json' });
    fireEvent.change(fileNode!, { target: { files: [file] } });

    expect(defaultProps.onImport).toHaveBeenCalledWith(file);
  });
});
