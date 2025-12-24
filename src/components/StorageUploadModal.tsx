import React from 'react';
import './StorageUploadModal.css';

export interface StorageUploadModalProps {
  isOpen: boolean;
  progress: number; // 0 to 100
  status: string;
  currentFile?: string;
  onClose?: () => void;
  canClose?: boolean;
}

export function StorageUploadModal({
  isOpen,
  progress,
  status,
  currentFile,
  onClose,
  canClose = false
}: StorageUploadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-testid="storage-upload-modal">
      <div className="modal-content upload-modal">
        <h2>Uploading to Storage</h2>

        <div className="upload-progress-container">
          <div
            className="upload-progress-bar"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            data-testid="upload-progress-bar"
          />
        </div>

        <div className="upload-status" data-testid="upload-status">
          <p>{status}</p>
          {currentFile && <p className="current-file">Processing: {currentFile}</p>}
        </div>

        {canClose && onClose && (
          <div className="modal-actions">
            <button onClick={onClose} data-testid="close-upload-modal">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
