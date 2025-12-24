import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import App from '@/src/App';
import { settingsService } from '@/src/services/settingsService';

// Mock dependencies
vi.mock('@/src/services/videoRecorder');

// Mock usePakExplorer to avoid VFS issues
vi.mock('@/src/hooks/usePakExplorer', () => ({
  usePakExplorer: () => ({
    pakService: {
        listDirectory: vi.fn(() => []),
        hasFile: vi.fn(() => false),
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
    handleFileSelect: vi.fn(),
    handleTreeSelect: vi.fn(),
    hasFile: vi.fn(() => false),
    dismissError: vi.fn(),
    loadFromUrl: vi.fn(),
    startGameMode: vi.fn(),
    stopGameMode: vi.fn(),
    togglePause: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    removePak: vi.fn(),
    setViewMode: vi.fn(),
  })
}));

// Mock Engine
vi.mock('quake2ts/engine', () => ({
  createWebGLContext: vi.fn(() => ({
    gl: {
      createShader: vi.fn(),
      createProgram: vi.fn(),
      linkProgram: vi.fn(),
      attachShader: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      enable: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createVertexArray: vi.fn(),
      bindVertexArray: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      drawElements: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      activeTexture: vi.fn(),
      uniform1i: vi.fn(),
      uniform1f: vi.fn(),
      uniform3fv: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      getUniformLocation: vi.fn(() => ({})),
      getAttribLocation: vi.fn(() => 0),
    },
    canvas: {
      width: 800,
      height: 600,
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: () => ({ top: 0, left: 0, width: 800, height: 600 }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })),
  Camera: vi.fn(() => ({
    position: [0, 0, 0],
    angles: [0, 0, 0],
    fov: 90,
    updateMatrices: vi.fn()
  })),
  VirtualFileSystem: vi.fn(),
  PakArchive: vi.fn(),
  InputController: vi.fn(),
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
    vi.clearAllMocks();
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
