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

  if (!isOpen) return null;

  const handleStart = () => {
    onStart({
      fps,
      videoBitsPerSecond: bitrate,
      mimeType
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
            <label htmlFor="video-format">Format:</label>
            <select id="video-format" value={mimeType} onChange={(e) => setMimeType(e.target.value)}>
                <option value="video/webm;codecs=vp9">WebM (VP9)</option>
                <option value="video/webm;codecs=vp8">WebM (VP8)</option>
            </select>
        </div>

        <div className="button-group">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleStart} className="capture-btn">Start Recording</button>
        </div>
      </div>
    </div>
  );
}
