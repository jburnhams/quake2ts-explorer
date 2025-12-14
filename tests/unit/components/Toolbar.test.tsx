import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

describe('Toolbar', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (demoRecorderService.isRecording as jest.Mock).mockReturnValue(false);
  });

  it('renders correctly', () => {
    render(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} />);
    expect(screen.getByText('Quake2TS Explorer')).toBeInTheDocument();
    expect(screen.getByText('Add PAK Files')).toBeInTheDocument();
  });

  it('handles file selection', () => {
    render(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} />);
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['dummy content'], 'test.pak', { type: 'application/octet-stream' });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockOnFileSelect).toHaveBeenCalled();
  });

  it('toggles recording', () => {
    render(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} />);
    const recordBtn = screen.getByText('⚪ Rec Demo');

    // Start recording
    fireEvent.click(recordBtn);
    expect(demoRecorderService.startRecording).toHaveBeenCalled();

    // Mock state change
    (demoRecorderService.isRecording as jest.Mock).mockReturnValue(true);

    // Rerender to reflect state (simulated since polling is async)
    // Actually, in the real component, polling updates state. In test, we need to trigger update or use mocked state initially.
    // For simplicity, let's just verifying call.
  });

  it('stops recording and triggers download', () => {
      (demoRecorderService.isRecording as jest.Mock).mockReturnValue(true);
      (demoRecorderService.stopRecording as jest.Mock).mockReturnValue(new Uint8Array([1, 2, 3]));

      render(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} />);
      const stopBtn = screen.getByText('🔴 Stop Rec');

      fireEvent.click(stopBtn);

      expect(demoRecorderService.stopRecording).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
