import React from 'react';
import type { FileMetadata, ParsedFile } from '../services/pakService';

export interface MetadataPanelProps {
  metadata: FileMetadata | null;
  parsedFile: ParsedFile | null;
  hasFile?: (path: string) => boolean;
  onNavigateToFile?: (path: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface RenderOptions {
  hasFile?: (path: string) => boolean;
  onNavigateToFile?: (path: string) => void;
}

function renderFileTypeDetails(parsed: ParsedFile, options: RenderOptions = {}): React.ReactNode {
  const { hasFile, onNavigateToFile } = options;

  switch (parsed.type) {
    case 'pcx':
      return (
        <div className="metadata-section" data-testid="pcx-details">
          <h4>PCX Image</h4>
          <dl>
            <dt>Width</dt>
            <dd>{parsed.width}px</dd>
            <dt>Height</dt>
            <dd>{parsed.height}px</dd>
            <dt>Bits per pixel</dt>
            <dd>{parsed.image.bitsPerPixel}</dd>
          </dl>
        </div>
      );
    case 'wal':
      return (
        <div className="metadata-section" data-testid="wal-details">
          <h4>WAL Texture</h4>
          <dl>
            <dt>Width</dt>
            <dd>{parsed.width}px</dd>
            <dt>Height</dt>
            <dd>{parsed.height}px</dd>
            <dt>Name</dt>
            <dd>{parsed.texture.name}</dd>
            <dt>Mip levels</dt>
            <dd>{parsed.texture.mipmaps.length}</dd>
          </dl>
        </div>
      );
    case 'md2':
      return (
        <div className="metadata-section" data-testid="md2-details">
          <h4>MD2 Model</h4>
          <dl>
            <dt>Vertices</dt>
            <dd>{parsed.model.header.numVertices}</dd>
            <dt>Triangles</dt>
            <dd>{parsed.model.header.numTriangles}</dd>
            <dt>Skin Size</dt>
            <dd>{parsed.model.header.skinWidth} x {parsed.model.header.skinHeight}</dd>
          </dl>

          <h4>Skins ({parsed.model.skins.length})</h4>
          {parsed.model.skins.length > 0 ? (
            <ul className="md2-skin-list">
              {parsed.model.skins.map((skin, i) => {
                const exists = hasFile?.(skin.name) ?? false;
                const canNavigate = exists && onNavigateToFile;
                return (
                  <li key={i} className="md2-skin-item">
                    {canNavigate ? (
                      <button
                        className="md2-skin-link"
                        onClick={() => onNavigateToFile(skin.name)}
                        title={`Navigate to ${skin.name}`}
                      >
                        {skin.name}
                      </button>
                    ) : (
                      <span className={exists ? 'md2-skin-path' : 'md2-skin-path md2-skin-missing'}>
                        {skin.name}
                        {!exists && ' (missing)'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="md2-no-skins">No skins defined</p>
          )}

          <h4>Animations ({parsed.animations.length})</h4>
          {parsed.animations.length > 0 ? (
            <ul className="md2-animation-list">
              {parsed.animations.map((anim, i) => (
                <li key={i} className="md2-animation-item">
                  <span className="md2-animation-name">{anim.name}</span>
                  <span className="md2-animation-frames">
                    frames {anim.firstFrame}-{anim.lastFrame} ({anim.lastFrame - anim.firstFrame + 1})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No animations detected</p>
          )}

          <h4>All Frames ({parsed.model.frames.length})</h4>
          <ul className="md2-frame-list">
            {parsed.model.frames.map((frame, i) => (
              <li key={i} className="md2-frame-item">
                <span className="md2-frame-index">{i}</span>
                <span className="md2-frame-name">{frame.name}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'md3':
      return (
        <div className="metadata-section" data-testid="md3-details">
          <h4>MD3 Model</h4>
          <dl>
            <dt>Frames</dt>
            <dd>{parsed.model.header.numFrames}</dd>
            <dt>Surfaces</dt>
            <dd>{parsed.model.header.numSurfaces}</dd>
            <dt>Tags</dt>
            <dd>{parsed.model.header.numTags}</dd>
          </dl>
        </div>
      );
    case 'wav':
      return (
        <div className="metadata-section" data-testid="wav-details">
          <h4>WAV Audio</h4>
          <dl>
            <dt>Channels</dt>
            <dd>{parsed.audio.channels}</dd>
            <dt>Sample Rate</dt>
            <dd>{parsed.audio.sampleRate} Hz</dd>
            <dt>Bits per Sample</dt>
            <dd>{parsed.audio.bitsPerSample}</dd>
            <dt>Duration</dt>
            <dd>{(parsed.audio.samples.length / parsed.audio.channels / parsed.audio.sampleRate).toFixed(2)}s</dd>
          </dl>
        </div>
      );
    case 'txt':
      return (
        <div className="metadata-section" data-testid="txt-details">
          <h4>Text File</h4>
          <dl>
            <dt>Characters</dt>
            <dd>{parsed.content.length}</dd>
            <dt>Lines</dt>
            <dd>{parsed.content.split('\n').length}</dd>
          </dl>
        </div>
      );
    case 'unknown':
      return (
        <div className="metadata-section" data-testid="unknown-details">
          <h4>Binary File</h4>
          <dl>
            <dt>Size</dt>
            <dd>{formatBytes(parsed.data.length)}</dd>
          </dl>
        </div>
      );
    default:
      return null;
  }
}

export function MetadataPanel({ metadata, parsedFile, hasFile, onNavigateToFile }: MetadataPanelProps) {
  if (!metadata) {
    return (
      <aside className="metadata-panel metadata-panel-empty" data-testid="metadata-panel">
        <p>Select a file to view details</p>
      </aside>
    );
  }

  return (
    <aside className="metadata-panel" data-testid="metadata-panel">
      <div className="metadata-section">
        <h3>File Info</h3>
        <dl>
          <dt>Name</dt>
          <dd>{metadata.name}</dd>
          <dt>Path</dt>
          <dd>{metadata.path}</dd>
          <dt>Size</dt>
          <dd>{formatBytes(metadata.size)}</dd>
          <dt>Type</dt>
          <dd>{metadata.extension.toUpperCase() || 'Unknown'}</dd>
          <dt>Source PAK</dt>
          <dd>{metadata.sourcePak}</dd>
        </dl>
      </div>
      {parsedFile && renderFileTypeDetails(parsedFile, { hasFile, onNavigateToFile })}
    </aside>
  );
}
