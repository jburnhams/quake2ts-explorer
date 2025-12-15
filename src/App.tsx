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
import { usePakExplorer } from './hooks/usePakExplorer';
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
    viewMode,
    handleFileSelect,
    handleTreeSelect,
    hasFile,
    dismissError,
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

  // Reset when file changes
  useEffect(() => {
    setEntityClassnames([]);
    setHiddenClassnames(new Set());
    setSelectedEntity(null);
  }, [selectedPath]);

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

  return (
    <DropZone onDrop={handleFileSelect}>
      <div className="app" data-testid="app">
        <Toolbar
          onFileSelect={handleFileSelect}
          pakCount={pakCount}
          fileCount={fileCount}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onOpenEntityDatabase={() => setShowEntityDb(true)}
          onOpenPakManager={() => setShowPakManager(true)}
        />
        {showPakManager && (
          <PakOrderManager
            pakService={pakService}
            onClose={() => setShowPakManager(false)}
          />
        )}
        {error && (
          <div className="error-banner" data-testid="error-banner">
            {error}
            <button onClick={dismissError}>Dismiss</button>
          </div>
        )}
        {loading && (
          <div className="loading-banner" data-testid="loading-banner">
            Loading...
          </div>
        )}
        <div className="main-content">
          {showEntityDb ? (
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
