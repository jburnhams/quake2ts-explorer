import React, { useState, useCallback, useEffect } from 'react';

export interface DropZoneProps {
  onDrop: (files: FileList) => void;
  children: React.ReactNode;
}

export function DropZone({ onDrop, children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => c + 1);
    if (e.dataTransfer?.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((c) => {
      const next = c - 1;
      if (next === 0) {
        setIsDragging(false);
      }
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        // Filter for .pak files
        const pakFiles = Array.from(files).filter((f) =>
          f.name.toLowerCase().endsWith('.pak')
        );
        if (pakFiles.length > 0) {
          // Create a FileList-like object
          const dt = new DataTransfer();
          pakFiles.forEach((f) => dt.items.add(f));
          onDrop(dt.files);
        }
      }
    },
    [onDrop]
  );

  useEffect(() => {
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return (
    <div className="drop-zone-container" data-testid="drop-zone">
      {children}
      {isDragging && (
        <div className="drop-zone-overlay" data-testid="drop-zone-overlay">
          <div className="drop-zone-message">
            <span className="drop-zone-icon">{'\uD83D\uDCC2'}</span>
            <span>Drop PAK file here</span>
          </div>
        </div>
      )}
    </div>
  );
}
