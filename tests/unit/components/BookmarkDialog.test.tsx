import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BookmarkDialog } from '@/src/components/BookmarkDialog';

describe('BookmarkDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  const defaultProps = {
    currentFrame: 123,
    currentTime: 12.345,
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(<BookmarkDialog {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render correct frame and time info', () => {
    render(<BookmarkDialog {...defaultProps} />);
    expect(screen.getByText(/Frame: 123/)).toBeInTheDocument();
    expect(screen.getByText(/Time: 12.35s/)).toBeInTheDocument(); // 12.345 rounded to 2 decimals
  });

  it('should handle cancel button click', () => {
    render(<BookmarkDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle save', () => {
    render(<BookmarkDialog {...defaultProps} />);

    const nameInput = screen.getByLabelText('Name:');
    const descInput = screen.getByLabelText('Description (optional):');
    const saveBtn = screen.getByText('Save Bookmark');

    fireEvent.change(nameInput, { target: { value: 'My Bookmark' } });
    fireEvent.change(descInput, { target: { value: 'Some details' } });
    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledWith('My Bookmark', 'Some details');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not save if name is empty', () => {
    render(<BookmarkDialog {...defaultProps} />);

    const saveBtn = screen.getByText('Save Bookmark');
    fireEvent.click(saveBtn); // Triggers form submission

    // Since input is required, browser validation prevents submission usually.
    // In JSDOM, we can check if onSave was called.
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
