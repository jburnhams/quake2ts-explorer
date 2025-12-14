import React, { useEffect, useRef, useState } from 'react';
import './TextureAtlas.css';

export interface TextureAtlasProps {
  rgba: Uint8Array;
  width: number;
  height: number;
  format: 'pcx' | 'wal' | 'tga' | 'unknown';
  name: string;
  palette?: Uint8Array; // For 8-bit textures
  mipmaps?: number;
}

export function TextureAtlas({ rgba, width, height, format, name, palette, mipmaps }: TextureAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Reset zoom when image changes
    setZoom(1);
    setSelectedColorIndex(null);
  }, [rgba, width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);
  }, [rgba, width, height]);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 2, 16));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 2, 0.25));
  const handleZoomReset = () => setZoom(1);

  const displayWidth = width * zoom;
  const displayHeight = height * zoom;

  // Grid overlay for high zoom
  const showGrid = zoom >= 4;
  const gridStyle: React.CSSProperties = showGrid
    ? {
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)`,
        backgroundSize: `${zoom}px ${zoom}px`,
      }
    : {};

  const getPaletteColor = (index: number) => {
    if (!palette || index < 0 || index >= 256) return null;
    const offset = index * 3;
    if (offset + 2 >= palette.length) return null;
    return {
      r: palette[offset],
      g: palette[offset + 1],
      b: palette[offset + 2],
    };
  };

  const selectedColor = selectedColorIndex !== null ? getPaletteColor(selectedColorIndex) : null;

  return (
    <div className="texture-atlas" data-testid="texture-atlas">
      <div className="texture-atlas-toolbar">
        <button onClick={handleZoomOut} disabled={zoom <= 0.25} aria-label="Zoom Out">-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} disabled={zoom >= 16} aria-label="Zoom In">+</button>
        <button onClick={handleZoomReset}>1:1</button>
        <div style={{ flex: 1 }} />
        <span>{width} x {height}</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="texture-atlas-viewport">
          <div
            className="texture-atlas-canvas-container"
            style={{ width: displayWidth, height: displayHeight }}
          >
            <canvas
              ref={canvasRef}
              className="texture-atlas-canvas"
              style={{
                width: '100%',
                height: '100%',
              }}
              data-testid="atlas-canvas"
            />
            {showGrid && <div className="texture-atlas-grid" style={gridStyle} data-testid="pixel-grid" />}
          </div>
        </div>

        {palette && (
          <div className="texture-atlas-sidebar">
            <div className="texture-atlas-palette">
              <h3>Palette</h3>
              <div className="palette-grid" data-testid="palette-grid">
                {Array.from({ length: 256 }).map((_, i) => {
                  const color = getPaletteColor(i);
                  if (!color) return null;
                  const isTransparent = i === 255; // Quake 2 transparency index
                  return (
                    <div
                      key={i}
                      className={`palette-swatch ${selectedColorIndex === i ? 'selected' : ''} ${isTransparent ? 'transparent' : ''}`}
                      style={{ backgroundColor: isTransparent ? 'transparent' : `rgb(${color.r},${color.g},${color.b})` }}
                      onClick={() => setSelectedColorIndex(i)}
                      title={`Index ${i}: ${color.r}, ${color.g}, ${color.b}`}
                      data-testid={`swatch-${i}`}
                    />
                  );
                })}
              </div>
              {selectedColorIndex !== null && selectedColor && (
                <div className="palette-info" data-testid="palette-info">
                  <div
                    className="color-preview"
                    style={{ backgroundColor: `rgb(${selectedColor.r},${selectedColor.g},${selectedColor.b})` }}
                  />
                  <div>Index: {selectedColorIndex}</div>
                  <div>R: {selectedColor.r}</div>
                  <div>G: {selectedColor.g}</div>
                  <div>B: {selectedColor.b}</div>
                  <div>Hex: #{selectedColor.r.toString(16).padStart(2, '0')}{selectedColor.g.toString(16).padStart(2, '0')}{selectedColor.b.toString(16).padStart(2, '0')}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="texture-atlas-info">
        <div className="texture-atlas-metadata-column">
          <div className="texture-atlas-metadata-item">
            <span className="texture-atlas-metadata-label">Name:</span>
            <span>{name}</span>
          </div>
          <div className="texture-atlas-metadata-item">
            <span className="texture-atlas-metadata-label">Format:</span>
            <span>{format.toUpperCase()}</span>
          </div>
        </div>
        <div className="texture-atlas-metadata-column">
          <div className="texture-atlas-metadata-item">
            <span className="texture-atlas-metadata-label">Depth:</span>
            <span>{palette ? '8-bit Indexed' : '24/32-bit RGB(A)'}</span>
          </div>
          <div className="texture-atlas-metadata-item">
            <span className="texture-atlas-metadata-label">Size:</span>
            <span>{Math.round(rgba.length / 1024)} KB (Uncompressed)</span>
          </div>
          {mipmaps !== undefined && (
            <div className="texture-atlas-metadata-item">
              <span className="texture-atlas-metadata-label">Mip levels:</span>
              <span>{mipmaps}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
