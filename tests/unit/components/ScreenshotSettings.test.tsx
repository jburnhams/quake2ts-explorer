import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ScreenshotSettings } from '@/src/components/ScreenshotSettings';

describe('ScreenshotSettings', () => {
  const mockOnCapture = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <ScreenshotSettings
        isOpen={true}
        onCapture={mockOnCapture}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Screenshot Settings')).toBeTruthy();
    expect(screen.getByText('Format:')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Capture')).toBeTruthy();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ScreenshotSettings
        isOpen={false}
        onCapture={mockOnCapture}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(
      <ScreenshotSettings
        isOpen={true}
        onCapture={mockOnCapture}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onCapture with default settings when Capture is clicked', () => {
    render(
      <ScreenshotSettings
        isOpen={true}
        onCapture={mockOnCapture}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Capture'));
    expect(mockOnCapture).toHaveBeenCalledWith({
      format: 'png',
      quality: 0.95,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('allows changing format to jpeg', () => {
    render(
      <ScreenshotSettings
        isOpen={true}
        onCapture={mockOnCapture}
        onClose={mockOnClose}
      />
    );

    const formatSelect = screen.getByDisplayValue('PNG (Lossless)');
    fireEvent.change(formatSelect, { target: { value: 'jpeg' } });

    expect(screen.getByText(/Quality:/)).toBeTruthy(); // Quality slider should appear

    fireEvent.click(screen.getByText('Capture'));
    expect(mockOnCapture).toHaveBeenCalledWith({
      format: 'jpeg',
      quality: 0.95,
    });
  });

  it('allows changing quality for jpeg', () => {
    render(
      <ScreenshotSettings
        isOpen={true}
        onCapture={mockOnCapture}
        onClose={mockOnClose}
      />
    );

    // Switch to JPEG
    const formatSelect = screen.getByDisplayValue('PNG (Lossless)');
    fireEvent.change(formatSelect, { target: { value: 'jpeg' } });

    // Change quality
    const qualitySlider = screen.getByRole('slider');
    fireEvent.change(qualitySlider, { target: { value: '0.5' } });

    fireEvent.click(screen.getByText('Capture'));
    expect(mockOnCapture).toHaveBeenCalledWith({
      format: 'jpeg',
      quality: 0.5,
    });
  });
});
