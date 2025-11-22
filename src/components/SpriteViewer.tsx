import React, { useEffect, useRef, useState } from 'react';
import { SpriteModel, parsePcx, pcxToRgba } from 'quake2ts/engine';

interface SpriteViewerProps {
  model: SpriteModel;
  loadFile: (path: string) => Promise<Uint8Array>;
}

export function SpriteViewer({ model, loadFile }: SpriteViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<(Uint8Array | null)[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setFrames([]);
    setError(null);
    setCurrentFrame(0);

    async function loadFrames() {
      const loadedFrames: (Uint8Array | null)[] = [];

      // Pre-fill with nulls
      for (let i = 0; i < model.numFrames; i++) {
          loadedFrames.push(null);
      }

      for (let i = 0; i < model.frames.length; i++) {
        const frame = model.frames[i];
        try {
            // Note: frame.name often contains path like "sprites/s_explode1.pcx"
            // We try to load it as is.
            const data = await loadFile(frame.name);
            const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

            // @ts-ignore: parsePcx type mismatch
            const pcx = parsePcx(buffer);
            // @ts-ignore: pcxToRgba type mismatch
            const rgba = pcxToRgba(pcx);

            loadedFrames[i] = rgba;
        } catch (e) {
            console.warn(`Failed to load sprite frame ${frame.name}`, e);
        }
        if (isCancelled) return;
      }

      if (!isCancelled) {
          setFrames(loadedFrames);
      }
    }

    loadFrames();
    return () => { isCancelled = true; };
  }, [model, loadFile]);

  useEffect(() => {
      if (!isPlaying || model.numFrames === 0) return;

      const interval = setInterval(() => {
          setCurrentFrame(f => (f + 1) % model.numFrames);
      }, 100); // 10fps default

      return () => clearInterval(interval);
  }, [isPlaying, model.numFrames]);

  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Clear canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frameData = frames[currentFrame];
      const frameInfo = model.frames[currentFrame];

      if (frameData && frameInfo) {
          if (canvas.width !== frameInfo.width || canvas.height !== frameInfo.height) {
              canvas.width = frameInfo.width;
              canvas.height = frameInfo.height;
          }

          const imageData = ctx.createImageData(frameInfo.width, frameInfo.height);
          imageData.data.set(frameData);
          ctx.putImageData(imageData, 0, 0);
      } else {
          // Draw placeholder or clear
          ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

  }, [currentFrame, frames, model]);

  const scale = 2; // Default zoom

  return (
    <div className="sprite-viewer">
        <div className="sprite-canvas-container">
            <canvas
                ref={canvasRef}
                style={{
                    imageRendering: 'pixelated',
                    width: canvasRef.current ? `${canvasRef.current.width * scale}px` : 'auto',
                    height: canvasRef.current ? `${canvasRef.current.height * scale}px` : 'auto',
                    border: '1px solid #444',
                    backgroundColor: '#222'
                }}
            />
        </div>
        <div className="controls" style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? 'Pause' : 'Play'}</button>
            <span>Frame: {currentFrame + 1} / {model.numFrames}</span>
        </div>
        <div className="frame-info" style={{ fontSize: '0.8em', color: '#aaa', marginTop: '5px' }}>
            {model.frames[currentFrame]?.name}
        </div>
    </div>
  );
}
