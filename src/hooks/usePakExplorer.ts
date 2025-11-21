import { useState, useCallback } from 'react';
import {
  PakService,
  type TreeNode,
  type FileMetadata,
  type ParsedFile,
} from '../services/pakService';

export interface UsePakExplorerResult {
  pakService: PakService;
  fileTree: TreeNode | null;
  selectedPath: string | null;
  metadata: FileMetadata | null;
  parsedFile: ParsedFile | null;
  pakCount: number;
  fileCount: number;
  loading: boolean;
  error: string | null;
  handleFileSelect: (files: FileList) => Promise<void>;
  handleTreeSelect: (path: string) => Promise<void>;
  dismissError: () => void;
}

export function usePakExplorer(): UsePakExplorerResult {
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

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
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
    dismissError,
  };
}
