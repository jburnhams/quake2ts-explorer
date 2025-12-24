import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { FileTree } from './components/FileTree';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { DropZone } from './components/DropZone';
import { ResizablePanel } from './components/ResizablePanel';
import { EntityLegend } from './components/EntityLegend';
import { EntityMetadata } from './components/EntityMetadata';
import { EntityDatabase } from './components/EntityDatabase';
import { PakOrderManager } from './components/PakOrderManager';
import { Console } from './components/Console';
import { DemoBrowser } from './components/DemoBrowser';
import { ServerBrowser } from './components/ServerBrowser';
import { consoleService, LogLevel } from './services/consoleService';
import { saveService } from './services/saveService';
import { networkService } from './services/networkService';
import { usePakExplorer } from './hooks/usePakExplorer';
import { GameMenu } from './components/GameMenu';
import { LoadingScreen } from './components/LoadingScreen';
import { UniversalViewer } from './components/UniversalViewer/UniversalViewer';
import { SettingsPanel } from './components/SettingsPanel';
import { StorageUploadModal } from './components/StorageUploadModal';
import { settingsService } from './services/settingsService';
import { themeService } from './services/themeService';
import { authService, User } from './services/authService';
import { remoteStorageService } from './services/remoteStorageService';
import { getFileName } from './utils/helpers';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Storage Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [currentUploadFile, setCurrentUploadFile] = useState('');
  const [canCloseUploadModal, setCanCloseUploadModal] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for skipAuth param
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('skipAuth') === 'true') {
        setIsAuthChecking(false);
        return;
      }

      const user = await authService.checkSession();
      if (user) {
        setUser(user);
      }
      // Always clear loading state. If redirecting, the page will unload anyway.
      // If error (and no redirect), we want to show the app content (possibly without user).
      setIsAuthChecking(false);
    };

    checkAuth();
  }, []);

  const {
    pakService,
    fileTree,
    selectedPath,
    metadata,
    parsedFile,
    pakCount,
    fileCount,
    loading,
    error,
    gameMode,
    isPaused,
    gameStateSnapshot,
    viewMode,
    handleFileSelect,
    handleTreeSelect,
    hasFile,
    dismissError,
    loadFromUrl,
    startGameMode,
    stopGameMode,
    togglePause,
    pauseGame,
    resumeGame,
    removePak,
    setViewMode,
  } = usePakExplorer();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [entityClassnames, setEntityClassnames] = useState<string[]>([]);
  const [hiddenClassnames, setHiddenClassnames] = useState<Set<string>>(new Set());
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [showEntityDb, setShowEntityDb] = useState(false);
  const [showPakManager, setShowPakManager] = useState(false);
  const [showDemoBrowser, setShowDemoBrowser] = useState(false);
  const [showServerBrowser, setShowServerBrowser] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Initialize with settings
  useEffect(() => {
    const settings = settingsService.getSettings();

    // Auto-load pak.pak logic could go here or in usePakExplorer
    // But usePakExplorer already handles it via arguments or internal logic
    // We might need to pass settings to usePakExplorer if it's dynamic

    if (settings.general.confirmBeforeClose) {
      window.onbeforeunload = (e) => {
        if (pakCount > 0) {
          e.preventDefault();
          e.returnValue = '';
        }
      };
    }

    return () => {
      window.onbeforeunload = null;
    };
  }, [pakCount]);

  // Subscribe to settings changes
  useEffect(() => {
    const applySettings = (settings: any) => {
      // Accessibility Settings application
      if (settings.accessibility.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }

      if (settings.accessibility.largeFont) {
        document.body.classList.add('large-font');
      } else {
        document.body.classList.remove('large-font');
      }

      if (settings.accessibility.reduceMotion) {
        document.body.classList.add('reduce-motion');
      } else {
        document.body.classList.remove('reduce-motion');
      }

      document.body.classList.remove('color-blind-deuteranopia', 'color-blind-protanopia', 'color-blind-tritanopia');
      if (settings.accessibility.colorBlindMode !== 'none') {
          document.body.classList.add(`color-blind-${settings.accessibility.colorBlindMode}`);
      }

      // General Settings
      if (settings.general.confirmBeforeClose) {
         window.onbeforeunload = (e) => {
          if (pakCount > 0) {
            e.preventDefault();
            e.returnValue = '';
          }
        };
      } else {
        window.onbeforeunload = null;
      }
    };

    // Initial apply
    applySettings(settingsService.getSettings());

    const unsubscribe = settingsService.subscribe(applySettings);
    return unsubscribe;
  }, [pakCount]);

  // Toggle console with backtick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsConsoleOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Register App-level console commands
  useEffect(() => {
    consoleService.registerCommand('map', (args) => {
      if (args.length === 0) {
        consoleService.log('Usage: map <mapname>', LogLevel.WARNING);
        return;
      }
      const mapName = args[0];
      const fullPath = mapName.endsWith('.bsp') ? `maps/${mapName}` : `maps/${mapName}.bsp`;
      consoleService.log(`Loading map: ${fullPath}`, LogLevel.INFO);

      // Trigger navigation/load
      handleTreeSelect(fullPath);
      startGameMode(mapName);
    });

    consoleService.registerCommand('quit', () => {
       consoleService.log('Returning to browser...', LogLevel.INFO);
       stopGameMode();
    });

    consoleService.registerCommand('save', async (args) => {
       if (args.length < 2) {
           consoleService.log('Usage: save <slot> <name>', LogLevel.WARNING);
           return;
       }
       const slot = parseInt(args[0], 10);
       const name = args.slice(1).join(' ');
       try {
           await saveService.saveGame(slot, name);
           consoleService.log(`Game saved to slot ${slot}`, LogLevel.SUCCESS);
       } catch (err) {
           consoleService.log(`Save failed: ${err}`, LogLevel.ERROR);
       }
    });

    consoleService.registerCommand('load', async (args) => {
       if (args.length === 0) {
           consoleService.log('Usage: load <slot>', LogLevel.WARNING);
           return;
       }
       const slot = parseInt(args[0], 10);
       try {
           const save = await saveService.loadGame(slot);
           if (save) {
             consoleService.log(`Loading save: ${save.name}`, LogLevel.INFO);
             // Logic to actually restore state would invoke gameService.loadState
             // and potentially switch map
           } else {
             consoleService.log(`No save found in slot ${slot}`, LogLevel.WARNING);
           }
       } catch (err) {
           consoleService.log(`Load failed: ${err}`, LogLevel.ERROR);
       }
    });

    consoleService.registerCommand('connect', async (args) => {
        if (args.length === 0) {
            consoleService.log('Usage: connect <server>', LogLevel.WARNING);
            return;
        }
        const address = args[0];
        handleServerConnect(address);
    });

    return () => {
      consoleService.unregisterCommand('map');
      consoleService.unregisterCommand('quit');
      consoleService.unregisterCommand('save');
      consoleService.unregisterCommand('load');
      consoleService.unregisterCommand('connect');
    };
  }, [handleTreeSelect, setViewMode]);

  // Reset when file changes
  useEffect(() => {
    setEntityClassnames([]);
    setHiddenClassnames(new Set());
    setSelectedEntity(null);
  }, [selectedPath]);

  // Handle ESC for game menu
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (gameMode === 'game' && e.key === 'Escape') {
              togglePause();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, togglePause]);

  const handleClassnamesLoaded = (classnames: string[]) => {
    setEntityClassnames(classnames);
  };

  const handleToggleEntity = (classname: string) => {
    const newHidden = new Set(hiddenClassnames);
    if (newHidden.has(classname)) {
      newHidden.delete(classname);
    } else {
      newHidden.add(classname);
    }
    setHiddenClassnames(newHidden);
  };

  const handlePlayDemo = (demo: any) => {
    // Logic to play demo
    console.log("Play demo:", demo.name);
    setShowDemoBrowser(false);
  };

  const handlePlayMap = () => {
    if (selectedPath && selectedPath.endsWith('.bsp')) {
       // Extract map name from path
       // Path is usually maps/name.bsp or just name.bsp
       const filename = getFileName(selectedPath);
       const mapName = filename.replace('.bsp', '');
       startGameMode(mapName);
    }
  };

  const handleServerConnect = async (address: string) => {
      setShowServerBrowser(false);
      consoleService.log(`Connecting to ${address}...`, LogLevel.INFO);

      try {
          await networkService.connect(address);
          consoleService.log(`Connected to ${address}`, LogLevel.SUCCESS);
          // TODO: Switch to multiplayer game mode (Task 6)
      } catch (err) {
          consoleService.log(`Failed to connect: ${err}`, LogLevel.ERROR);
      }
  };

  const handleStoreFiles = async () => {
    if (!user) return;

    setIsUploadModalOpen(true);
    setUploadProgress(0);
    setUploadStatus('Initializing upload...');
    setCanCloseUploadModal(false);

    try {
      const paks = pakService.getMountedPaks();
      const collections = await remoteStorageService.listCollections();

      let totalFiles = 0;
      let processedFiles = 0;

      // Count total files first for progress
      for (const pak of paks) {
        totalFiles += pak.archive.listEntries().length;
      }

      for (const pak of paks) {
        setUploadStatus(`Processing PAK: ${pak.name}`);

        // Find or create collection
        let collection = collections.find(c => c.name === pak.name);
        if (!collection) {
          setUploadStatus(`Creating collection: ${pak.name}`);
          try {
            collection = await remoteStorageService.createCollection({
              name: pak.name,
              description: `Imported from ${pak.name}`
            });
          } catch (e) {
            console.error(`Failed to create collection ${pak.name}`, e);
            continue; // Skip this PAK
          }
        }

        const entries = pak.archive.listEntries();
        for (const entry of entries) {
           const entryName = typeof entry === 'string' ? entry : entry.name;
           setCurrentUploadFile(entryName);

           try {
             // Read file content
             const data = await pakService.readFile(entryName);
             const blob = new Blob([data]);

             await remoteStorageService.createEntry({
               key: entryName,
               file: blob,
               collection_id: collection.id
             });
           } catch (e) {
             console.warn(`Failed to upload ${entryName}`, e);
             // Continue to next file
           }

           processedFiles++;
           setUploadProgress((processedFiles / totalFiles) * 100);
        }
      }

      setUploadStatus('Upload complete!');
      setUploadProgress(100);
    } catch (e) {
      console.error('Upload process failed', e);
      setUploadStatus(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setCanCloseUploadModal(true);
      setCurrentUploadFile('');
    }
  };

  return (
    <DropZone onDrop={handleFileSelect}>
      <div className="app" data-testid="app">
        {gameMode === 'browser' && (
          <Toolbar
            onFileSelect={handleFileSelect}
            pakCount={pakCount}
            fileCount={fileCount}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenEntityDatabase={() => setShowEntityDb(true)}
            onOpenPakManager={() => setShowPakManager(true)}
            onOpenDemoBrowser={() => setShowDemoBrowser(true)}
            onOpenServerBrowser={() => setShowServerBrowser(true)}
            onOpenSettings={() => setShowSettings(true)}
            onStoreFiles={handleStoreFiles}
            user={user}
          />
        )}
        {showPakManager && (
          <PakOrderManager
            pakService={pakService}
            onClose={() => setShowPakManager(false)}
          />
        )}
        {showDemoBrowser && (
          <DemoBrowser
            onPlayDemo={handlePlayDemo}
            onClose={() => setShowDemoBrowser(false)}
          />
        )}
        {showServerBrowser && (
          <ServerBrowser
            onConnect={handleServerConnect}
            onClose={() => setShowServerBrowser(false)}
          />
        )}
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
          />
        )}
        <StorageUploadModal
          isOpen={isUploadModalOpen}
          progress={uploadProgress}
          status={uploadStatus}
          currentFile={currentUploadFile}
          onClose={() => setIsUploadModalOpen(false)}
          canClose={canCloseUploadModal}
        />
        <Console isOpen={isConsoleOpen} onClose={() => setIsConsoleOpen(false)} />
        {error && (
          <div className="error-banner" data-testid="error-banner">
            {error}
            <button onClick={dismissError}>Dismiss</button>
          </div>
        )}
        {(loading || isAuthChecking) && gameMode === 'browser' && (
          <div className="loading-banner" data-testid="loading-banner">
            {isAuthChecking ? 'Checking authentication...' : 'Loading...'}
          </div>
        )}
        {loading && gameMode === 'game' && (
          <LoadingScreen message="Loading Game..." />
        )}
        <div className="main-content">
          {gameMode === 'game' ? (
              <div className="game-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
                  {parsedFile && parsedFile.type === 'bsp' && (
                      <UniversalViewer
                          parsedFile={parsedFile}
                          pakService={pakService}
                          filePath={selectedPath || ''}
                          gameState={gameStateSnapshot || undefined}
                          configstrings={gameStateSnapshot?.configstrings}
                          isGameMode={true}
                          showControls={false}
                      />
                  )}
                  {isPaused && (
                      <GameMenu
                          onResume={resumeGame}
                          onSave={() => consoleService.executeCommand('save 0 quick')}
                          onLoad={() => consoleService.executeCommand('load 0')}
                          onQuit={stopGameMode}
                      />
                  )}
              </div>
          ) : showEntityDb ? (
            <div className="entity-db-overlay">
              <div className="entity-db-overlay-header">
                <h2>Entity Database</h2>
                <button onClick={() => setShowEntityDb(false)}>Close</button>
              </div>
              <div className="entity-db-overlay-content">
                <EntityDatabase pakService={pakService} />
              </div>
            </div>
          ) : (
            <>
              <ResizablePanel
                defaultWidth={280}
                minWidth={180}
            maxWidth={500}
            position="left"
            collapsed={leftCollapsed}
            onCollapsedChange={setLeftCollapsed}
            title="Files"
            testId="file-tree-panel"
          >
            <FileTree
              root={fileTree}
              selectedPath={selectedPath}
              onSelect={handleTreeSelect}
              onRemovePak={removePak}
            />
          </ResizablePanel>
          <PreviewPanel
            parsedFile={parsedFile}
            filePath={selectedPath}
            pakService={pakService}
            onClassnamesLoaded={handleClassnamesLoaded}
            hiddenClassnames={hiddenClassnames}
            onEntitySelected={setSelectedEntity}
            onPlay={handlePlayMap}
          />
          <ResizablePanel
            defaultWidth={280}
            minWidth={180}
            maxWidth={500}
            position="right"
            collapsed={rightCollapsed}
            onCollapsedChange={setRightCollapsed}
            title="Details"
            testId="metadata-panel-wrapper"
          >
            <MetadataPanel
              metadata={metadata}
              parsedFile={parsedFile}
              hasFile={hasFile}
              onNavigateToFile={handleTreeSelect}
            />
            <EntityMetadata entity={selectedEntity} />
            <EntityLegend
              classnames={entityClassnames}
              hiddenClassnames={hiddenClassnames}
              onToggle={handleToggleEntity}
            />
          </ResizablePanel>
            </>
          )}
        </div>
      </div>
    </DropZone>
  );
}

export default App;
