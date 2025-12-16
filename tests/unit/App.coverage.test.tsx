import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';
import { usePakExplorer } from '../../src/hooks/usePakExplorer';
import { consoleService, LogLevel } from '../../src/services/consoleService';
import { saveService } from '../../src/services/saveService';

// Mocks
jest.mock('../../src/hooks/usePakExplorer');
jest.mock('../../src/services/consoleService');
jest.mock('../../src/services/saveService');

// Mock child components to avoid deep rendering issues
jest.mock('../../src/components/Toolbar', () => ({
  Toolbar: ({ onOpenEntityDatabase, onOpenPakManager }: any) => (
    <div data-testid="toolbar">
      <button onClick={onOpenEntityDatabase} data-testid="open-entity-db">Open Entity DB</button>
      <button onClick={onOpenPakManager} data-testid="open-pak-manager">Open Pak Manager</button>
    </div>
  )
}));
jest.mock('../../src/components/FileTree', () => ({ FileTree: () => <div data-testid="file-tree" /> }));
jest.mock('../../src/components/PreviewPanel', () => ({
  PreviewPanel: ({ onClassnamesLoaded, onEntitySelected }: any) => (
    <div data-testid="preview-panel">
      <button onClick={() => onClassnamesLoaded(['class1', 'class2'])} data-testid="trigger-classnames">Trigger Classnames</button>
      <button onClick={() => onEntitySelected({ id: 1 })} data-testid="trigger-entity">Trigger Entity</button>
    </div>
  )
}));
jest.mock('../../src/components/MetadataPanel', () => ({ MetadataPanel: () => <div data-testid="metadata-panel" /> }));
jest.mock('../../src/components/DropZone', () => ({ DropZone: ({ children }: any) => <div>{children}</div> }));
jest.mock('../../src/components/ResizablePanel', () => ({
  ResizablePanel: ({ children, title }: any) => <div data-testid={`resizable-panel-${title}`}>{children}</div>
}));
jest.mock('../../src/components/EntityLegend', () => ({
  EntityLegend: ({ onToggle }: any) => (
    <div data-testid="entity-legend">
      <button onClick={() => onToggle('class1')} data-testid="toggle-class1">Toggle class1</button>
    </div>
  )
}));
jest.mock('../../src/components/EntityMetadata', () => ({ EntityMetadata: () => <div data-testid="entity-metadata" /> }));
jest.mock('../../src/components/EntityDatabase', () => ({ EntityDatabase: () => <div data-testid="entity-database" /> }));
jest.mock('../../src/components/PakOrderManager', () => ({
  PakOrderManager: ({ onClose }: any) => (
    <div data-testid="pak-order-manager">
      <button onClick={onClose} data-testid="close-pak-manager">Close Pak Manager</button>
    </div>
  )
}));
jest.mock('../../src/components/Console', () => ({
  Console: ({ isOpen, onClose }: any) => isOpen ? (
    <div data-testid="console-open">
      <button onClick={onClose} data-testid="close-console">Close Console</button>
    </div>
  ) : <div data-testid="console-closed" />
}));

