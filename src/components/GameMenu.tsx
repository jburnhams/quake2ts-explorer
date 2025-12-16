import React, { useState, useEffect } from 'react';
import { SaveLoadDialog } from './SaveLoadDialog';
import { demoRecorderService } from '../services/demoRecorder';
import './GameMenu.css';

interface GameMenuProps {
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onQuit: () => void;
}

export function GameMenu({ onResume, onSave, onLoad, onQuit }: GameMenuProps) {
  const [activeDialog, setActiveDialog] = useState<'save' | 'load' | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    setIsRecording(demoRecorderService.isRecording());
  }, []);

  const handleRecordClick = () => {
    if (isRecording) {
      const data = demoRecorderService.stopRecording();
      if (data) {
        // In a real app we'd prompt for download or save
        const blob = new Blob([data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `demo_${Date.now()}.dm2`;
        a.click();
        URL.revokeObjectURL(url);
      }
      setIsRecording(false);
    } else {
      // Prompt for filename in a real app, for now auto-name
      demoRecorderService.startRecording(`demo_${Date.now()}.dm2`);
      setIsRecording(true);
      onResume(); // Auto resume when recording starts?
    }
  };

  const handleSaveClick = () => {
      // Use dialog instead of prop callback (which was just stub)
      setActiveDialog('save');
  };

  const handleLoadClick = () => {
      // Use dialog
      setActiveDialog('load');
  };

  const handleDialogClose = () => {
      setActiveDialog(null);
  };

  if (activeDialog) {
      return (
          <SaveLoadDialog
             mode={activeDialog}
             onClose={handleDialogClose}
             onActionComplete={() => {
                 handleDialogClose();
                 if (activeDialog === 'load') {
                     onResume(); // Resume game after loading
                 }
             }}
          />
      );
  }

  return (
    <div className="game-menu-overlay">
      <div className="game-menu">
        <h2>Game Paused</h2>
        <button className="primary" onClick={onResume}>Resume Game</button>
        <button onClick={handleSaveClick}>Save Game</button>
        <button onClick={handleLoadClick}>Load Game</button>
        <button onClick={handleRecordClick}>
          {isRecording ? 'Stop Recording Demo' : 'Record Demo'}
        </button>
        <button onClick={() => console.log('Settings not implemented yet')}>Settings</button>
        <button onClick={onQuit}>Quit to Browser</button>
      </div>
    </div>
  );
}
