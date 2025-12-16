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
import { consoleService, LogLevel } from './services/consoleService';
import { saveService } from './services/saveService';
import { usePakExplorer } from './hooks/usePakExplorer';
import { GameMenu } from './components/GameMenu';
import { LoadingScreen } from './components/LoadingScreen';
import { UniversalViewer } from './components/UniversalViewer/UniversalViewer';
import { getFileName } from './utils/helpers';
import './App.css';

function App() {
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
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

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

    return () => {
      consoleService.unregisterCommand('map');
      consoleService.unregisterCommand('quit');
      consoleService.unregisterCommand('save');
      consoleService.unregisterCommand('load');
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
    // We probably need to implement a "load demo" function in usePakExplorer or similar
    // For now we just close the browser and log
    console.log("Play demo:", demo.name);
    setShowDemoBrowser(false);
    // TODO: Implement actual demo playback trigger
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
        <Console isOpen={isConsoleOpen} onClose={() => setIsConsoleOpen(false)} />
        {error && (
          <div className="error-banner" data-testid="error-banner">
            {error}
            <button onClick={dismissError}>Dismiss</button>
          </div>
        )}
        {loading && gameMode === 'browser' && (
          <div className="loading-banner" data-testid="loading-banner">
            Loading...
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
                          playerState={gameStateSnapshot?.playerState}
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
