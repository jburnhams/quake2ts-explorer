import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import App from '@/src/App';
import { settingsService } from '@/src/services/settingsService';

// Mock dependencies
jest.mock('@/src/services/videoRecorder');

// Mock usePakExplorer to avoid VFS issues
jest.mock('@/src/hooks/usePakExplorer', () => ({
  usePakExplorer: () => ({
    pakService: {
        listDirectory: jest.fn(() => []),
        hasFile: jest.fn(() => false),
    },
    fileTree: { name: 'root', path: '/', isDirectory: true, children: [] },
    selectedPath: null,
    metadata: null,
    parsedFile: null,
    pakCount: 0,
    fileCount: 0,
    loading: false,
    error: null,
    gameMode: 'browser',
    viewMode: 'merged',
    handleFileSelect: jest.fn(),
    handleTreeSelect: jest.fn(),
    hasFile: jest.fn(() => false),
    dismissError: jest.fn(),
    loadFromUrl: jest.fn(),
    startGameMode: jest.fn(),
    stopGameMode: jest.fn(),
    togglePause: jest.fn(),
    pauseGame: jest.fn(),
    resumeGame: jest.fn(),
    removePak: jest.fn(),
    setViewMode: jest.fn(),
  })
}));

// Mock Engine
jest.mock('quake2ts/engine', () => ({
  createWebGLContext: jest.fn(() => ({
    gl: {
      createShader: jest.fn(),
      createProgram: jest.fn(),
      linkProgram: jest.fn(),
      attachShader: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      useProgram: jest.fn(),
      enable: jest.fn(),
      clearColor: jest.fn(),
      clear: jest.fn(),
      viewport: jest.fn(),
      getExtension: jest.fn(),
      getParameter: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      createVertexArray: jest.fn(),
      bindVertexArray: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      drawElements: jest.fn(),
      createTexture: jest.fn(),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      texParameteri: jest.fn(),
      activeTexture: jest.fn(),
      uniform1i: jest.fn(),
      uniform1f: jest.fn(),
      uniform3fv: jest.fn(),
      uniformMatrix4fv: jest.fn(),
      getUniformLocation: jest.fn(() => ({})),
      getAttribLocation: jest.fn(() => 0),
    },
    canvas: {
      width: 800,
      height: 600,
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 600 }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
  })),
  Camera: jest.fn(() => ({
    position: [0, 0, 0],
    angles: [0, 0, 0],
    fov: 90,
    updateMatrices: jest.fn()
  })),
  VirtualFileSystem: jest.fn(),
  PakArchive: jest.fn(),
  InputController: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('Settings Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    settingsService.resetToDefaults();
    jest.clearAllMocks();
  });

  it('persists settings to localStorage and applies them', async () => {
    await act(async () => {
      render(<App />);
    });

    // Open settings
    const settingsButton = screen.getByTitle('Settings');
    fireEvent.click(settingsButton);

    // Verify modal open
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Change a setting (e.g., FOV in Graphics)
    fireEvent.click(screen.getByTestId('tab-graphics'));

    // Find FOV input
    // The range input for FOV
    const fovInput = screen.getAllByRole('slider')[1]; // Second slider (first is resolution scale)
    // Actually resolution scale is first range input in my code. FOV is second.
    // Let's verify value to be sure
    // Or better, just grab by value.
    // The resolution scale is default 1.0. FOV default 90.

    fireEvent.change(fovInput, { target: { value: '110' } });

    // Save
    const saveButton = screen.getByTestId('save-settings-button');
    fireEvent.click(saveButton);

    // Verify modal closed
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();

    // Verify persistence
    const stored = JSON.parse(localStorage.getItem('quake2ts-settings') || '{}');
    expect(stored.graphics.fov).toBe(110);

    // Verify service state
    expect(settingsService.getSettings().graphics.fov).toBe(110);
  });

  it('applies accessibility classes to body', async () => {
    await act(async () => {
      render(<App />);
    });

    // Open settings
    fireEvent.click(screen.getByTitle('Settings'));
    fireEvent.click(screen.getByTestId('tab-accessibility'));

    // Toggle High Contrast
    // In AccessibilitySettingsTab, High Contrast is the first checkbox
    // BUT we need to filter for checkboxes INSIDE the modal, because "View Mode" toggle in toolbar is also a checkbox.
    const modal = screen.getByRole('dialog');
    // We can query within the modal
    const checkboxes = within(modal).getAllByRole('checkbox');
    const highContrastCheckbox = checkboxes[0];

    // It should be unchecked initially
    expect(highContrastCheckbox).not.toBeChecked();

    fireEvent.click(highContrastCheckbox);
    expect(highContrastCheckbox).toBeChecked();

    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Check body class
    expect(document.body.classList.contains('high-contrast')).toBe(true);

    // Re-open and disable
    fireEvent.click(screen.getByTitle('Settings'));
    fireEvent.click(screen.getByTestId('tab-accessibility'));

    const modalAgain = screen.getByRole('dialog');
    const checkboxAgain = within(modalAgain).getAllByRole('checkbox')[0];
    expect(checkboxAgain).toBeChecked(); // Should persist

    fireEvent.click(checkboxAgain); // Toggle off
    fireEvent.click(screen.getByTestId('save-settings-button'));

    expect(document.body.classList.contains('high-contrast')).toBe(false);
  });
});
