import React, { useRef } from 'react';
import type { ViewMode } from '../services/pakService';

export interface ToolbarProps {
  onFileSelect: (files: FileList) => void;
  pakCount: number;
  fileCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function Toolbar({ onFileSelect, pakCount, fileCount, viewMode, onViewModeChange }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <header className="toolbar" data-testid="toolbar">
      <h1 className="toolbar-title">Quake2TS Explorer</h1>
      <div className="toolbar-actions">
        <button
          className="toolbar-button"
          onClick={handleOpenClick}
          data-testid="add-pak-button"
        >
          Add PAK Files
        </button>
        <div className="toolbar-separator" style={{ width: '1px', height: '20px', background: '#444', margin: '0 10px' }} />
        <label className="toolbar-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={viewMode === 'by-pak'}
            onChange={(e) => onViewModeChange(e.target.checked ? 'by-pak' : 'merged')}
            data-testid="view-mode-toggle"
          />
          Group by PAK
        </label>
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
