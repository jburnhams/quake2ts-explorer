import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoBookmarks } from '@/src/components/DemoBookmarks';
import { bookmarkService } from '@/src/services/bookmarkService';

// Mock the controller
const mockController = {
  getCurrentTime: vi.fn(() => 10.5),
  getCurrentFrame: vi.fn(() => 100),
  pause: vi.fn(),
  seekToFrame: vi.fn(),
  play: vi.fn()
};

// Mock bookmark service
vi.mock('@/src/services/bookmarkService', () => ({
  bookmarkService: {
    getBookmarks: vi.fn(() => []),
    addBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    deleteBookmark: vi.fn()
  }
}));

describe('DemoBookmarks', () => {
  const demoId = 'test-demo-1';

  beforeEach(() => {
    vi.clearAllMocks();
    (bookmarkService.getBookmarks as vi.Mock).mockReturnValue([]);
  });

  it('should render buttons', () => {
    render(<DemoBookmarks controller={mockController as any} demoId={demoId} />);
    expect(screen.getByText('🔖 Add Bookmark')).toBeInTheDocument();
    expect(screen.getByText('📂 List')).toBeInTheDocument();
  });

  it('should open dialog and pause on add click', () => {
    render(<DemoBookmarks controller={mockController as any} demoId={demoId} />);

    fireEvent.click(screen.getByText('🔖 Add Bookmark'));

    expect(mockController.pause).toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Add Bookmark' })).toBeInTheDocument();
  });

  it('should save bookmark', async () => {
    render(<DemoBookmarks controller={mockController as any} demoId={demoId} />);

    fireEvent.click(screen.getByText('🔖 Add Bookmark'));

    const nameInput = screen.getByLabelText('Name:');
    fireEvent.change(nameInput, { target: { value: 'Test Mark' } });

    fireEvent.click(screen.getByText('Save Bookmark'));

    expect(bookmarkService.addBookmark).toHaveBeenCalledWith(demoId, expect.objectContaining({
      name: 'Test Mark',
      frame: 100,
      timeSeconds: 10.5
    }));
  });

  it('should toggle list visibility', () => {
    (bookmarkService.getBookmarks as vi.Mock).mockReturnValue([
      { id: '1', name: 'Saved Mark', frame: 50, timeSeconds: 5 }
    ]);

    render(<DemoBookmarks controller={mockController as any} demoId={demoId} />);

    // Initially hidden
    expect(screen.queryByText('Saved Mark')).not.toBeInTheDocument();

    // Show
    fireEvent.click(screen.getByText('📂 List'));
    expect(screen.getByText('Saved Mark')).toBeInTheDocument();

    // Hide
    fireEvent.click(screen.getByText('📂 List'));
    expect(screen.queryByText('Saved Mark')).not.toBeInTheDocument();
  });

  it('should edit a bookmark', () => {
    const bookmark = { id: '1', name: 'Original', frame: 50, timeSeconds: 5 };
    (bookmarkService.getBookmarks as vi.Mock).mockReturnValue([bookmark]);

    render(<DemoBookmarks controller={mockController as any} demoId={demoId} />);
    fireEvent.click(screen.getByText('📂 List'));

    // Click edit
    const editBtn = screen.getByTitle('Edit bookmark');
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: 'Edit Bookmark' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Original')).toBeInTheDocument();

    // Change name
    const nameInput = screen.getByLabelText('Name:');
    fireEvent.change(nameInput, { target: { value: 'Updated' } });

    fireEvent.click(screen.getByText('Save Changes'));

    expect(bookmarkService.updateBookmark).toHaveBeenCalledWith(demoId, '1', expect.objectContaining({
        name: 'Updated'
    }));
  });
});