describe('App Component Coverage', () => {
  const mockHandleTreeSelect = jest.fn();
  const mockSetViewMode = jest.fn();
  const mockStartGameMode = jest.fn();
  const mockStopGameMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePakExplorer as jest.Mock).mockReturnValue({
      pakService: {},
      fileTree: {},
      selectedPath: null,
      metadata: null,
      parsedFile: null,
      pakCount: 0,
      fileCount: 0,
      loading: false,
      error: null,
      viewMode: 'merged',
      gameMode: 'browser',
      isPaused: false,
      gameStateSnapshot: null,
      handleFileSelect: jest.fn(),
      handleTreeSelect: mockHandleTreeSelect,
      hasFile: jest.fn(),
      dismissError: jest.fn(),
      removePak: jest.fn(),
      setViewMode: mockSetViewMode,
      startGameMode: mockStartGameMode,
      stopGameMode: mockStopGameMode,
      togglePause: jest.fn(),
      pauseGame: jest.fn(),
      resumeGame: jest.fn(),
    });
  });

  test('toggles console on keydown', () => {
    render(<App />);
    expect(screen.getByTestId('console-closed')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '`' });
    expect(screen.getByTestId('console-open')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '~' });
    expect(screen.getByTestId('console-closed')).toBeInTheDocument();
  });

  test('does not toggle console if default prevented', () => {
    render(<App />);
    const event = new KeyboardEvent('keydown', { key: '`' });
    Object.defineProperty(event, 'defaultPrevented', { value: true });
    window.dispatchEvent(event);
    expect(screen.queryByTestId('console-open')).not.toBeInTheDocument();
  });

  test('registers and handles console commands', async () => {
    render(<App />);

    // Verify commands are registered
    expect(consoleService.registerCommand).toHaveBeenCalledWith('map', expect.any(Function));
    expect(consoleService.registerCommand).toHaveBeenCalledWith('quit', expect.any(Function));
    expect(consoleService.registerCommand).toHaveBeenCalledWith('save', expect.any(Function));
    expect(consoleService.registerCommand).toHaveBeenCalledWith('load', expect.any(Function));

    // Get the callbacks
    const calls = (consoleService.registerCommand as jest.Mock).mock.calls;
    const mapCallback = calls.find(call => call[0] === 'map')[1];
    const quitCallback = calls.find(call => call[0] === 'quit')[1];
    const saveCallback = calls.find(call => call[0] === 'save')[1];
    const loadCallback = calls.find(call => call[0] === 'load')[1];

    // Test map command
    mapCallback([]);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Usage: map'), LogLevel.WARNING);

    mapCallback(['testmap']);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Loading map: maps/testmap.bsp'), LogLevel.INFO);
    expect(mockHandleTreeSelect).toHaveBeenCalledWith('maps/testmap.bsp');
    expect(mockStartGameMode).toHaveBeenCalledWith('testmap');

    mapCallback(['testmap.bsp']);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Loading map: maps/testmap.bsp'), LogLevel.INFO);

    // Test quit command
    quitCallback();
    expect(consoleService.log).toHaveBeenCalledWith('Returning to browser...', LogLevel.INFO);
    expect(mockStopGameMode).toHaveBeenCalled();

    // Test save command
    await saveCallback(['1']); // Missing name
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Usage: save'), LogLevel.WARNING);

    await saveCallback(['1', 'mysave']);
    expect(saveService.saveGame).toHaveBeenCalledWith(1, 'mysave');
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Game saved'), LogLevel.SUCCESS);

    (saveService.saveGame as jest.Mock).mockRejectedValueOnce('Error');
    await saveCallback(['1', 'mysave']);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Save failed'), LogLevel.ERROR);

    // Test load command
    await loadCallback([]);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Usage: load'), LogLevel.WARNING);

    (saveService.loadGame as jest.Mock).mockResolvedValue({ name: 'mysave' });
    await loadCallback(['1']);
    expect(saveService.loadGame).toHaveBeenCalledWith(1);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Loading save: mysave'), LogLevel.INFO);

    (saveService.loadGame as jest.Mock).mockResolvedValue(null);
    await loadCallback(['1']);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('No save found'), LogLevel.WARNING);

    (saveService.loadGame as jest.Mock).mockRejectedValueOnce('Error');
    await loadCallback(['1']);
    expect(consoleService.log).toHaveBeenCalledWith(expect.stringContaining('Load failed'), LogLevel.ERROR);
  });

  test('handles entity visibility toggling', () => {
    render(<App />);

    // Trigger classnames loaded to enable legend interaction if needed (though we mock it)
    fireEvent.click(screen.getByTestId('trigger-classnames'));

    // Toggle class1
    fireEvent.click(screen.getByTestId('toggle-class1'));
    // We can't easily check internal state without inspecting props passed to children
    // But since we mock EntityLegend and pass onToggle, we are exercising the function
  });

  test('handles overlays', () => {
    render(<App />);

    // Open Entity DB
    fireEvent.click(screen.getByTestId('open-entity-db'));
    expect(screen.getByText('Entity Database')).toBeInTheDocument();

    // Close Entity DB
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Entity Database')).not.toBeInTheDocument();

    // Open Pak Manager
    fireEvent.click(screen.getByTestId('open-pak-manager'));
    expect(screen.getByTestId('pak-order-manager')).toBeInTheDocument();

    // Close Pak Manager
    fireEvent.click(screen.getByTestId('close-pak-manager'));
    expect(screen.queryByTestId('pak-order-manager')).not.toBeInTheDocument();
  });

  test('handles console close callback', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: '`' });
    fireEvent.click(screen.getByTestId('close-console'));
    expect(screen.getByTestId('console-closed')).toBeInTheDocument();
  });
});
