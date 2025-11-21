import React, { useRef } from 'react';

export interface ToolbarProps {
  onFileSelect: (files: FileList) => void;
  pakCount: number;
  fileCount: number;
}

export function Toolbar({ onFileSelect, pakCount, fileCount }: ToolbarProps) {
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
          data-testid="open-pak-button"
        >
          Open PAK File
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
