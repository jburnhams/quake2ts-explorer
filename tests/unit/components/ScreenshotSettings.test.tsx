import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScreenshotSettings } from '@/src/components/ScreenshotSettings';
import '@testing-library/jest-dom';

describe('ScreenshotSettings', () => {
  const mockOnCapture = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnCapture.mockClear();
    mockOnClose.mockClear();
  });

  it('renders correctly when open', () => {
    render(
      <ScreenshotSettings
        onCapture={mockOnCapture}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Screenshot Settings')).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ScreenshotSettings
        onCapture={mockOnCapture}
        isOpen={false}
        onClose={mockOnClose}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(
      <ScreenshotSettings
        onCapture={mockOnCapture}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onCapture with default settings when Capture is clicked', () => {
    render(
      <ScreenshotSettings
        onCapture={mockOnCapture}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Capture'));
    expect(mockOnCapture).toHaveBeenCalledWith({
      format: 'png',
      quality: 0.95,
      resolutionMultiplier: 1,
      includeHud: false
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('allows changing format to jpeg', () => {
    render(
      <ScreenshotSettings
        onCapture={mockOnCapture}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    // Get format selector by finding the label "Format:" and then the associated select
    // However, the component structure is <label>Format:</label> <select ...>
    // So we can target the select by display value or by finding all comboboxes.
    // The first combobox is format.
    const selects = screen.getAllByRole('combobox');
    const formatSelect = selects[0];

    fireEvent.change(formatSelect, {
      target: { value: 'jpeg' }
    });

    fireEvent.click(screen.getByText('Capture'));
    expect(mockOnCapture).toHaveBeenCalledWith({
      format: 'jpeg',
      quality: 0.95,
      resolutionMultiplier: 1,
      includeHud: false
    });
  });

  it('allows changing quality for jpeg', () => {
    render(
      <ScreenshotSettings
        onCapture={mockOnCapture}
        isOpen={true}
        onClose={mockOnClose}
      />
    );

    const selects = screen.getAllByRole('combobox');
    const formatSelect = selects[0];

    // Change format to jpeg first
    fireEvent.change(formatSelect, {
      target: { value: 'jpeg' }
    });

    // Change quality
    fireEvent.change(screen.getByRole('slider'), {
      target: { value: '0.5' }
    });

    fireEvent.click(screen.getByText('Capture'));
    expect(mockOnCapture).toHaveBeenCalledWith({
      format: 'jpeg',
      quality: 0.5,
      resolutionMultiplier: 1,
      includeHud: false
    });
  });

  it('allows enabling Include HUD', () => {
      render(
        <ScreenshotSettings
          onCapture={mockOnCapture}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Check Include HUD checkbox
      fireEvent.click(screen.getByLabelText(/Include HUD/i));

      fireEvent.click(screen.getByText('Capture'));
      expect(mockOnCapture).toHaveBeenCalledWith({
        format: 'png',
        quality: 0.95,
        resolutionMultiplier: 1,
        includeHud: true
      });
  });
});
