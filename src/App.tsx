import React from 'react';
import { Toolbar } from './components/Toolbar';
import { FileTree } from './components/FileTree';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { DropZone } from './components/DropZone';
import { usePakExplorer } from './hooks/usePakExplorer';
import './App.css';

function App() {
  const {
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
    dismissError,
  } = usePakExplorer();

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
          <FileTree
            root={fileTree}
            selectedPath={selectedPath}
            onSelect={handleTreeSelect}
          />
          <PreviewPanel parsedFile={parsedFile} filePath={selectedPath} />
          <MetadataPanel metadata={metadata} parsedFile={parsedFile} />
        </div>
      </div>
    </DropZone>
  );
}

export default App;
