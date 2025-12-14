import React, { useRef, useState, useEffect } from 'react';
import { demoRecorderService } from '../services/demoRecorder';

export interface ToolbarProps {
  onFileSelect: (files: FileList) => void;
  pakCount: number;
  fileCount: number;
  onOpenEntityDatabase?: () => void;
}

export function Toolbar({ onFileSelect, pakCount, fileCount, onOpenEntityDatabase }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsRecording(demoRecorderService.isRecording());

    // Poll for recording state changes (could be improved with an event emitter)
    const interval = setInterval(() => {
        setIsRecording(demoRecorderService.isRecording());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
        const data = demoRecorderService.stopRecording();
        if (data) {
            // Prompt download
            // Cast data to any or ensure it is treated as a BlobPart (Uint8Array is valid in browser but Typescript might be picky about SharedArrayBuffer)
            const blob = new Blob([data as unknown as BlobPart], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `demo_${new Date().toISOString().replace(/[:.]/g, '-')}.dm2`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        setIsRecording(false);
    } else {
        demoRecorderService.startRecording(`demo_${Date.now()}.dm2`);
        setIsRecording(true);
    }
  };

  return (
    <header className="toolbar" data-testid="toolbar">
      <h1 className="toolbar-title">Quake2TS Explorer</h1>
      <div className="toolbar-actions">
        <button
          className="toolbar-button"
          onClick={handleOpenClick}
          data-testid="open-pak-button"
        >
          Open PAK File
        </button>
        {onOpenEntityDatabase && (
          <button
            className="toolbar-button"
            onClick={onOpenEntityDatabase}
            data-testid="open-entity-db-button"
            disabled={pakCount === 0}
          >
            Entity Database
          </button>
        )}
        <button
          className={`toolbar-button ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordToggle}
          title={isRecording ? "Stop Recording" : "Start Recording"}
          data-testid="record-demo-button"
        >
          {isRecording ? "🔴 Stop Rec" : "⚪ Rec Demo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pak"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          data-testid="file-input"
        />
      </div>
      <div className="toolbar-info" data-testid="toolbar-info">
        {pakCount > 0 ? (
          <span>
            {pakCount} PAK{pakCount !== 1 ? 's' : ''} loaded ({fileCount} files)
          </span>
        ) : (
          <span>No PAK files loaded</span>
        )}
      </div>
    </header>
  );
}
