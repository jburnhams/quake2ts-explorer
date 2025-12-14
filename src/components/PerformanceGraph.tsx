import React, { useEffect, useRef } from 'react';

interface PerformanceGraphProps {
    history: { fps: number; frameTime: number }[];
    width?: number;
    height?: number;
}

export const PerformanceGraph: React.FC<PerformanceGraphProps> = ({ history, width = 280, height = 100 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, width, height);

        if (history.length === 0) return;

        const maxPoints = width; // 1 pixel per point
        const startIndex = Math.max(0, history.length - maxPoints);
        const visibleHistory = history.slice(startIndex);

        // Draw FPS Line (Green)
        ctx.beginPath();
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 1.5;

        visibleHistory.forEach((point, i) => {
            const x = i;
            // Scale FPS: 0 at bottom, 120 at top (clamped)
            const y = height - (Math.min(point.fps, 120) / 120) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Frame Time Line (Blue)
        ctx.beginPath();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.5;

        visibleHistory.forEach((point, i) => {
            const x = i;
            // Scale Frame Time: 0 at bottom, 33ms (30fps) at top
            const y = height - (Math.min(point.frameTime, 33) / 33) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Grid Lines (30 FPS / 60 FPS marks)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // 60 FPS line
        const y60 = height - (60 / 120) * height;
        ctx.beginPath();
        ctx.moveTo(0, y60);
        ctx.lineTo(width, y60);
        ctx.stroke();

        // 30 FPS line
        const y30 = height - (30 / 120) * height;
        ctx.beginPath();
        ctx.moveTo(0, y30);
        ctx.lineTo(width, y30);
        ctx.stroke();

    }, [history, width, height]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: `${width}px`, height: `${height}px`, display: 'block', marginTop: '8px' }}
        />
    );
};
