import { InputController, InputBindings } from 'quake2ts/client';
import { UserCommand } from 'quake2ts/shared';
import { createApplicationBindings } from '../config/defaultBindings';

class InputService {
  private controller: InputController;
  private pointerLocked: boolean = false;
  private active: boolean = false;

  constructor(bindings?: InputBindings) {
    this.controller = new InputController(
        {
            sensitivity: 3.0,
            requirePointerLock: false
        },
        bindings || createApplicationBindings()
    );
  }

  // Lifecycle
  init(): void {
    this.active = true;
    this.setupGlobalListeners();
  }

  shutdown(): void {
    this.active = false;
    this.removeGlobalListeners();
  }

  setActive(active: boolean): void {
      this.active = active;
  }

  generateUserCommand(deltaMs: number, nowMs: number): UserCommand {
      return this.controller.buildCommand(deltaMs, nowMs);
  }

  // Event Handlers
  handleKeyDown(event: KeyboardEvent): void {
    if (!this.active) return;
    this.controller.handleKeyDown(event.code);
    if (this.isGameKey(event.code)) {
        event.preventDefault();
    }
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (!this.active) return;
    this.controller.handleKeyUp(event.code);
    if (this.isGameKey(event.code)) {
        event.preventDefault();
    }
  }

  handleMouseDown(event: MouseEvent): void {
    if (!this.active) return;
    this.controller.handleMouseButtonDown(event.button);
  }

  handleMouseUp(event: MouseEvent): void {
    if (!this.active) return;
    this.controller.handleMouseButtonUp(event.button);
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.active) return;
    if (document.pointerLockElement) {
        this.controller.handleMouseMove(event.movementX, event.movementY);
    }
  }

  // Helpers
  private setupGlobalListeners(): void {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
      window.addEventListener('mousedown', this.boundMouseDown);
      window.addEventListener('mouseup', this.boundMouseUp);
      window.addEventListener('mousemove', this.boundMouseMove);
  }

  private removeGlobalListeners(): void {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
      window.removeEventListener('mousedown', this.boundMouseDown);
      window.removeEventListener('mouseup', this.boundMouseUp);
      window.removeEventListener('mousemove', this.boundMouseMove);
  }

  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private boundKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
  private boundMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
  private boundMouseUp = (e: MouseEvent) => this.handleMouseUp(e);
  private boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);

  private isGameKey(code: string): boolean {
      return true; // Simplified
  }
}

// Singleton
let inputServiceInstance: InputService | null = null;

export function getInputService(bindings?: InputBindings): InputService {
    if (!inputServiceInstance) {
        inputServiceInstance = new InputService(bindings);
    }
    return inputServiceInstance;
}

export function resetInputService(): void {
    if (inputServiceInstance) {
        inputServiceInstance.shutdown(); // Ensure listeners are removed
        inputServiceInstance = null;
    }
}

export const cleanupInputController = resetInputService;
