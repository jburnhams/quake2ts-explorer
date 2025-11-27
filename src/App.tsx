import React, { useState, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { FileTree } from './components/FileTree';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { DropZone } from './components/DropZone';
import { ResizablePanel } from './components/ResizablePanel';
import { EntityLegend } from './components/EntityLegend';
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
    handleFileSelect,
    handleTreeSelect,
    hasFile,
    dismissError,
    loadFromUrl,
  } = usePakExplorer();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [entityClassnames, setEntityClassnames] = useState<string[]>([]);
  const [hiddenClassnames, setHiddenClassnames] = useState<Set<string>>(new Set());

  // Reset when file changes
  useEffect(() => {
    setEntityClassnames([]);
    setHiddenClassnames(new Set());
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

  useEffect(() => {
    loadFromUrl('pak.pak');
  }, [loadFromUrl]);

  return (
    <DropZone onDrop={handleFileSelect}>
      <div className="app" data-testid="app">
        <Toolbar
          onFileSelect={handleFileSelect}
          pakCount={pakCount}
          fileCount={fileCount}
        />
        {error && (
          <div className="error-banner" data-testid="error-banner">
            {error}
            <button onClick={dismissError}>Dismiss</button>
          </div>
        )}
        {loading && (
          <div className="loading-banner" data-testid="loading-banner">
            Loading PAK file...
          </div>
        )}
        <div className="main-content">
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
            />
          </ResizablePanel>
          <PreviewPanel
            parsedFile={parsedFile}
            filePath={selectedPath}
            pakService={pakService}
            onClassnamesLoaded={handleClassnamesLoaded}
            hiddenClassnames={hiddenClassnames}
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
            <EntityLegend
              classnames={entityClassnames}
              hiddenClassnames={hiddenClassnames}
              onToggle={handleToggleEntity}
            />
          </ResizablePanel>
        </div>
      </div>
    </DropZone>
  );
}

export default App;
