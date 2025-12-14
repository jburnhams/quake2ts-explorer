import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookmarkList } from '@/src/components/BookmarkList';

describe('BookmarkList', () => {
  const mockOnJumpTo = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnEdit = jest.fn();

  const mockBookmarks = [
    { id: '1', name: 'Start', frame: 0, timeSeconds: 0, createdAt: 123 },
    { id: '2', name: 'Action', frame: 600, timeSeconds: 65, description: 'Big fight', createdAt: 456 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render empty state', () => {
    render(<BookmarkList bookmarks={[]} onJumpTo={mockOnJumpTo} onDelete={mockOnDelete} onEdit={mockOnEdit} />);
    expect(screen.getByText('No bookmarks yet.')).toBeInTheDocument();
  });

  it('should render bookmarks', () => {
    render(<BookmarkList bookmarks={mockBookmarks} onJumpTo={mockOnJumpTo} onDelete={mockOnDelete} onEdit={mockOnEdit} />);

    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('0:00')).toBeInTheDocument();

    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('1:05')).toBeInTheDocument(); // 65 seconds
    expect(screen.getByText('Big fight')).toBeInTheDocument();
  });

  it('should handle jump to bookmark', () => {
    render(<BookmarkList bookmarks={mockBookmarks} onJumpTo={mockOnJumpTo} onDelete={mockOnDelete} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByText('Start'));
    expect(mockOnJumpTo).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByText('Action'));
    expect(mockOnJumpTo).toHaveBeenCalledWith(600);
  });

  it('should handle delete bookmark', () => {
    render(<BookmarkList bookmarks={mockBookmarks} onJumpTo={mockOnJumpTo} onDelete={mockOnDelete} onEdit={mockOnEdit} />);

    const deleteButtons = screen.getAllByTitle('Delete bookmark');
    fireEvent.click(deleteButtons[0]);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should handle edit bookmark', () => {
    render(<BookmarkList bookmarks={mockBookmarks} onJumpTo={mockOnJumpTo} onDelete={mockOnDelete} onEdit={mockOnEdit} />);

    const editButtons = screen.getAllByTitle('Edit bookmark');
    fireEvent.click(editButtons[0]);
    expect(mockOnEdit).toHaveBeenCalledWith(mockBookmarks[0]);
  });
});
