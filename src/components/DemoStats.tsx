import React, { useEffect, useState, useRef } from 'react';
import { DemoPlaybackController, PlayerStatistics, DemoStatistics } from 'quake2ts/engine';
import { SpeedGraph } from './SpeedGraph';

interface DemoStatsProps {
  controller: DemoPlaybackController;
  visible: boolean;
  onClose: () => void;
}

interface StatsConfig {
    showPlayerState: boolean;
    showMatchStats: boolean;
    showDemoInfo: boolean;
    showGraph: boolean;
    x: number;
    y: number;
    scale: number;
}

const DEFAULT_CONFIG: StatsConfig = {
    showPlayerState: true,
    showMatchStats: true,
    showDemoInfo: true,
    showGraph: false,
    x: window.innerWidth - 270, // Default to top-right ish
    y: 10,
    scale: 1.0
};

const STORAGE_KEY = 'quake2ts-stats-config';

export function DemoStats({ controller, visible, onClose }: DemoStatsProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStatistics | null>(null);
  const [demoStats, setDemoStats] = useState<DemoStatistics | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [position, setPosition] = useState<[number, number, number]>([0,0,0]);
  const [angles, setAngles] = useState<[number, number, number]>([0,0,0]);
  const [fps, setFps] = useState(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [config, setConfig] = useState<StatsConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Load config on mount
  useEffect(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              // Merge with default to handle missing new keys
              setConfig(prev => ({ ...prev, ...parsed }));
          } catch (e) {
              console.error('Failed to parse stats config', e);
          }
      }
  }, []);

  // Save config on change
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Handle Dragging
  useEffect(() => {
      if (isDragging) {
          const onMouseMove = (e: MouseEvent) => {
              setConfig(prev => ({
                  ...prev,
                  x: e.clientX - dragOffset.current.x,
                  y: e.clientY - dragOffset.current.y
              }));
          };
          const onMouseUp = () => {
              setIsDragging(false);
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
          return () => {
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
          };
      }
  }, [isDragging]);

  const startDrag = (e: React.MouseEvent) => {
      // Don't drag if clicking buttons inside header
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;

      setIsDragging(true);
      dragOffset.current = {
          x: e.clientX - config.x,
          y: e.clientY - config.y
      };
  };

  useEffect(() => {
    if (!visible || !controller) return;

    // Static stats
    setDemoStats(controller.getDemoStatistics());
    setPlayerStats(controller.getPlayerStatistics(0)); // Assume player 0 for now

    const update = () => {
      // Dynamic stats
      const frameData = controller.getFrameData(controller.getCurrentFrame());
      if (frameData && frameData.playerState) {
          const origin = frameData.playerState.origin;
          const velocity = frameData.playerState.velocity;
          const viewangles = frameData.playerState.viewangles;

          setPosition([origin.x, origin.y, origin.z]);
          setAngles([viewangles.x, viewangles.y, viewangles.z]);

          // Calculate horizontal speed
          const speed2D = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
          const speedVal = Math.round(speed2D);
          setCurrentSpeed(speedVal);

          // Update speed history
          setSpeedHistory(prev => {
              const next = [...prev, speedVal];
              if (next.length > 230) next.shift(); // Keep last 230 frames (matches default graph width)
              return next;
          });
      }

      // FPS Calculation
      const now = performance.now();
      frameCountRef.current++;
      if (now - lastTimeRef.current >= 1000) {
          setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)));
          frameCountRef.current = 0;
          lastTimeRef.current = now;
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [visible, controller]);

  if (!visible) return null;

  return (
    <div className="demo-stats-overlay" style={{
        position: 'absolute',
        top: `${config.y}px`,
        left: `${config.x}px`,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        width: `${250 * config.scale}px`,
        transformOrigin: 'top left',
        transform: `scale(${config.scale})`, // Alternative: use width and font-size scaling
        // Using zoom/scale might affect layout, let's use width scaling for container and font-size?
        // Simple transform scale is easiest but might blur.
        // Let's stick to transform scale but we need to counteract it for positioning logic if we were doing fancy constraints.
        // For simplicity, transform is fine.
        zIndex: 200,
        pointerEvents: 'none', // Base is none
        userSelect: 'none'
    }}>
      {/* Header Row - Draggable */}
      <div
        onMouseDown={startDrag}
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid #555',
            cursor: isDragging ? 'grabbing' : 'grab',
            pointerEvents: 'auto' // Interactive
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.2em' }}>Demo Stats</h3>
        <button
            onClick={() => setShowConfig(!showConfig)}
            title="Configure Stats"
            style={{
                background: 'none',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 5px',
            }}
        >
            ⚙️
        </button>
      </div>

      {showConfig && (
          <div style={{ marginBottom: '10px', padding: '5px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '3px', pointerEvents: 'auto' }}>
              <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={config.showPlayerState}
                    onChange={e => setConfig({...config, showPlayerState: e.target.checked})}
                  /> Show Player State
              </label>
              <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={config.showMatchStats}
                    onChange={e => setConfig({...config, showMatchStats: e.target.checked})}
                  /> Show Match Stats
              </label>
              <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={config.showDemoInfo}
                    onChange={e => setConfig({...config, showDemoInfo: e.target.checked})}
                  /> Show Demo Info
              </label>
              <label style={{ display: 'block' }}>
                  <input
                    type="checkbox"
                    checked={config.showGraph}
                    onChange={e => setConfig({...config, showGraph: e.target.checked})}
                  /> Show Speed Graph
              </label>

              <div style={{ marginTop: '5px', borderTop: '1px solid #444', paddingTop: '5px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Size: {(config.scale * 100).toFixed(0)}%
                    <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={config.scale}
                        onChange={e => setConfig({...config, scale: parseFloat(e.target.value)})}
                        style={{ width: '100px' }}
                    />
                </label>
              </div>
          </div>
      )}

      <div style={{ marginBottom: '10px' }}>
        <div>Time: {controller.getCurrentTime().toFixed(2)}s</div>
        <div>Frame: {controller.getCurrentFrame()} / {controller.getFrameCount()}</div>
        <div>FPS: {fps}</div>
      </div>

      {config.showPlayerState && (
        <div style={{ marginBottom: '10px' }}>
            <strong>Player State</strong>
            <div>Speed: {currentSpeed} ups</div>
            <div>Pos: {position.map(v => v.toFixed(0)).join(', ')}</div>
            <div>Ang: {angles.map(v => v.toFixed(1)).join(', ')}</div>
        </div>
      )}

      {config.showMatchStats && playerStats && (
          <div style={{ marginBottom: '10px' }}>
              <strong>Match Stats</strong>
              <div>Kills: {playerStats.kills}</div>
              <div>Deaths: {playerStats.deaths}</div>
              <div>Damage Dealt: {playerStats.damageDealt}</div>
          </div>
      )}

      {config.showDemoInfo && demoStats && (
          <div>
              <strong>Demo Info</strong>
              <div>Duration: {demoStats.duration.toFixed(1)}s</div>
              <div>Avg FPS: {demoStats.averageFps.toFixed(2)}</div>
          </div>
      )}

      {config.showGraph && (
          <SpeedGraph history={speedHistory} width={230} height={60} />
      )}
    </div>
  );
}
