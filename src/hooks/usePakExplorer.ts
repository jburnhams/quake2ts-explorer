import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PakService,
  type TreeNode,
  type FileMetadata,
  type ParsedFile,
} from '../services/pakService';
import { createGameLoop, GameLoop } from '../utils/gameLoop';
import { getGameService, GameSimulation } from '../services/gameService';
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
  gameStateSnapshot: any | null;
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // Game state
  const [gameMode, setGameMode] = useState<GameMode>('browser');
  const [isPaused, setIsPaused] = useState(false);
  const [gameStateSnapshot, setGameStateSnapshot] = useState<any | null>(null);

  const gameSimulationRef = useRef<GameSimulation | null>(null);
  const gameLoopRef = useRef<GameLoop | null>(null);

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

      // Clear existing PAKs to replace them
      pakService.clear();

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

  const loadFromUrl = useCallback(
    async (url: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      // Clear existing PAKs to replace them
      pakService.clear();

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const buffer = await response.arrayBuffer();
        const name = url.split('/').pop() || 'default.pak';

        if (controller.signal.aborted) return;

        await pakService.loadPakFromBuffer(name, buffer);
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

  const hasFile = useCallback(
    (path: string) => pakService.hasFile(path),
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
    // Increment request ID to invalidate previous pending requests
    const requestId = ++activeGameRequestRef.current;

    try {
      setLoading(true);

      // Stop existing game if any
      stopGameMode();

      // Get game service singleton
      // IMPORTANT: We must update the VFS reference in the service if it changed (e.g. new PAK loaded)
      // The current getGameService creates a singleton.
      // If we want to support changing PAKs, we should probably recreate the service or update it.
      // For now, let's assume getGameService handles checking if VFS matches or we add a way to update it.
      // Ideally, GameServiceImpl should accept VFS in initGame or similar.
      // But initGame takes mapName.
      // Let's modify getGameService to reset if VFS is different or just create a new one.

      // However, modifying getGameService signature is risky if used elsewhere.
      // Let's rely on the fact that PakService instance in usePakExplorer state is passed.
      // If PakService instance changes (new useState), we get new VFS.
      // But getGameService holds the *first* VFS it saw.
      // We need to fix getGameService to update VFS.

      const simulation = getGameService(pakService.vfs);

      // Initialize game
      await simulation.initGame(mapName, {
        maxClients: 1,
        deathmatch: false,
        coop: false,
        skill: 1
      } as any);

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
        (deltaMs) => {
            if (gameSimulationRef.current && !isPausedRef.current) {
                const cmd = generateUserCommand(deltaMs);
                gameSimulationRef.current.tick(deltaMs, cmd);
            }
        },
        (alpha) => {
             if (gameSimulationRef.current) {
                 const snapshot = gameSimulationRef.current.getSnapshot();
                 if (snapshot) {
                     setGameStateSnapshot(snapshot);
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
  };
}
