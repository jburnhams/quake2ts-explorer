import { InputBindings } from 'quake2ts/client';

export const DEFAULT_BINDINGS = [
  { code: 'KeyW', command: '+forward' },
  { code: 'KeyS', command: '+back' },
  { code: 'KeyA', command: '+moveleft' },
  { code: 'KeyD', command: '+moveright' },
  { code: 'Space', command: '+jump' },
  { code: 'ControlLeft', command: '+crouch' },
  { code: 'ControlRight', command: '+crouch' },
  { code: 'Mouse1', command: '+attack' },
  { code: 'KeyE', command: '+use' }, // or 'use' if not +/- command? client handles it?
  // Checking bindings.d.ts: command is string.
  // InputController.d.ts: InputAction enum has "+use".
  { code: 'KeyQ', command: 'invprev' }, // standard quake inventory
  { code: 'KeyR', command: 'reload' },
  { code: 'Digit1', command: 'impulse 1' },
  { code: 'Digit2', command: 'impulse 2' },
  { code: 'Digit3', command: 'impulse 3' },
  { code: 'Digit4', command: 'impulse 4' },
  { code: 'Digit5', command: 'impulse 5' },
  { code: 'Digit6', command: 'impulse 6' },
  { code: 'Digit7', command: 'impulse 7' },
  { code: 'Digit8', command: 'impulse 8' },
  { code: 'Digit9', command: 'impulse 9' },
  { code: 'Digit0', command: 'impulse 10' },
  { code: 'ShiftLeft', command: '+speed' }
];

export function createApplicationBindings(): InputBindings {
    return new InputBindings(DEFAULT_BINDINGS);
}
