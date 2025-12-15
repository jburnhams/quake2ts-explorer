// Task 3: Default Key Bindings
export interface KeyBindingEntry {
  code: string;
  command: string;
}

export const DEFAULT_BINDINGS: KeyBindingEntry[] = [
  // Movement
  { code: 'KeyW', command: '+forward' },
  { code: 'ArrowUp', command: '+forward' },
  { code: 'KeyS', command: '+back' },
  { code: 'ArrowDown', command: '+back' },
  { code: 'KeyA', command: '+moveleft' },
  { code: 'ArrowLeft', command: '+moveleft' }, // Changed from +left based on previous grep output showing +left is turn left
  { code: 'KeyD', command: '+moveright' },
  { code: 'ArrowRight', command: '+moveright' }, // Changed from +right
  { code: 'Space', command: '+jump' },
  { code: 'ControlLeft', command: '+crouch' },
  { code: 'KeyC', command: '+crouch' },

  // Actions
  { code: 'Mouse1', command: '+attack' },
  { code: 'ControlRight', command: '+attack' },
  { code: 'KeyE', command: '+use' },
  { code: 'Enter', command: '+use' },

  // Weapons
  { code: 'Digit1', command: 'weapon 1' },
  { code: 'Digit2', command: 'weapon 2' },
  { code: 'Digit3', command: 'weapon 3' },
  { code: 'Digit4', command: 'weapon 4' },
  { code: 'Digit5', command: 'weapon 5' },
  { code: 'Digit6', command: 'weapon 6' },
  { code: 'Digit7', command: 'weapon 7' },
  { code: 'Digit8', command: 'weapon 8' },
  { code: 'Digit9', command: 'weapon 9' },
  { code: 'Digit0', command: 'weapon 0' },

  // Inventory
  { code: 'BracketLeft', command: 'invprev' },
  { code: 'BracketRight', command: 'invnext' },

  // Wheel
  { code: 'WheelDown', command: 'weapnext' }, // Assuming WheelDown maps to mwheeldown event or similar
  { code: 'WheelUp', command: 'weapprev' }
];
