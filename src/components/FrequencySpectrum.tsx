import React, { useRef, useEffect } from 'react';

interface FrequencySpectrumProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
  backgroundColor?: string;
}

export function FrequencySpectrum({
  analyser,
  isPlaying,
  color = '#00ffff',
  backgroundColor = '#111'
}: FrequencySpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
        if (!analyser) {
            // Draw empty state
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 255 * canvas.height;

            ctx.fillStyle = color;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }

        if (isPlaying) {
            rafRef.current = requestAnimationFrame(draw);
        }
    };

    if (isPlaying) {
        draw();
    } else {
        // Draw one last frame or clear
         if (rafRef.current) cancelAnimationFrame(rafRef.current);
         // Optionally draw current state if paused, or clear
         // Let's clear or draw static
         const width = canvas.width;
         const height = canvas.height;
         ctx.fillStyle = backgroundColor;
         ctx.fillRect(0, 0, width, height);
    }

    return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analyser, isPlaying, color, backgroundColor]);

    // Resize observer logic similar to WaveformCanvas
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
      data-testid="frequency-spectrum"
    />
  );
}
