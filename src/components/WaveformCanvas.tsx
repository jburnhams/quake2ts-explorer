import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  audioBuffer: AudioBuffer;
  isPlaying?: boolean;
  currentTime?: number;
  color?: string;
  backgroundColor?: string;
  zoom?: number;
  scrollOffset?: number; // In seconds
}

export function WaveformCanvas({
  audioBuffer,
  isPlaying,
  currentTime = 0,
  color = '#00ff00',
  backgroundColor = '#111',
  zoom = 1,
  scrollOffset = 0
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (!audioBuffer) return;

    // Calculate view window
    const duration = audioBuffer.duration;
    const visibleDuration = duration / zoom;

    // Determine start and end samples
    const startSample = Math.floor(scrollOffset * audioBuffer.sampleRate);
    const endSample = Math.min(
        Math.floor((scrollOffset + visibleDuration) * audioBuffer.sampleRate),
        audioBuffer.length
    );

    const visibleSamples = endSample - startSample;
    if (visibleSamples <= 0) return;

    const data = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(visibleSamples / width));
    const amp = height / 2;

    ctx.fillStyle = color;
    ctx.beginPath();

    // Draw waveform based on visible slice
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;

      const sampleIdxStart = startSample + i * step;
      // Ensure we don't read past buffer
      if (sampleIdxStart >= data.length) break;

      const sampleIdxEnd = Math.min(sampleIdxStart + step, data.length);

      for (let j = sampleIdxStart; j < sampleIdxEnd; j++) {
        const val = data[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      // If flat line (silence or error), normalize
      if (min > max) {
          min = 0;
          max = 0;
      }

      // Draw vertical line for this pixel column
      const yMin = (1 + min) * amp;
      const yMax = (1 + max) * amp;

      ctx.fillRect(i, height - yMax, 1, Math.max(1, yMax - yMin));
    }

    // Draw playback cursor
    // If currentTime is within visible range
    if (currentTime >= scrollOffset && currentTime <= scrollOffset + visibleDuration) {
        const cursorTime = currentTime - scrollOffset;
        const x = (cursorTime / visibleDuration) * width;
        ctx.fillStyle = 'yellow';
        ctx.fillRect(x, 0, 1, height);
    }
  }, [audioBuffer, currentTime, color, backgroundColor, zoom, scrollOffset]);

  // Handle resizing observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
         if (canvas.width !== entry.contentRect.width || canvas.height !== entry.contentRect.height) {
             canvas.width = entry.contentRect.width;
             canvas.height = entry.contentRect.height;
         }
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="sound-canvas"
      data-testid="waveform-canvas"
    />
  );
}
