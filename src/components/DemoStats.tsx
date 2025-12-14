import React, { useEffect, useState, useRef } from 'react';
import { DemoPlaybackController, PlayerStatistics, DemoStatistics } from 'quake2ts/engine';
import { vec3 } from 'gl-matrix';

interface DemoStatsProps {
  controller: DemoPlaybackController;
  visible: boolean;
  onClose: () => void;
}

export function DemoStats({ controller, visible, onClose }: DemoStatsProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStatistics | null>(null);
  const [demoStats, setDemoStats] = useState<DemoStatistics | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [position, setPosition] = useState<[number, number, number]>([0,0,0]);
  const [angles, setAngles] = useState<[number, number, number]>([0,0,0]);
  const [fps, setFps] = useState(0);

  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

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
          setCurrentSpeed(Math.round(speed2D));
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
        top: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        width: '250px',
        zIndex: 200,
        pointerEvents: 'none' // Click through
    }}>
      <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #555' }}>Demo Stats</h3>

      <div style={{ marginBottom: '10px' }}>
        <div>Time: {controller.getCurrentTime().toFixed(2)}s</div>
        <div>Frame: {controller.getCurrentFrame()} / {controller.getFrameCount()}</div>
        <div>FPS: {fps}</div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Player State</strong>
        <div>Speed: {currentSpeed} ups</div>
        <div>Pos: {position.map(v => v.toFixed(0)).join(', ')}</div>
        <div>Ang: {angles.map(v => v.toFixed(1)).join(', ')}</div>
      </div>

      {playerStats && (
          <div style={{ marginBottom: '10px' }}>
              <strong>Match Stats</strong>
              <div>Kills: {playerStats.kills}</div>
              <div>Deaths: {playerStats.deaths}</div>
              <div>Damage Dealt: {playerStats.damageDealt}</div>
          </div>
      )}

      {demoStats && (
          <div>
              <strong>Demo Info</strong>
              <div>Duration: {demoStats.duration.toFixed(1)}s</div>
              {/* averageFrameTime property does not exist in DemoStatistics, removed it */}
              <div>Avg FPS: {demoStats.averageFps.toFixed(2)}</div>
          </div>
      )}
    </div>
  );
}
