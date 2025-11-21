import React, { useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { FileTree } from './components/FileTree';
import { PreviewPanel } from './components/PreviewPanel';
import { MetadataPanel } from './components/MetadataPanel';
import { DropZone } from './components/DropZone';
import {
  PakService,
  type TreeNode,
  type FileMetadata,
  type ParsedFile,
} from './services/pakService';
import './App.css';

function App() {
  const [pakService] = useState(() => new PakService());
  const [fileTree, setFileTree] = useState<TreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [pakCount, setPakCount] = useState(0);
  const [fileCount, setFileCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTreeAndCounts = useCallback(() => {
    const tree = pakService.buildFileTree();
    setFileTree(tree);
    setPakCount(pakService.getMountedPaks().length);
    const listing = pakService.listDirectory();
    setFileCount(listing.files.length);
  }, [pakService]);

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      setLoading(true);
      setError(null);

      try {
        for (const file of Array.from(files)) {
          if (file.name.toLowerCase().endsWith('.pak')) {
            await pakService.loadPakFile(file);
          }
        }
        updateTreeAndCounts();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PAK file');
      } finally {
        setLoading(false);
      }
    },
    [pakService, updateTreeAndCounts]
  );

  const handleTreeSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path);
      const meta = pakService.getFileMetadata(path);
      setMetadata(meta ?? null);

      if (meta) {
        try {
          const parsed = await pakService.parseFile(path);
          setParsedFile(parsed);
        } catch (err) {
          console.error('Failed to parse file:', err);
          setParsedFile(null);
        }
      } else {
        setParsedFile(null);
      }
    },
    [pakService]
  );

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
            <button onClick={() => setError(null)}>Dismiss</button>
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
