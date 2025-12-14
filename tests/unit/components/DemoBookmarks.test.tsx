import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DemoBookmarks } from '@/src/components/DemoBookmarks';
import { bookmarkService } from '@/src/services/bookmarkService';

// Mock the controller
const mockController = {
  getCurrentTime: jest.fn(() => 10.5),
  getCurrentFrame: jest.fn(() => 100),
  pause: jest.fn(),
  seekToFrame: jest.fn(),
  play: jest.fn()
};

// Mock bookmark service
jest.mock('@/src/services/bookmarkService', () => ({
  bookmarkService: {
    getBookmarks: jest.fn(() => []),
    addBookmark: jest.fn(),
    deleteBookmark: jest.fn()
  }
}));

describe('DemoBookmarks', () => {
  const demoId = 'test-demo-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (bookmarkService.getBookmarks as jest.Mock).mockReturnValue([]);
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
    // Use query for specific header element or use getAllByText if multiple exist
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
    (bookmarkService.getBookmarks as jest.Mock).mockReturnValue([
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

  it('should jump to bookmark', () => {
    (bookmarkService.getBookmarks as jest.Mock).mockReturnValue([
      { id: '1', name: 'Jump Target', frame: 500, timeSeconds: 50 }
    ]);

    render(<DemoBookmarks controller={mockController as any} demoId={demoId} />);
    fireEvent.click(screen.getByText('📂 List'));

    fireEvent.click(screen.getByText('Jump Target'));
    expect(mockController.seekToFrame).toHaveBeenCalledWith(500);
  });
});
