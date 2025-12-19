import React, { useState, useEffect, useRef } from 'react';
import './SoundAnalyzer.css';
import { WaveformCanvas } from './WaveformCanvas';
import { FrequencySpectrum } from './FrequencySpectrum';
import type { PakService } from '../services/pakService';
import { AssetCrossRefService, AssetUsage } from '../services/assetCrossRefService';

interface SoundAnalyzerProps {
  audio: {
    channels: number;
    sampleRate: number;
    bitsPerSample: number;
    samples: Int16Array | Float32Array;
  };
  fileName: string;
  pakService?: PakService;
}

export function SoundAnalyzer({ audio, fileName, pakService }: SoundAnalyzerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [usageInfo, setUsageInfo] = useState<AssetUsage[]>([]);
  const [analyzingUsage, setAnalyzingUsage] = useState(false);

  // Zoom and Scroll state
  const [zoom, setZoom] = useState(1);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Refs for audio context and source to persist across renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Initialize AudioBuffer
  useEffect(() => {
    // Only run if we have window (client-side)
    if (typeof window === 'undefined') return;

    try {
        const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!CtxClass) return;

        const ctx = audioContextRef.current || new CtxClass();
        audioContextRef.current = ctx;

        const buffer = ctx.createBuffer(
            audio.channels,
            audio.samples.length / audio.channels,
            audio.sampleRate
        );

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
        setAudioBuffer(buffer);

        // Create analyzer
        const ana = ctx.createAnalyser();
        ana.fftSize = 2048;
        setAnalyser(ana);

        return () => {
             // Cleanup if needed
        };
    } catch (e) {
        console.error("Failed to initialize audio", e);
    }
  }, [audio]);

  // Clean up on unmount
  useEffect(() => {
      return () => {
          if (sourceNodeRef.current) {
              sourceNodeRef.current.stop();
          }
          if (audioContextRef.current) {
              audioContextRef.current.close();
          }
      };
  }, []);

  // Animation frame for timer and auto-scroll
  useEffect(() => {
      let raf: number;
      const updateTime = () => {
          if (isPlaying && audioContextRef.current) {
              const elapsed = audioContextRef.current.currentTime - startTimeRef.current;

              if (audioBuffer && elapsed > audioBuffer.duration) {
                  setIsPlaying(false);
                  pauseTimeRef.current = 0;
                  setCurrentTime(0);
              } else {
                  const newTime = pauseTimeRef.current + elapsed;
                  setCurrentTime(newTime);

                  // Auto scroll if playing past visible window
                  // Visible window: [scrollOffset, scrollOffset + duration/zoom]
                  if (zoom > 1 && audioBuffer) {
                      const visibleDuration = audioBuffer.duration / zoom;
                      if (newTime > scrollOffset + visibleDuration) {
                          // Scroll to keep cursor on right side or center?
                          // Let's scroll so cursor is at 90% or wrap
                          // Simple behavior: Page scroll
                          setScrollOffset(Math.min(audioBuffer.duration - visibleDuration, newTime - visibleDuration * 0.1));
                      }
                  }

                  raf = requestAnimationFrame(updateTime);
              }
          }
      };

      if (isPlaying) {
          startTimeRef.current = audioContextRef.current?.currentTime || 0;
          raf = requestAnimationFrame(updateTime);
      }

      return () => cancelAnimationFrame(raf);
  }, [isPlaying, audioBuffer, zoom, scrollOffset]);

  useEffect(() => {
    if (!pakService) return;

    const analyzeUsage = async () => {
        setAnalyzingUsage(true);
        try {
            const crossRefService = new AssetCrossRefService(pakService.getVfs());
            const usages = await crossRefService.findSoundUsage(fileName);
            setUsageInfo(usages);
        } catch (e) {
            console.error('Failed to analyze sound usage', e);
        } finally {
            setAnalyzingUsage(false);
        }
    };

    analyzeUsage();
  }, [fileName, pakService]);

  const handleExportWav = () => {
      if (!audioBuffer) return;

      // Simple WAV export
      const buffer = audioBuffer;
      const numOfChan = buffer.numberOfChannels;
      const length = buffer.length * numOfChan * 2 + 44;
      const bufferArr = new ArrayBuffer(length);
      const view = new DataView(bufferArr);
      const channels = [];
      let i;
      let sample;
      let offset = 0;
      let pos = 0;

      // write WAVE header
      setUint32(0x46464952);                         // "RIFF"
      setUint32(length - 8);                         // file length - 8
      setUint32(0x45564157);                         // "WAVE"

      setUint32(0x20746d66);                         // "fmt " chunk
      setUint32(16);                                 // length = 16
      setUint16(1);                                  // PCM (uncompressed)
      setUint16(numOfChan);
      setUint32(buffer.sampleRate);
      setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
      setUint16(numOfChan * 2);                      // block-align
      setUint16(16);                                 // 16-bit (hardcoded in this loop below)

      setUint32(0x61746164);                         // "data" - chunk
      setUint32(length - pos - 4);                   // chunk length

      // write interleaved data
      for(i = 0; i < buffer.numberOfChannels; i++)
          channels.push(buffer.getChannelData(i));

      while(pos < buffer.length) {
          for(i = 0; i < numOfChan; i++) {             // interleave channels
              sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
              sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
              view.setInt16(44 + offset, sample, true);          // write 16-bit sample
              offset += 2;
          }
          pos++;
      }

      // create Blob
      const blob = new Blob([bufferArr], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.replace(/\.[^/.]+$/, "")}.wav`;
      link.click();
      URL.revokeObjectURL(url);

      function setUint16(data: number) {
          view.setUint16(pos, data, true);
          pos += 2;
      }

      function setUint32(data: number) {
          view.setUint32(pos, data, true);
          pos += 4;
      }
  };

  const handlePlayPause = async () => {
      const ctx = audioContextRef.current;
      if (!ctx || !audioBuffer || !analyser) return;

      if (ctx.state === 'suspended') {
          await ctx.resume();
      }

      if (isPlaying) {
          // Pause
          if (sourceNodeRef.current) {
              sourceNodeRef.current.stop();
              sourceNodeRef.current = null;
          }
          pauseTimeRef.current = currentTime;
          setIsPlaying(false);
      } else {
          // Play
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(analyser);
          analyser.connect(ctx.destination);

          source.start(0, pauseTimeRef.current);
          startTimeRef.current = ctx.currentTime;

          sourceNodeRef.current = source;
          setIsPlaying(true);
      }
  };

  const handleStop = () => {
      if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current = null;
      }
      setIsPlaying(false);
      pauseTimeRef.current = 0;
      setCurrentTime(0);
  };

  const handleZoomIn = () => {
      setZoom(prev => Math.min(prev * 2, 64)); // Max 64x zoom
  };

  const handleZoomOut = () => {
      setZoom(prev => {
          const newZoom = Math.max(prev / 2, 1);
          // If zooming out, ensure scrollOffset is valid
          if (audioBuffer) {
              const visibleDuration = audioBuffer.duration / newZoom;
              if (scrollOffset + visibleDuration > audioBuffer.duration) {
                  setScrollOffset(Math.max(0, audioBuffer.duration - visibleDuration));
              }
          }
          return newZoom;
      });
  };

  const handleScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!audioBuffer) return;
      const maxScroll = audioBuffer.duration - (audioBuffer.duration / zoom);
      const val = parseFloat(e.target.value);
      setScrollOffset(Math.min(val, maxScroll));
  };

  const duration = audioBuffer ? audioBuffer.duration : 0;
  const visibleDuration = duration / zoom;
  const maxScroll = Math.max(0, duration - visibleDuration);

  const formatTime = (t: number) => {
      const m = Math.floor(t / 60);
      const s = Math.floor(t % 60);
      const ms = Math.floor((t % 1) * 100);
      return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="sound-analyzer" data-testid="sound-analyzer">
      <div className="sound-analyzer-visualizer">
        <div className="waveform-container">
           {audioBuffer && (
               <WaveformCanvas
                  audioBuffer={audioBuffer}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  zoom={zoom}
                  scrollOffset={scrollOffset}
                />
           )}
        </div>
        <div className="spectrum-container">
            <FrequencySpectrum
               analyser={analyser}
               isPlaying={isPlaying}
            />
        </div>
      </div>

      <div className="sound-controls">
         <button onClick={handlePlayPause} data-testid="play-pause-btn">
             {isPlaying ? 'Pause' : 'Play'}
         </button>
         <button onClick={handleStop} data-testid="stop-btn">
             Stop
         </button>
         <button onClick={handleExportWav} data-testid="export-wav-btn">
             Export WAV
         </button>

         <div className="zoom-controls">
             <button onClick={handleZoomOut} disabled={zoom <= 1} data-testid="zoom-out-btn">-</button>
             <span style={{margin: '0 8px'}}>{zoom}x</span>
             <button onClick={handleZoomIn} disabled={zoom >= 64} data-testid="zoom-in-btn">+</button>
         </div>

         {zoom > 1 && (
             <input
                 type="range"
                 min="0"
                 max={maxScroll}
                 step="0.01"
                 value={scrollOffset}
                 onChange={handleScroll}
                 style={{width: '150px'}}
                 data-testid="scroll-slider"
             />
         )}

         <div className="sound-time-display">
             {formatTime(currentTime)} / {formatTime(duration)}
         </div>
      </div>

      <div className="sound-info">
          <div className="sound-info-item">
              <span className="sound-info-label">File:</span>
              <span>{fileName}</span>
          </div>
          <div className="sound-info-item">
              <span className="sound-info-label">Sample Rate:</span>
              <span>{audio.sampleRate} Hz</span>
          </div>
          <div className="sound-info-item">
              <span className="sound-info-label">Channels:</span>
              <span>{audio.channels}</span>
          </div>
          <div className="sound-info-item">
              <span className="sound-info-label">Bits:</span>
              <span>{audio.bitsPerSample}-bit</span>
          </div>
          <div className="sound-info-item">
              <span className="sound-info-label">Size:</span>
              <span>{(audio.samples.byteLength / 1024).toFixed(1)} KB</span>
          </div>
           <div className="sound-info-item">
              <span className="sound-info-label">Usage:</span>
              <span>{analyzingUsage ? 'Scanning...' : `${usageInfo.length} references`}</span>
          </div>
      </div>

      {usageInfo.length > 0 && (
          <div className="sound-usage-list">
              <h4>Referenced in:</h4>
              <ul>
                  {usageInfo.map((usage, i) => (
                      <li key={i}>
                          <span className="usage-path">{usage.path}</span>
                          {usage.details && <span className="usage-details"> ({usage.details})</span>}
                      </li>
                  ))}
              </ul>
          </div>
      )}
    </div>
  );
}
