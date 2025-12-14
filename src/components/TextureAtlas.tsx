import React, { useEffect, useRef, useState } from 'react';
import './TextureAtlas.css';
import { AssetCrossRefService, AssetUsage } from '../services/assetCrossRefService';
import { pakService } from '../services/pakService';

export interface TextureAtlasProps {
  rgba: Uint8Array;
  width: number;
  height: number;
  format: 'pcx' | 'wal' | 'tga' | 'unknown';
  name: string;
  palette?: Uint8Array; // For 8-bit textures
  mipmaps?: { width: number; height: number; rgba: Uint8Array }[];
}

export function TextureAtlas({ rgba, width, height, format, name, palette, mipmaps }: TextureAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [assetUsages, setAssetUsages] = useState<AssetUsage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const serviceRef = useRef<AssetCrossRefService | null>(null);

  useEffect(() => {
    // Reset state when image changes
    setZoom(1);
    setSelectedColorIndex(null);
    setAssetUsages([]);
    setScanComplete(false);
    setIsScanning(false);
  }, [rgba, width, height, name]);

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

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPng = () => {
    if (!canvasRef.current) return;
    // We want to export the original image, not the potentially zoomed one
    // But the canvas currently holds the image data at 1:1 scale (width/height attributes)
    // and CSS scales it. So canvas.toBlob should work fine.
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${name}.png`);
      }
    }, 'image/png');
  };

  const handleExportPalette = () => {
    if (!palette) return;

    // Create GIMP Palette (GPL) format
    let content = 'GIMP Palette\nName: Quake 2 Palette\nColumns: 16\n#\n';

    for (let i = 0; i < 256; i++) {
      const r = palette[i * 3];
      const g = palette[i * 3 + 1];
      const b = palette[i * 3 + 2];
      content += `${r.toString().padStart(3)} ${g.toString().padStart(3)} ${b.toString().padStart(3)}\tIndex ${i}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    downloadBlob(blob, `${name.split('.')[0]}.gpl`);
  };

  const handleExportMipmaps = async () => {
    if (!mipmaps || mipmaps.length === 0) return;

    for (let i = 0; i < mipmaps.length; i++) {
      const level = mipmaps[i];
      const canvas = document.createElement('canvas');
      canvas.width = level.width;
      canvas.height = level.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      const imageData = ctx.createImageData(level.width, level.height);
      imageData.data.set(level.rgba);
      ctx.putImageData(imageData, 0, 0);

      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, `${name}_mip${i}.png`);
          }
          resolve();
        }, 'image/png');
      });
    }
  };

  const handleScanUsage = async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanComplete(false);

    if (!serviceRef.current) {
        serviceRef.current = new AssetCrossRefService(pakService.getVfs());
    }

    try {
        const usages = await serviceRef.current.findTextureUsage(name);
        setAssetUsages(usages);
    } catch (e) {
        console.error("Scan failed", e);
    } finally {
        setIsScanning(false);
        setScanComplete(true);
    }
  };

  return (
    <div className="texture-atlas" data-testid="texture-atlas">
      <div className="texture-atlas-toolbar">
        <button onClick={handleZoomOut} disabled={zoom <= 0.25} aria-label="Zoom Out">-</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} disabled={zoom >= 16} aria-label="Zoom In">+</button>
        <button onClick={handleZoomReset}>1:1</button>

        <div className="texture-atlas-separator" style={{ width: 1, height: 20, background: '#555', margin: '0 8px' }} />

        <button onClick={handleExportPng} title="Export as PNG">Export PNG</button>
        {palette && (
          <button onClick={handleExportPalette} title="Export Palette (GPL)">Export Palette</button>
        )}
        {mipmaps && mipmaps.length > 0 && (
          <button onClick={handleExportMipmaps} title="Export All Mipmaps">Export Mipmaps</button>
        )}

        <div className="texture-atlas-separator" style={{ width: 1, height: 20, background: '#555', margin: '0 8px' }} />

        <button onClick={handleScanUsage} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Find Usage'}
        </button>

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

        <div className="texture-atlas-sidebar-container">
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

            {(assetUsages.length > 0 || scanComplete) && (
              <div className="texture-atlas-usage">
                <h3>Usage References ({assetUsages.length})</h3>
                <div className="usage-list" data-testid="usage-list">
                    {assetUsages.length === 0 && scanComplete && <div className="usage-empty">No references found.</div>}
                    {assetUsages.map((usage, i) => (
                        <div key={i} className="usage-item">
                            <span className={`usage-tag ${usage.type}`}>{usage.type.toUpperCase()}</span>
                            <span className="usage-path" title={usage.path}>{usage.path}</span>
                            {usage.details && <div className="usage-details">{usage.details}</div>}
                        </div>
                    ))}
                </div>
              </div>
            )}
        </div>
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
          {mipmaps && mipmaps.length > 0 && (
            <div className="texture-atlas-metadata-item">
              <span className="texture-atlas-metadata-label">Mip levels:</span>
              <span>{mipmaps.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
