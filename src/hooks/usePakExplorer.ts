import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PakService,
  type TreeNode,
  type FileMetadata,
  type ParsedFile,
} from '../services/pakService';
import { createGameLoop, GameLoop } from '../utils/gameLoop';
import { createGameSimulation, GameSimulationWrapper } from '../services/gameService';

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
  // We use a ref for snapshot to avoid re-render on every frame if we used state directly
  // without care, but we actually need to trigger re-render for UI.
  // However, for high-frequency updates (60fps), usually we use refs and direct canvas updates
  // or a requestAnimationFrame loop in the component.
  // Since UniversalViewer is a React component, we'll expose the snapshot via state
  // but maybe throttle it or just let it rip? React 18 is good at batching.
  // But wait, the task implies UniversalViewer handles rendering.
  // We should pass the snapshot to it.
  const [gameStateSnapshot, setGameStateSnapshot] = useState<any | null>(null);

  const gameSimulationRef = useRef<GameSimulationWrapper | null>(null);
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

      const simulation = await createGameSimulation(pakService.vfs, mapName);

      // Check if this request is still the active one
      if (requestId !== activeGameRequestRef.current) {
         simulation.shutdown();
         return;
      }

      gameSimulationRef.current = simulation;
      simulation.start();

      const loop = createGameLoop(
        (deltaMs) => {
            if (gameSimulationRef.current && !isPausedRef.current) {
                // TODO: Generate UserCommand from input service
                const cmd = {
                    sequence: 0,
                    msec: deltaMs,
                    buttons: 0,
                    angles: { x: 0, y: 0, z: 0 },
                    forwardmove: 0,
                    sidemove: 0,
                    upmove: 0,
                    impulse: 0,
                    lightlevel: 0
                };
                gameSimulationRef.current.tick(deltaMs, cmd);
            }
        },
        (alpha) => {
             // Render handled by UniversalViewer via shared state or context?
             if (gameSimulationRef.current) {
                 const snapshot = gameSimulationRef.current.getSnapshot();
                 if (snapshot) {
                     // We update state to trigger re-render of consumers
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
