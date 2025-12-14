import React, { useEffect, useRef, useState } from 'react';
import { DemoPlaybackController } from 'quake2ts/engine';

interface FrameInfoProps {
  controller: DemoPlaybackController;
}

export function FrameInfo({ controller }: FrameInfoProps) {
  const [frame, setFrame] = useState(0);
  const [time, setTime] = useState(0);
  const [tickRate, setTickRate] = useState<number | undefined>(undefined);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!controller) return;

    // Get static info
    const header = controller.getDemoHeader ? controller.getDemoHeader() : null;
    if (header) {
        setTickRate(header.tickRate);
    }

    const update = () => {
      setFrame(controller.getCurrentFrame());
      setTime(controller.getCurrentTime());
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [controller]);

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      color: '#0f0',
      padding: '8px',
      fontFamily: 'monospace',
      fontSize: '12px',
      borderRadius: '4px',
      pointerEvents: 'none',
      zIndex: 200,
      border: '1px solid #0f0'
    }}>
      <div>Frame: {frame}</div>
      <div>Time: {(time * 1000).toFixed(0)} ms</div>
      {tickRate && <div>Tick Rate: {tickRate} Hz</div>}
    </div>
  );
}
