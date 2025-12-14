import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Toolbar } from '../../../src/components/Toolbar';
import { demoRecorderService } from '../../../src/services/demoRecorder';
import { MapEditorProvider } from '../../../src/context/MapEditorContext';

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

  const renderWithContext = (ui: React.ReactElement) => {
    return render(<MapEditorProvider>{ui}</MapEditorProvider>);
  };

  it('renders correctly', () => {
    renderWithContext(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} viewMode="by-pak" onViewModeChange={() => {}} />);
    expect(screen.getByText('Quake2TS Explorer')).toBeInTheDocument();
    expect(screen.getByText('Add PAK Files')).toBeInTheDocument();
  });

  it('handles file selection', () => {
    renderWithContext(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} viewMode="by-pak" onViewModeChange={() => {}} />);
    const fileInput = screen.getByTestId('file-input');
    const file = new File(['dummy content'], 'test.pak', { type: 'application/octet-stream' });

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockOnFileSelect).toHaveBeenCalled();
  });

  it('toggles recording', () => {
    renderWithContext(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} viewMode="by-pak" onViewModeChange={() => {}} />);
    const recordBtn = screen.getByText('⚪ Rec Demo');

    // Start recording
    fireEvent.click(recordBtn);
    expect(demoRecorderService.startRecording).toHaveBeenCalled();
  });

  it('stops recording and triggers download', () => {
      (demoRecorderService.isRecording as jest.Mock).mockReturnValue(true);
      (demoRecorderService.stopRecording as jest.Mock).mockReturnValue(new Uint8Array([1, 2, 3]));

      renderWithContext(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} viewMode="by-pak" onViewModeChange={() => {}} />);
      const stopBtn = screen.getByText('🔴 Stop Rec');

      fireEvent.click(stopBtn);

      expect(demoRecorderService.stopRecording).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('toggles editor mode', () => {
     renderWithContext(<Toolbar onFileSelect={mockOnFileSelect} pakCount={0} fileCount={0} viewMode="by-pak" onViewModeChange={() => {}} />);
     const editBtn = screen.getByTestId('toggle-editor-button');

     expect(editBtn).toHaveTextContent('Edit Map');
     fireEvent.click(editBtn);
     expect(editBtn).toHaveTextContent('Editing Map');
  });
});
