import React, { useState } from 'react';
import { VideoRecordOptions } from '../services/videoRecorder';
import './ScreenshotSettings.css'; // Reusing existing modal styles

interface VideoSettingsProps {
  onStart: (options: VideoRecordOptions) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoSettings({ onStart, isOpen, onClose }: VideoSettingsProps) {
  const [fps, setFps] = useState<number>(30);
  const [bitrate, setBitrate] = useState<number>(2500000); // 2.5 Mbps default
  const [mimeType, setMimeType] = useState<string>('video/webm;codecs=vp9');
  const [resolution, setResolution] = useState<string>('match');
  const [timeLimit, setTimeLimit] = useState<number>(300); // 5 minutes default
  const [recordAudio, setRecordAudio] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStart = () => {
    let width: number | undefined;
    let height: number | undefined;

    if (resolution === '720p') {
        width = 1280;
        height = 720;
    } else if (resolution === '1080p') {
        width = 1920;
        height = 1080;
    }

    onStart({
      fps,
      videoBitsPerSecond: bitrate,
      mimeType,
      width,
      height,
      timeLimit,
      audio: recordAudio
    });
    onClose();
  };

  return (
    <div className="screenshot-settings-modal">
      <div className="screenshot-settings-content">
        <h3>Video Recording Settings</h3>

        <div className="setting-group">
          <label htmlFor="video-fps">Frame Rate:</label>
          <select id="video-fps" value={fps} onChange={(e) => setFps(Number(e.target.value))}>
            <option value="30">30 FPS</option>
            <option value="60">60 FPS</option>
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="video-bitrate">Quality (Bitrate):</label>
          <select id="video-bitrate" value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))}>
            <option value="1000000">Low (1 Mbps)</option>
            <option value="2500000">Medium (2.5 Mbps)</option>
            <option value="5000000">High (5 Mbps)</option>
            <option value="8000000">Ultra (8 Mbps)</option>
          </select>
        </div>

        <div className="setting-group">
            <label htmlFor="video-resolution">Resolution:</label>
            <select id="video-resolution" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                <option value="match">Match Canvas</option>
                <option value="720p">1280x720 (720p)</option>
                <option value="1080p">1920x1080 (1080p)</option>
            </select>
        </div>

        <div className="setting-group">
            <label htmlFor="video-limit">Time Limit:</label>
            <select id="video-limit" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}>
                <option value="0">No Limit</option>
                <option value="60">1 Minute</option>
                <option value="300">5 Minutes</option>
                <option value="600">10 Minutes</option>
            </select>
        </div>

        <div className="setting-group">
            <label htmlFor="video-format">Format:</label>
            <select id="video-format" value={mimeType} onChange={(e) => setMimeType(e.target.value)}>
                <option value="video/webm;codecs=vp9">WebM (VP9)</option>
                <option value="video/webm;codecs=vp8">WebM (VP8)</option>
            </select>
        </div>

        <div className="setting-group" style={{ display: 'flex', alignItems: 'center' }}>
            <input
                type="checkbox"
                id="video-audio"
                checked={recordAudio}
                onChange={(e) => setRecordAudio(e.target.checked)}
                style={{ marginRight: '10px' }}
                disabled={true} // Disabled until audio context access is implemented
                title="Audio recording requires engine integration (coming soon)"
            />
            <label htmlFor="video-audio" style={{ marginBottom: 0, opacity: 0.5 }}>Record Audio (Coming Soon)</label>
        </div>

        <div className="button-group">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleStart} className="capture-btn">Start Recording</button>
        </div>
      </div>
    </div>
  );
}
