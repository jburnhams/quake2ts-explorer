import React from 'react';
import type { FileMetadata, ParsedFile } from '../services/pakService';

export interface MetadataPanelProps {
  metadata: FileMetadata | null;
  parsedFile: ParsedFile | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderFileTypeDetails(parsed: ParsedFile): React.ReactNode {
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
            <dt>Frames</dt>
            <dd>{parsed.model.header.numFrames}</dd>
            <dt>Vertices</dt>
            <dd>{parsed.model.header.numVertices}</dd>
            <dt>Triangles</dt>
            <dd>{parsed.model.header.numTriangles}</dd>
            <dt>Skins</dt>
            <dd>{parsed.model.header.numSkins}</dd>
            <dt>GL Commands</dt>
            <dd>{parsed.model.header.numGlCommands}</dd>
          </dl>
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

export function MetadataPanel({ metadata, parsedFile }: MetadataPanelProps) {
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
      {parsedFile && renderFileTypeDetails(parsedFile)}
    </aside>
  );
}
