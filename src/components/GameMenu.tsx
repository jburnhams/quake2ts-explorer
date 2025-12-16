import React from 'react';
import './GameMenu.css';

interface GameMenuProps {
  onResume: () => void;
  onSave: () => void;
  onLoad: () => void;
  onQuit: () => void;
}

export function GameMenu({ onResume, onSave, onLoad, onQuit }: GameMenuProps) {
  return (
    <div className="game-menu-overlay">
      <div className="game-menu">
        <h2>Game Paused</h2>
        <button className="primary" onClick={onResume}>Resume Game</button>
        <button onClick={onSave}>Save Game</button>
        <button onClick={onLoad}>Load Game</button>
        <button onClick={() => console.log('Settings not implemented yet')}>Settings</button>
        <button onClick={onQuit}>Quit to Browser</button>
      </div>
    </div>
  );
}
