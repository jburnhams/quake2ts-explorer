import React, { useState } from 'react';
import { SaveLoadDialog } from './SaveLoadDialog';
import './GameMenu.css';

interface GameMenuProps {
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onQuit: () => void;
}

export function GameMenu({ onResume, onSave, onLoad, onQuit }: GameMenuProps) {
  const [activeDialog, setActiveDialog] = useState<'save' | 'load' | null>(null);

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
        <button onClick={() => console.log('Settings not implemented yet')}>Settings</button>
        <button onClick={onQuit}>Quit to Browser</button>
      </div>
    </div>
  );
}
