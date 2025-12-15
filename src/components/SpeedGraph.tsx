import React, { useEffect, useRef } from 'react';

interface SpeedGraphProps {
    history: number[];
    width?: number;
    height?: number;
    color?: string;
}

export const SpeedGraph: React.FC<SpeedGraphProps> = ({
    history,
    width = 230,
    height = 60,
    color = '#facc15' // Yellow-ish
}) => {
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

        // Calculate max speed for scaling (at least 400)
        const maxSpeed = Math.max(400, ...visibleHistory);

        // Draw Speed Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        visibleHistory.forEach((speed, i) => {
            const x = i; // simple 1px per point mapping
            // Scale Speed: 0 at bottom, maxSpeed at top
            // Invert Y because canvas 0 is top
            const y = height - (Math.min(speed, maxSpeed) / maxSpeed) * height;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Reference Line (320 ups - standard run speed)
        const y320 = height - (320 / maxSpeed) * height;
        if (y320 >= 0 && y320 <= height) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.moveTo(0, y320);
            ctx.lineTo(visibleHistory.length, y320); // only draw as far as data
            ctx.stroke();
            ctx.setLineDash([]);
        }

    }, [history, width, height, color]);

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{ width: `${width}px`, height: `${height}px`, display: 'block', marginTop: '5px', marginBottom: '5px' }}
        />
    );
};
