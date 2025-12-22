import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PakService,
  type TreeNode,
  type FileMetadata,
  type ParsedFile,
  type ViewMode,
} from '../services/pakService';
import { indexedDBService } from '../services/indexedDBService';
import { createGameLoop, GameLoop } from '../utils/gameLoop';
import { createGameSimulation, GameSimulation, GameStateSnapshot } from '../services/gameService';
import { initInputController, cleanupInputController, generateUserCommand } from '../services/inputService';

export type GameMode = 'browser' | 'game';

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
  gameMode: GameMode;
  isPaused: boolean;
  gameStateSnapshot: (GameStateSnapshot & { configstrings: Map<number, string> }) | null;
  viewMode: ViewMode;
  handleFileSelect: (files: FileList) => Promise<void>;
  handleTreeSelect: (path: string) => Promise<void>;
  hasFile: (path: string) => boolean;
  dismissError: () => void;
  loadFromUrl: (url: string) => Promise<void>;
  startGameMode: (mapName: string) => Promise<void>;
  stopGameMode: () => void;
  togglePause: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  removePak: (pakId: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
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
  const [viewMode, setViewMode] = useState<ViewMode>('merged');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Game state
  const [gameMode, setGameMode] = useState<GameMode>('browser');
  const [isPaused, setIsPaused] = useState(false);
  const [gameStateSnapshot, setGameStateSnapshot] = useState<any | null>(null);

  const gameSimulationRef = useRef<GameSimulation | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);

  const updateTreeAndCounts = useCallback(() => {
    const tree = pakService.buildFileTree(viewMode);
    setFileTree(tree);
    setPakCount(pakService.getMountedPaks().length);
    const listing = pakService.listDirectory();
    setFileCount(listing.files.length);
  }, [pakService, viewMode]);

  // Handle View Mode change
  useEffect(() => {
    updateTreeAndCounts();
  }, [viewMode, updateTreeAndCounts]);

  const handleFileSelect = useCallback(
    async (files: FileList) => {
      setLoading(true);
      setError(null);

      try {
        for (const file of Array.from(files)) {
          if (file.name.toLowerCase().endsWith('.pak')) {
            // Save to IndexedDB
            const id = await indexedDBService.savePak(file);
            // Load into memory
            await pakService.loadPakFile(file, id, true);
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

  const removePak = useCallback(async (pakId: string) => {
    try {
        await indexedDBService.deletePak(pakId);
        pakService.unloadPak(pakId);
        updateTreeAndCounts();
    } catch (err) {
        console.error("Failed to remove pak:", err);
        setError(err instanceof Error ? err.message : 'Failed to remove PAK');
    }
  }, [pakService, updateTreeAndCounts]);

  // Helper to load standard PAKs
  const loadBuiltInPaks = useCallback(async (signal: AbortSignal) => {
    let paksToLoad: string[] = [];

    // Try to fetch manifest
    try {
        const manifestRes = await fetch('pak-manifest.json', { signal });
        if (manifestRes.ok) {
           // Ensure it's not HTML (e.g. 404 fallback)
           const type = manifestRes.headers.get('content-type');
           if (!type || !type.toLowerCase().includes('text/html')) {
              const manifest = await manifestRes.json();
              if (manifest.paks && Array.isArray(manifest.paks)) {
                  paksToLoad = manifest.paks;
              }
           }
        }
    } catch (e) {
        console.warn("Failed to load pak-manifest.json, skipping built-in paks.");
    }

    for (const url of paksToLoad) {
        try {
            const res = await fetch(url, { signal });
            if (res.ok) {
                const type = res.headers.get('content-type');
                if (type && type.toLowerCase().includes('text/html')) {
                    console.warn(`Skipping ${url} because content-type is text/html`);
                    continue;
                }
                const buffer = await res.arrayBuffer();
                const name = url.split('/').pop() || url; // Simple filename extraction
                await pakService.loadPakFromBuffer(name, buffer, undefined, false);
            }
        } catch (e) {
            console.warn(`Failed to load built-in ${url}`, e);
        }
    }
  }, [pakService]);

  // Initial Load
  useEffect(() => {
      const controller = new AbortController();

      const init = async () => {
          setLoading(true);
          try {
              // 1. Load Built-ins
              await loadBuiltInPaks(controller.signal);

              // 2. Load User PAKs from IDB
              const storedPaks = await indexedDBService.getPaks();
              for (const pak of storedPaks) {
                  // Reconstruct File object from Blob if necessary, or just use blob
                  // Since `loadPakFile` expects File, and storedPak has blob (which is File or Blob),
                  // we can cast or create File.
                  let file: File;
                  if (pak.blob instanceof File) {
                      file = pak.blob;
                  } else {
                      file = new File([pak.blob], pak.name);
                  }
                  await pakService.loadPakFile(file, pak.id, true);
              }

              updateTreeAndCounts();
          } catch (err) {
               if (err instanceof Error && err.name === 'AbortError') return;
               console.error("Initialization error:", err);
               setError("Failed to initialize application data");
          } finally {
               if (!controller.signal.aborted) {
                   setLoading(false);
               }
          }
      };

      init();

      return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadBuiltInPaks, pakService]);

  // Wrapper for loadFromUrl to support legacy/testing calls or explicit loads
  const loadFromUrl = useCallback(
    async (url: string) => {
      // This implementation might conflict with the new multi-pak approach if used externally.
      // But typically it's used for initial load in App.tsx.
      // Since we moved initial load to the useEffect above, we might deprecate this or
      // adapt it to just add a file.

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      // We DO NOT clear existing PAKs anymore in the new model, unless explicitly requested?
      // The requirement "Replace the Open Pak File button with an Add Pak Files" implies additive behavior.
      // But `loadFromUrl` was "replace all".
      // Let's keep it additive or simply rely on the new init logic.

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const name = url.split('/').pop() || 'default.pak';

        if (controller.signal.aborted) return;

        await pakService.loadPakFromBuffer(name, buffer, undefined, false); // Treat as non-user/built-in? Or maybe user?
        // If loaded via URL manually, maybe treat as session-only non-user?

        updateTreeAndCounts();
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load PAK from URL');
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
          abortControllerRef.current = null;
        }
      }
    },
    [pakService, updateTreeAndCounts]
  );

  const handleTreeSelect = useCallback(
    async (path: string) => {
      // If path contains prefix (PAK ID), we need to handle it.
      // PakService usually handles VFS paths.
      // `FileTree` now returns prefixed paths in 'by-pak' mode.
      const vfsPath = PakService.getVfsPath(path);

      setSelectedPath(path); // Keep tree selection state as is (prefixed)

      const meta = pakService.getFileMetadata(vfsPath);
      setMetadata(meta ?? null);

      if (meta) {
        try {
          const parsed = await pakService.parseFile(vfsPath);
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

  const hasFile = useCallback(
    (path: string) => pakService.hasFile(PakService.getVfsPath(path)),
    [pakService]
  );

  const stopGameMode = useCallback(() => {
    // Invalidate any pending start requests
    activeGameRequestRef.current++;

    cleanupInputController();

    if (gameLoopRef.current) {
      gameLoopRef.current.stop();
      gameLoopRef.current = null;
    }
    if (gameSimulationRef.current) {
      gameSimulationRef.current.shutdown();
      gameSimulationRef.current = null;
    }
    setGameMode('browser');
    setIsPaused(false);
  }, []);

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
      isPausedRef.current = isPaused;
  }, [isPaused]);

  const activeGameRequestRef = useRef<number>(0);

  const startGameMode = useCallback(async (mapName: string) => {
    // Stop existing game if any
    stopGameMode();

    // Increment request ID to invalidate previous pending requests
    const requestId = ++activeGameRequestRef.current;

    try {
      setLoading(true);

      const simulation = await createGameSimulation(pakService.vfs, mapName);

      // Check if this request is still the active one
      if (requestId !== activeGameRequestRef.current) {
         simulation.shutdown();
         return;
      }

      gameSimulationRef.current = simulation;
      simulation.start();

      // Initialize input controller
      initInputController();

      const loop = createGameLoop(
        (step) => {
            if (gameSimulationRef.current && !isPausedRef.current) {
                const cmd = generateUserCommand(step.deltaMs);
                gameSimulationRef.current.tick(step, cmd);
            }
        },
        (alpha) => {
             if (gameSimulationRef.current) {
                 const snapshot = gameSimulationRef.current.getSnapshot();
                 if (snapshot) {
                     setGameStateSnapshot({
                         ...snapshot,
                         configstrings: gameSimulationRef.current.getConfigStrings()
                     });
                 }
             }
        }
      );

      gameLoopRef.current = loop;
      loop.start();

      setGameMode('game');
    } catch (err) {
      // Only handle error if this request is still active
      if (requestId === activeGameRequestRef.current) {
          console.error("Failed to start game mode:", err);
          setError(err instanceof Error ? err.message : 'Failed to start game mode');
          stopGameMode();
      }
    } finally {
      if (requestId === activeGameRequestRef.current) {
        setLoading(false);
      }
    }
  }, [pakService, stopGameMode]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const pauseGame = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGameMode();
    };
  }, [stopGameMode]);

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
    setViewMode
  };
}
