import { InputController, InputBindings } from 'quake2ts/client';
import { UserCommand } from 'quake2ts/shared';
import { DEFAULT_BINDINGS, KeyBindingEntry } from '@/src/config/defaultBindings';

let inputController: InputController | null = null;
let listeners: { type: string, handler: EventListener }[] = [];

export function initInputController(customBindings?: KeyBindingEntry[]) {
  // Cleanup existing if any
  cleanupInputController();

  const bindings = new InputBindings(customBindings || DEFAULT_BINDINGS);
  inputController = new InputController({}, bindings);

  const handleKeyDown = (e: Event) => {
    if (inputController && e instanceof KeyboardEvent) {
      inputController.handleKeyDown(e.code, e.timeStamp);
    }
  };

  const handleKeyUp = (e: Event) => {
    if (inputController && e instanceof KeyboardEvent) {
      inputController.handleKeyUp(e.code, e.timeStamp);
    }
  };

  const handleMouseDown = (e: Event) => {
    if (inputController && e instanceof MouseEvent) {
      inputController.handleMouseButtonDown(e.button, e.timeStamp);
    }
  };

  const handleMouseUp = (e: Event) => {
    if (inputController && e instanceof MouseEvent) {
      inputController.handleMouseButtonUp(e.button, e.timeStamp);
    }
  };

  const handleMouseMove = (e: Event) => {
    if (inputController && e instanceof MouseEvent) {
      inputController.handleMouseMove(e.movementX, e.movementY);
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
}

export function generateUserCommand(deltaMs: number): UserCommand {
  if (!inputController) {
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

  return inputController.buildCommand(deltaMs);
}

export function getInputController(): InputController | null {
  return inputController;
}
