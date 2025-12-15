import React, { useEffect, useRef, useState } from 'react';
import './TextureAtlas.css';
import { AssetCrossRefService, AssetUsage } from '../services/assetCrossRefService';
import { pakService, ParsedMd2, ParsedMd3 } from '../services/pakService';

export interface TextureAtlasProps {
  rgba: Uint8Array;
  width: number;
  height: number;
  format: 'pcx' | 'wal' | 'tga' | 'unknown';
  name: string;
  palette?: Uint8Array; // For 8-bit textures
  mipmaps?: { width: number; height: number; rgba: Uint8Array }[];
}

interface UVLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function TextureAtlas({ rgba, width, height, format, name, palette, mipmaps }: TextureAtlasProps) {
  const [zoom, setZoom] = useState(1);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [assetUsages, setAssetUsages] = useState<AssetUsage[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [selectedUsage, setSelectedUsage] = useState<AssetUsage | null>(null);
  const [uvLines, setUvLines] = useState<UVLine[]>([]);
  const [showUVs, setShowUVs] = useState(false);
  const [uvColor, setUvColor] = useState('#00ff00');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uvCanvasRef = useRef<HTMLCanvasElement>(null);
  const serviceRef = useRef<AssetCrossRefService | null>(null);

  useEffect(() => {
    // Reset state when image changes
    setZoom(1);
    setSelectedColorIndex(null);
    setAssetUsages([]);
    setScanComplete(false);
    setIsScanning(false);
    setSelectedUsage(null);
    setUvLines([]);
    setShowUVs(false);
  }, [rgba, width, height, name]);

  // Draw main texture
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

  // Handle usage selection and UV extraction
  useEffect(() => {
    const loadUVs = async () => {
        if (!selectedUsage || !showUVs) {
            setUvLines([]);
            return;
        }

        try {
            const parsed = await pakService.parseFile(selectedUsage.path);
            const lines: UVLine[] = [];

            if (parsed.type === 'md2') {
                const model = (parsed as ParsedMd2).model;
                const { header, texCoords, triangles, glCommands } = model;
                // MD2 tex coords are usually integers, need normalization by skinWidth/skinHeight
                // But header.skinWidth/skinHeight are what we should use.
                // However, wait. texCoords in quake2ts are normalized?
                // Let's check `md2.d.ts`:
                // export interface Md2TexCoord { readonly s: number; readonly t: number; }
                // They are usually short integers (pixels).
                // But let's check glCommands.
                // glCommands have s, t (float 0..1).
                // Let's use triangles and texCoords first.

                // Actually quake2ts parser might normalize them?
                // `texCoords` in MD2 file are shorts.
                // In quake2ts `parseMd2` implementation (I can't see source but I can infer):
                // Usually it reads them as shorts.
                // But `glCommands` are floats.

                // If we use triangles:
                // triangles have `texCoordIndices`.
                // texCoords array has {s, t}.

                // Let's assume they are pixel coordinates and normalize by skinWidth/Height from header.
                const skinW = header.skinWidth;
                const skinH = header.skinHeight;

                for (const tri of triangles) {
                    const t0 = texCoords[tri.texCoordIndices[0]];
                    const t1 = texCoords[tri.texCoordIndices[1]];
                    const t2 = texCoords[tri.texCoordIndices[2]];

                    // Convert to 0..1
                    const u0 = t0.s / skinW; const v0 = t0.t / skinH;
                    const u1 = t1.s / skinW; const v1 = t1.t / skinH;
                    const u2 = t2.s / skinW; const v2 = t2.t / skinH;

                    lines.push({ x1: u0, y1: v0, x2: u1, y2: v1 });
                    lines.push({ x1: u1, y1: v1, x2: u2, y2: v2 });
                    lines.push({ x1: u2, y1: v2, x2: u0, y2: v0 });
                }

            } else if (parsed.type === 'md3') {
                const model = (parsed as ParsedMd3).model;
                // MD3 has surfaces. Each surface has triangles and texCoords.
                // We need to find which surface uses THIS texture?
                // The `AssetUsage` might give us a hint? Or we just show all UVs for the model?
                // A model might have multiple skins.
                // Ideally we filter by surface that uses this texture.
                // `details` field in usage might help: "Ref: skin.pcx" or shader name.

                // For now, let's aggregate all surfaces.
                for (const surf of model.surfaces) {
                    // Check if this surface uses the texture?
                    // surf.shaders has names.
                    const usesTexture = surf.shaders.some(s => s.name.toLowerCase().includes(name.toLowerCase().replace(/\.\w+$/, '')));

                    if (usesTexture || model.surfaces.length === 1) {
                         for (const tri of surf.triangles) {
                             const t0 = surf.texCoords[tri.indices[0]];
                             const t1 = surf.texCoords[tri.indices[1]];
                             const t2 = surf.texCoords[tri.indices[2]];

                             lines.push({ x1: t0.s, y1: t0.t, x2: t1.s, y2: t1.t });
                             lines.push({ x1: t1.s, y1: t1.t, x2: t2.s, y2: t2.t });
                             lines.push({ x1: t2.s, y1: t2.t, x2: t0.s, y2: t0.t });
                         }
                    }
                }
            }

            setUvLines(lines);

        } catch (e) {
            console.warn("Failed to load model for UVs", e);
            setUvLines([]);
        }
    };

    loadUVs();
  }, [selectedUsage, showUVs, name]);

  // Draw UV overlay
  useEffect(() => {
    const canvas = uvCanvasRef.current;
    if (!canvas) return;

    // Canvas size matches texture size 1:1, scaled by CSS
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (showUVs && uvLines.length > 0) {
        ctx.strokeStyle = uvColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const line of uvLines) {
            ctx.moveTo(line.x1 * width, line.y1 * height);
            ctx.lineTo(line.x2 * width, line.y2 * height);
        }
        ctx.stroke();
    }

  }, [uvLines, showUVs, uvColor, width, height]);


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
    setSelectedUsage(null);

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

  const handleUsageClick = (usage: AssetUsage) => {
      if (usage.type === 'model') {
          setSelectedUsage(usage);
          setShowUVs(true);
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
            <canvas
              ref={uvCanvasRef}
              className="texture-atlas-uv-canvas"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                opacity: showUVs ? 1 : 0
              }}
              data-testid="uv-canvas"
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
                        <div
                          key={i}
                          className={`usage-item ${selectedUsage === usage ? 'selected' : ''}`}
                          onClick={() => handleUsageClick(usage)}
                          style={{ cursor: usage.type === 'model' ? 'pointer' : 'default' }}
                        >
                            <span className={`usage-tag ${usage.type}`}>{usage.type.toUpperCase()}</span>
                            <span className="usage-path" title={usage.path}>{usage.path}</span>
                            {usage.details && <div className="usage-details">{usage.details}</div>}
                        </div>
                    ))}
                </div>
                {selectedUsage && (
                    <div className="uv-controls">
                        <label>
                            <input
                                type="checkbox"
                                checked={showUVs}
                                onChange={(e) => setShowUVs(e.target.checked)}
                            />
                            Show UVs
                        </label>
                        <input
                            type="color"
                            value={uvColor}
                            onChange={(e) => setUvColor(e.target.value)}
                            title="UV Line Color"
                        />
                    </div>
                )}
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
