import React, { useState } from 'react';
import type { ParsedFile, PakService } from '../services/pakService';
import { SpriteViewer } from './SpriteViewer';
import { UniversalViewer } from './UniversalViewer/UniversalViewer';
import { ModelInspector } from './ModelInspector';
import { TextureAtlas } from './TextureAtlas';
import { BspAnalyzer } from './BspAnalyzer';

export interface PreviewPanelProps {
  parsedFile: ParsedFile | null;
  filePath: string | null;
  pakService: PakService;
  onClassnamesLoaded?: (classnames: string[]) => void;
  hiddenClassnames?: Set<string>;
  onEntitySelected?: (entity: any) => void;
}

interface AudioPreviewProps {
  audio: {
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
    samples: Int16Array | Float32Array;
  };
}

function AudioPreview({ audio }: AudioPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode | null>(null);

  const handlePlay = () => {
    if (isPlaying && sourceNode) {
      sourceNode.stop();
      setSourceNode(null);
      setIsPlaying(false);
      return;
    }

    const ctx = audioContext || new AudioContext();
    if (!audioContext) setAudioContext(ctx);

    const buffer = ctx.createBuffer(
      audio.channels,
      audio.samples.length / audio.channels,
      audio.sampleRate
    );

    // Convert samples to float32 (-1 to 1 range)
    for (let channel = 0; channel < audio.channels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        const sampleIndex = i * audio.channels + channel;
        if (audio.samples instanceof Int16Array) {
          channelData[i] = audio.samples[sampleIndex] / 32768;
        } else {
          channelData[i] = audio.samples[sampleIndex];
        }
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      setIsPlaying(false);
      setSourceNode(null);
    };
    source.start();
    setSourceNode(source);
    setIsPlaying(true);
  };

  const duration = audio.samples.length / audio.channels / audio.sampleRate;

  return (
    <div className="preview-audio" data-testid="audio-preview">
      <div className="preview-audio-icon">{'\uD83D\uDD0A'}</div>
      <button
        className="preview-audio-button"
        onClick={handlePlay}
        data-testid="audio-play-button"
      >
        {isPlaying ? 'Stop' : 'Play'}
      </button>
      <div className="preview-audio-info">
        {audio.sampleRate} Hz, {audio.channels} channel{audio.channels > 1 ? 's' : ''}, {duration.toFixed(2)}s
      </div>
    </div>
  );
}

interface TextPreviewProps {
  content: string;
}

function TextPreview({ content }: TextPreviewProps) {
  return (
    <div className="preview-text" data-testid="text-preview">
      <pre>{content}</pre>
    </div>
  );
}

interface HexPreviewProps {
  data: Uint8Array;
  error?: string;
}

function HexPreview({ data, error }: HexPreviewProps) {
  const maxBytes = 512;
  const displayData = data.slice(0, maxBytes);
  const lines: string[] = [];

  for (let i = 0; i < displayData.length; i += 16) {
    const hex = Array.from(displayData.slice(i, i + 16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const ascii = Array.from(displayData.slice(i, i + 16))
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(48)}  ${ascii}`);
  }

  return (
    <div className="preview-hex" data-testid="hex-preview">
      {error && (
        <div className="preview-error" data-testid="parse-error">
          <strong>Parse Error:</strong> {error}
        </div>
      )}
      <pre>{lines.join('\n')}</pre>
      {data.length > maxBytes && (
        <p className="preview-hex-truncated">
          Showing first {maxBytes} of {data.length} bytes
        </p>
      )}
    </div>
  );
}

export function PreviewPanel({ parsedFile, filePath, pakService, onClassnamesLoaded, hiddenClassnames, onEntitySelected }: PreviewPanelProps) {
  if (!parsedFile || !filePath) {
    return (
      <main className="preview-panel preview-panel-empty" data-testid="preview-panel">
        <p>Select a file to preview</p>
      </main>
    );
  }

  const renderPreview = () => {
    switch (parsedFile.type) {
      case 'pcx':
        return (
          <TextureAtlas
            rgba={parsedFile.rgba}
            width={parsedFile.width}
            height={parsedFile.height}
            format="pcx"
            name={filePath.split('/').pop() || 'unknown'}
            palette={parsedFile.image.palette}
          />
        );
      case 'tga':
        return (
          <TextureAtlas
            rgba={parsedFile.rgba}
            width={parsedFile.width}
            height={parsedFile.height}
            format="tga"
            name={filePath.split('/').pop() || 'unknown'}
          />
        );
      case 'wal':
        if (parsedFile.rgba) {
          return (
            <TextureAtlas
              rgba={parsedFile.rgba}
              width={parsedFile.width}
              height={parsedFile.height}
              format="wal"
              name={filePath.split('/').pop() || 'unknown'}
              palette={pakService.getPalette() || undefined}
              mipmaps={parsedFile.mipmaps}
            />
          );
        }
        return (
          <div className="preview-model" data-testid="wal-no-palette">
            <p>WAL texture requires palette (colormap.pcx)</p>
            <p>{parsedFile.width} x {parsedFile.height}</p>
          </div>
        );
      case 'md2':
      case 'md3':
        return (
          <ModelInspector
            parsedFile={parsedFile}
            pakService={pakService}
            filePath={filePath}
          />
        );
      case 'bsp':
        return (
          <BspAnalyzer
            map={parsedFile.map}
            pakService={pakService}
            filePath={filePath}
            onClassnamesLoaded={onClassnamesLoaded}
            hiddenClassnames={hiddenClassnames}
            onEntitySelected={onEntitySelected}
          />
        );
      case 'dm2':
        return (
          <UniversalViewer
            parsedFile={parsedFile}
            pakService={pakService}
            filePath={filePath}
            onClassnamesLoaded={onClassnamesLoaded}
            hiddenClassnames={hiddenClassnames}
            onEntitySelected={onEntitySelected}
          />
        );
      case 'sp2':
        return (
          <SpriteViewer
            model={parsedFile.model}
            loadFile={async (path: string) => await pakService.readFile(path)}
          />
        );
      case 'wav':
        return <AudioPreview audio={parsedFile.audio} />;
      case 'txt':
        return <TextPreview content={parsedFile.content} />;
      case 'unknown':
        return <HexPreview data={parsedFile.data} error={parsedFile.error} />;
      default:
        return <p>Unknown file type</p>;
    }
  };

  return (
    <main className="preview-panel" data-testid="preview-panel">
      <div className="preview-header">
        <span className="preview-path">{filePath}</span>
      </div>
      <div className="preview-content">{renderPreview()}</div>
    </main>
  );
}
