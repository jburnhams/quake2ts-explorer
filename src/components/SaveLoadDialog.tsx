import React, { useState, useEffect } from 'react';
import { saveService, SavedGame } from '../services/saveService';
import { consoleService, LogLevel } from '../services/consoleService';
import './SaveLoadDialog.css';

interface SaveLoadDialogProps {
  mode: 'save' | 'load';
  onClose: () => void;
  onActionComplete: () => void;
}

export function SaveLoadDialog({ mode, onClose, onActionComplete }: SaveLoadDialogProps) {
  const [saves, setSaves] = useState<SavedGame[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [saveName, setSaveName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load saves
    const list = saveService.listSaves();
    setSaves(list);
  }, []);

  const handleSlotSelect = (slot: number) => {
    setSelectedSlot(slot);
    const existing = saves.find(s => s.slot === slot);
    if (existing) {
      setSaveName(existing.name);
    } else {
        if (mode === 'save') {
             setSaveName(`Save Slot ${slot}`);
        } else {
            setSaveName('');
        }
    }
    setError(null);
  };

  const handleAction = async () => {
    if (selectedSlot === null) return;

    try {
      if (mode === 'save') {
        if (!saveName.trim()) {
            setError("Please enter a name for the save.");
            return;
        }
        await saveService.saveGame(selectedSlot, saveName);
        consoleService.log(`Game saved to slot ${selectedSlot}: ${saveName}`, LogLevel.SUCCESS);
      } else {
        if (!saves.find(s => s.slot === selectedSlot)) {
            setError("Slot is empty.");
            return;
        }
        // This will automatically apply the save state to the active game
        const save = await saveService.loadGame(selectedSlot);
        if (save) {
             consoleService.log(`Loaded save: ${save.name}`, LogLevel.INFO);
        }
      }
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleDelete = async (e: React.MouseEvent, slot: number) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this save?')) {
          saveService.deleteSave(slot);
          setSaves(saveService.listSaves());
          if (selectedSlot === slot) {
              setSelectedSlot(null);
              setSaveName('');
          }
      }
  };

  // Generate 8 slots
  const slots = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="save-load-dialog-overlay">
      <div className="save-load-dialog">
        <div className="save-load-header">
          <h2>{mode === 'save' ? 'Save Game' : 'Load Game'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="save-slots">
          {slots.map(slot => {
            const save = saves.find(s => s.slot === slot);
            return (
              <div
                key={slot}
                className={`save-slot ${selectedSlot === slot ? 'selected' : ''}`}
                onClick={() => handleSlotSelect(slot)}
              >
                <div className="slot-info">
                  <span className="slot-number">Slot {slot}</span>
                  {save ? (
                      <div className="save-details">
                          <span className="save-name">{save.name}</span>
                          <span className="save-date">{new Date(save.timestamp).toLocaleString()}</span>
                          <span className="save-map">{save.mapName}</span>
                      </div>
                  ) : (
                      <span className="empty-slot">Empty</span>
                  )}
                </div>
                {save && save.screenshot && (
                    <img src={save.screenshot} alt="Screenshot" className="slot-screenshot" />
                )}
                {save && (
                    <button className="delete-btn" onClick={(e) => handleDelete(e, slot)} title="Delete Save">
                        🗑️
                    </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="save-controls">
          {mode === 'save' && (
            <input
              type="text"
              className="save-name-input"
              placeholder="Enter save name..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              disabled={selectedSlot === null}
            />
          )}
          {error && <div className="save-error">{error}</div>}
          <div className="action-buttons">
            <button onClick={onClose}>Cancel</button>
            <button
                className="primary"
                onClick={handleAction}
                disabled={selectedSlot === null || (mode === 'load' && !saves.find(s => s.slot === selectedSlot))}
            >
              {mode === 'save' ? 'Save' : 'Load'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
