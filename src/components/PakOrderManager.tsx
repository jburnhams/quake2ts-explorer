import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PakService, MountedPak } from '../services/pakService';
import './PakOrderManager.css';

interface PakOrderManagerProps {
  pakService: PakService;
  onClose: () => void;
}

interface PakItemProps {
  pak: MountedPak;
  index: number;
  totalPaks: number;
  isOverridden: (path: string) => boolean;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

const PakItem: React.FC<PakItemProps> = ({
  pak,
  index,
  totalPaks,
  isOverridden,
  onMove,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const [expanded, setExpanded] = useState(false);

  // Memoize file list processing
  const files = useMemo(() => {
    return pak.archive.listEntries().map(e => e.name).sort();
  }, [pak.archive]);

  const overriddenCount = useMemo(() => {
    let count = 0;
    for (const file of files) {
      if (isOverridden(file)) count++;
    }
    return count;
  }, [files, isOverridden]);

  return (
    <div
      className="pak-item"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      <div className="pak-item-header">
        <div className="drag-handle">☰</div>
        <div className="pak-info">
          <div className="pak-name">{pak.name}</div>
          <div className="pak-meta">
            Priority: {pak.priority} • Files: {files.length} • Overridden: {overriddenCount}
          </div>
        </div>
        <div className="pak-actions">
          <button
            className="pak-action-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Files' : 'Show Files'}
          </button>
          <button
            className="pak-action-btn"
            disabled={index === 0}
            onClick={() => onMove(index, 'up')}
            title="Move Up (Load Earlier)"
          >
            ↑
          </button>
          <button
            className="pak-action-btn"
            disabled={index === totalPaks - 1}
            onClick={() => onMove(index, 'down')}
            title="Move Down (Load Later/Override)"
          >
            ↓
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pak-file-list">
          {files.map(file => {
            const overridden = isOverridden(file);
            return (
              <div key={file} className={`file-item ${overridden ? 'overridden' : ''}`}>
                <span>{file}</span>
                {overridden && <span className="overridden-tag">Overridden</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PakOrderManager: React.FC<PakOrderManagerProps> = ({ pakService, onClose }) => {
  const [paks, setPaks] = useState<MountedPak[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Load initial PAKs
  useEffect(() => {
    const mounted = pakService.getMountedPaks();
    // Sort by priority (asc) so top = low priority, bottom = high priority
    // But we want to display as "Load Order" list: 1, 2, 3...
    // Usually list item 1 is processed first, item N last.
    // So visual order should match priority order.
    // mounted is unsorted map values usually, so let's sort.
    const sorted = [...mounted].sort((a, b) => a.priority - b.priority);
    setPaks(sorted);
  }, [pakService]);

  // Calculate winner map for override detection
  const winnerMap = useMemo(() => {
    const map = new Map<string, string>(); // path -> pakId
    // Paks are sorted by priority (low -> high)
    // So later paks overwrite earlier ones in the map
    for (const pak of paks) {
      const entries = pak.archive.listEntries();
      for (const entry of entries) {
        map.set(entry.name, pak.id);
      }
    }
    return map;
  }, [paks]);

  const isOverridden = useCallback((pakId: string, path: string) => {
    const winnerId = winnerMap.get(path);
    return winnerId !== pakId;
  }, [winnerMap]);

  const handleSave = () => {
    // Reorder in service
    // Extract IDs in current order
    const ids = paks.map(p => p.id);
    pakService.reorderPaks(ids);
    onClose();
  };

  const movePak = (index: number, direction: 'up' | 'down') => {
    const newPaks = [...paks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex >= 0 && targetIndex < newPaks.length) {
      [newPaks[index], newPaks[targetIndex]] = [newPaks[targetIndex], newPaks[index]];
      setPaks(newPaks);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Optional: set drag image
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary for Drop to fire
    if (draggedIndex === null || draggedIndex === index) return;

    // We could implement live reorder here, but simple swap on drop is safer for now
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPaks = [...paks];
    const [removed] = newPaks.splice(draggedIndex, 1);
    newPaks.splice(index, 0, removed);

    setPaks(newPaks);
    setDraggedIndex(null);
  };

  return (
    <div className="pak-order-overlay">
      <div className="pak-order-modal">
        <div className="pak-order-header">
          <h2>PAK Load Order</h2>
          <button className="secondary-button" onClick={onClose}>×</button>
        </div>

        <div className="pak-order-content">
          <div className="load-order-info">
            <strong>How Load Order Works:</strong> PAKs are loaded from top to bottom.
            Files in PAKs lower in the list will override files in PAKs higher in the list.
          </div>

          <div className="pak-list">
            {paks.map((pak, index) => (
              <PakItem
                key={pak.id}
                pak={pak}
                index={index}
                totalPaks={paks.length}
                isOverridden={(path) => isOverridden(pak.id, path)}
                onMove={movePak}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>

        <div className="pak-order-footer">
          <button className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={handleSave}>Apply Changes</button>
        </div>
      </div>
    </div>
  );
};
