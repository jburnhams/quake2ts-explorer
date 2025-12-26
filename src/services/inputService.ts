// Task 3: Input Controller Implementation
import { InputController, InputBindings } from '@quake2ts/client';
import { UserCommand } from '@quake2ts/shared';
import { DEFAULT_BINDINGS, KeyBindingEntry } from '@/src/config/defaultBindings';

let inputController: InputController | null = null;
let listeners: { type: string, handler: EventListener }[] = [];

// Track input state for internal use if needed, though controller handles most
let isGameMode = false;

export function initInputController(customBindings?: KeyBindingEntry[]) {
  // Cleanup existing if any
  cleanupInputController();

  // Convert array of binding entries to binding map if needed
  // Based on reading types, InputBindings constructor takes Iterable<BindingEntry>
  // KeyBindingEntry matches {code, command} structure of BindingEntry
  const bindings = new InputBindings(customBindings || DEFAULT_BINDINGS);

  inputController = new InputController({}, bindings);
  isGameMode = true;

  const handleKeyDown = (e: Event) => {
    if (!isGameMode || !inputController) return;
    if (e instanceof KeyboardEvent) {
      // Don't consume F-keys or browser shortcuts unless captured
      if (e.code === 'F5' || e.code === 'F12') return;

      inputController.handleKeyDown(e.code, e.timeStamp);

      // Prevent default for bound keys to stop page scrolling etc.
      if (inputController.getDefaultBindings().getBinding(e.code)) {
        e.preventDefault();
      }
    }
  };

  const handleKeyUp = (e: Event) => {
    if (!isGameMode || !inputController) return;
    if (e instanceof KeyboardEvent) {
      inputController.handleKeyUp(e.code, e.timeStamp);
    }
  };

  const handleMouseDown = (e: Event) => {
    if (!isGameMode || !inputController) return;
    if (e instanceof MouseEvent) {
      inputController.handleMouseButtonDown(e.button, e.timeStamp);
    }
  };

  const handleMouseUp = (e: Event) => {
    if (!isGameMode || !inputController) return;
    if (e instanceof MouseEvent) {
      inputController.handleMouseButtonUp(e.button, e.timeStamp);
    }
  };

  const handleMouseMove = (e: Event) => {
    if (!isGameMode || !inputController) return;
    if (e instanceof MouseEvent) {
      // Only process mouse movement if pointer is locked for gameplay
      if (document.pointerLockElement) {
        inputController.handleMouseMove(e.movementX, e.movementY);
      }
    }
  };

  listeners = [
    { type: 'keydown', handler: handleKeyDown },
    { type: 'keyup', handler: handleKeyUp },
    { type: 'mousedown', handler: handleMouseDown },
    { type: 'mouseup', handler: handleMouseUp },
    { type: 'mousemove', handler: handleMouseMove }
  ];

  listeners.forEach(({ type, handler }) => {
    window.addEventListener(type, handler);
  });
}

export function cleanupInputController() {
  listeners.forEach(({ type, handler }) => {
    window.removeEventListener(type, handler);
  });
  listeners = [];
  inputController = null;
  isGameMode = false;
}

export function setInputMode(mode: 'game' | 'menu') {
  isGameMode = mode === 'game';
  // If switching to menu, we might want to release keys or something
  // But controller state management handles most of it
}

export function generateUserCommand(deltaMs: number): UserCommand {
  if (!inputController) {
    // Return empty command structure matching UserCommand interface
    return {
      msec: Math.min(255, deltaMs),
      buttons: 0,
      angles: { x: 0, y: 0, z: 0 },
      forwardmove: 0,
      sidemove: 0,
      upmove: 0,
      impulse: 0,
      lightlevel: 0
    } as unknown as UserCommand;
  }

  // quake2ts input controller handles command generation
  return inputController.buildCommand(deltaMs);
}

export function getInputController(): InputController | null {
  return inputController;
}
