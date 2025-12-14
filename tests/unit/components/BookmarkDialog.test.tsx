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
    expect(screen.getByText(/Time: 12.35s/)).toBeInTheDocument();
    expect(screen.getByText('Add Bookmark')).toBeInTheDocument();
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

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('should render in edit mode with initial values', () => {
    render(<BookmarkDialog {...defaultProps} isEditing={true} initialName="Existing" initialDescription="Desc" />);

    expect(screen.getByText('Edit Bookmark')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Desc')).toBeInTheDocument();
  });
});
