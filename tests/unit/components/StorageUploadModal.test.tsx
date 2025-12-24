import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StorageUploadModal, StorageUploadModalProps } from '../../../src/components/StorageUploadModal';

describe('StorageUploadModal', () => {
  const defaultProps: StorageUploadModalProps = {
    isOpen: true,
    progress: 50,
    status: 'Uploading...',
    onClose: vi.fn(),
  };

  it('renders nothing when isOpen is false', () => {
    render(<StorageUploadModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('storage-upload-modal')).not.toBeInTheDocument();
  });

  it('renders correctly when open', () => {
    render(<StorageUploadModal {...defaultProps} />);
    expect(screen.getByTestId('storage-upload-modal')).toBeInTheDocument();
    expect(screen.getByText('Uploading to Storage')).toBeInTheDocument();
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('displays progress bar with correct width', () => {
    render(<StorageUploadModal {...defaultProps} progress={75} />);
    const progressBar = screen.getByTestId('upload-progress-bar');
    expect(progressBar).toHaveStyle('width: 75%');
  });

  it('displays current file when provided', () => {
    render(<StorageUploadModal {...defaultProps} currentFile="test.txt" />);
    expect(screen.getByText('Processing: test.txt')).toBeInTheDocument();
  });

  it('does not show close button by default or when canClose is false', () => {
    const { rerender } = render(<StorageUploadModal {...defaultProps} canClose={false} />);
    expect(screen.queryByTestId('close-upload-modal')).not.toBeInTheDocument();

    rerender(<StorageUploadModal {...defaultProps} />);
    expect(screen.queryByTestId('close-upload-modal')).not.toBeInTheDocument();
  });

  it('shows close button when canClose is true', () => {
    render(<StorageUploadModal {...defaultProps} canClose={true} />);
    const closeButton = screen.getByTestId('close-upload-modal');
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('clamps progress between 0 and 100', () => {
    const { rerender } = render(<StorageUploadModal {...defaultProps} progress={-10} />);
    let progressBar = screen.getByTestId('upload-progress-bar');
    expect(progressBar).toHaveStyle('width: 0%');

    rerender(<StorageUploadModal {...defaultProps} progress={150} />);
    progressBar = screen.getByTestId('upload-progress-bar');
    expect(progressBar).toHaveStyle('width: 100%');
  });
});
