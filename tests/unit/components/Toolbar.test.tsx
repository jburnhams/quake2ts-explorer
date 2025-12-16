import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toolbar } from '../../../src/components/Toolbar';
import { demoRecorderService } from '../../../src/services/demoRecorder';

// Mock the demoRecorderService
jest.mock('../../../src/services/demoRecorder', () => ({
  demoRecorderService: {
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    isRecording: jest.fn()
  }
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

describe('Toolbar', () => {
  const mockOnFileSelect = jest.fn();
  const mockOnViewModeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (demoRecorderService.isRecording as jest.Mock).mockReturnValue(false);
  });

  it('renders correctly', () => {
    render(
      <Toolbar
        onFileSelect={mockOnFileSelect}
        pakCount={0}
        fileCount={0}
        viewMode="merged"
        onViewModeChange={mockOnViewModeChange}
      />
    );
    expect(screen.getByText('Quake2TS Explorer')).toBeInTheDocument();
    expect(screen.getByText('Add PAK Files')).toBeInTheDocument();
  });

  it('handles file selection', () => {
    render(
      <Toolbar
        onFileSelect={mockOnFileSelect}
        pakCount={0}
        fileCount={0}
        viewMode="merged"
        onViewModeChange={mockOnViewModeChange}
      />
    );
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['dummy content'], 'test.pak', { type: 'application/octet-stream' });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockOnFileSelect).toHaveBeenCalled();
  });

  it('toggles recording', async () => {
    render(
      <Toolbar
        onFileSelect={mockOnFileSelect}
        pakCount={0}
        fileCount={0}
        viewMode="merged"
        onViewModeChange={mockOnViewModeChange}
      />
    );
    const recordBtn = screen.getByText('⚪ Rec Demo');

    // Start recording
    await act(async () => {
      fireEvent.click(recordBtn);
    });
    expect(demoRecorderService.startRecording).toHaveBeenCalled();
  });

  it('stops recording', async () => {
      (demoRecorderService.isRecording as jest.Mock).mockReturnValue(true);
      (demoRecorderService.stopRecording as jest.Mock).mockResolvedValue(new Uint8Array([1, 2, 3]));

      render(
        <Toolbar
          onFileSelect={mockOnFileSelect}
          pakCount={0}
          fileCount={0}
          viewMode="merged"
          onViewModeChange={mockOnViewModeChange}
        />
      );
      const stopBtn = screen.getByText('🔴 Stop Rec');

      await act(async () => {
        fireEvent.click(stopBtn);
      });

      expect(demoRecorderService.stopRecording).toHaveBeenCalled();
      // Note: Download logic is triggered, but since we updated Toolbar to use auto-save logic in service (mostly),
      // or at least removed explicit download trigger if logic changed.
      // Wait, let's check Toolbar.tsx content again.
  });
});
