import React, { useEffect, useRef, useState } from 'react';
import { BspMap, Texture2D } from 'quake2ts/engine';
import { ViewerAdapter } from './UniversalViewer/adapters/types';
import './LightmapInspector.css';

interface LightmapInspectorProps {
    map: BspMap;
    adapter: ViewerAdapter | null;
}

type VisualizationMode = 'rgb' | 'grayscale' | 'heatmap';

export function LightmapInspector({ map, adapter }: LightmapInspectorProps) {
    const [selectedLightmapIndex, setSelectedLightmapIndex] = useState<number | null>(null);
    const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('rgb');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [lightmapCount, setLightmapCount] = useState(0);

    // Access lightmaps from adapter if possible
    const getLightmapsFromAdapter = (): Texture2D[] => {
        if (adapter && 'getLightmaps' in adapter) {
            return (adapter as any).getLightmaps();
        }
        return [];
    };

    const lightmaps = getLightmapsFromAdapter();
    const hasLightmaps = lightmaps.length > 0;

    useEffect(() => {
        setLightmapCount(lightmaps.length);
    }, [adapter, lightmaps.length]);

    useEffect(() => {
        if (selectedLightmapIndex !== null && canvasRef.current && hasLightmaps) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const texture = lightmaps[selectedLightmapIndex];

            if (!ctx || !texture) return;

            let width = 128;
            let height = 128;

            // Retrieve metadata if available
            if (adapter && adapter.getLightmapInfo) {
                const info = adapter.getLightmapInfo(selectedLightmapIndex);
                if (info.width > 0) width = info.width;
                if (info.height > 0) height = info.height;
            }

            const gl = (texture as any).gl as WebGL2RenderingContext;
            if (!gl) return;

            canvas.width = width;
            canvas.height = height;

            // Create a temporary framebuffer to read pixels
            const fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, (texture as any).texture, 0);

            const canRead = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            if (canRead) {
                const pixels = new Uint8Array(width * height * 4);
                gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

                const imageData = ctx.createImageData(width, height);

                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const a = pixels[i + 3];

                    if (visualizationMode === 'rgb') {
                        imageData.data[i] = r;
                        imageData.data[i + 1] = g;
                        imageData.data[i + 2] = b;
                        imageData.data[i + 3] = 255; // Force opaque for viewing
                    } else if (visualizationMode === 'grayscale') {
                        // Luminance
                        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                        imageData.data[i] = lum;
                        imageData.data[i + 1] = lum;
                        imageData.data[i + 2] = lum;
                        imageData.data[i + 3] = 255;
                    } else if (visualizationMode === 'heatmap') {
                         const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                         // Simple heatmap: blue -> green -> red
                         // Map 0-255 to color ramp
                         // 0-85: blue to cyan
                         // 85-170: cyan to yellow
                         // 170-255: yellow to red
                         // Simplified:
                         // Low = blue
                         // Mid = green
                         // High = red
                         if (lum < 128) {
                             imageData.data[i] = 0;
                             imageData.data[i + 1] = lum * 2;
                             imageData.data[i + 2] = 255 - lum * 2;
                         } else {
                             imageData.data[i] = (lum - 128) * 2;
                             imageData.data[i + 1] = 255 - (lum - 128) * 2;
                             imageData.data[i + 2] = 0;
                         }
                         imageData.data[i+3] = 255;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.deleteFramebuffer(fb);

        }
    }, [selectedLightmapIndex, hasLightmaps, lightmaps, visualizationMode]);

    if (!hasLightmaps) {
        return <div className="lightmap-inspector-empty">No lightmap data found (or adapter not ready).</div>;
    }

    return (
        <div className="lightmap-inspector">
            <div className="lightmap-grid">
                {lightmaps.map((_, i) => (
                    <div
                        key={i}
                        className={`lightmap-thumb ${selectedLightmapIndex === i ? 'selected' : ''}`}
                        onClick={() => setSelectedLightmapIndex(i)}
                    >
                        LM {i}
                    </div>
                ))}
            </div>
            <div className="lightmap-detail">
                {selectedLightmapIndex !== null ? (
                    <>
                        <h4>Lightmap Atlas {selectedLightmapIndex}</h4>

                        <div className="lightmap-controls">
                            <label>Mode: </label>
                            <select
                                value={visualizationMode}
                                onChange={(e) => setVisualizationMode(e.target.value as VisualizationMode)}
                            >
                                <option value="rgb">RGB</option>
                                <option value="grayscale">Grayscale</option>
                                <option value="heatmap">Heatmap</option>
                            </select>
                        </div>

                        <canvas ref={canvasRef} className="lightmap-canvas" />
                        <div className="lightmap-meta">
                            {(() => {
                                let width = 128;
                                let height = 128;
                                let surfaces = 0;
                                if (adapter && adapter.getLightmapInfo) {
                                    const info = adapter.getLightmapInfo(selectedLightmapIndex);
                                    width = info.width || 128;
                                    height = info.height || 128;
                                    surfaces = info.surfaceCount;
                                }
                                const sizeBytes = width * height * 4;
                                const sizeKB = (sizeBytes / 1024).toFixed(1);

                                return (
                                    <>
                                        <div>Dimensions: {width} x {height}</div>
                                        <div>Surfaces: {surfaces}</div>
                                        <div>Memory: {sizeKB} KB</div>
                                        <div>Format: RGBA</div>
                                    </>
                                );
                            })()}
                        </div>
                    </>
                ) : (
                    <div className="lightmap-placeholder">Select a lightmap atlas to inspect</div>
                )}
            </div>
        </div>
    );
}
