
import { initInputController, generateUserCommand, cleanupInputController, setInputMode, getInputController } from '@/src/services/inputService';
import { InputController, InputBindings } from 'quake2ts/client';
import { DEFAULT_BINDINGS } from '@/src/config/defaultBindings';
import { UserCommand } from 'quake2ts/shared';

// Mock quake2ts/client
jest.mock('quake2ts/client', () => {
  return {
    InputController: jest.fn().mockImplementation(() => ({
      handleKeyDown: jest.fn(),
      handleKeyUp: jest.fn(),
      handleMouseButtonDown: jest.fn(),
      handleMouseButtonUp: jest.fn(),
      handleMouseMove: jest.fn(),
      buildCommand: jest.fn().mockReturnValue({
        msec: 16,
        buttons: 0,
        angles: { x: 0, y: 0, z: 0 },
        forwardmove: 0,
        sidemove: 0,
        upmove: 0
      }),
      getDefaultBindings: jest.fn().mockReturnValue({
        getBinding: jest.fn()
      })
    })),
    InputBindings: jest.fn()
  };
});

describe('InputService', () => {
  let mockInputController: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupInputController();

    // Setup basic mock for controller
    initInputController();
    mockInputController = (getInputController() as unknown) as any;
  });

  afterEach(() => {
    cleanupInputController();
  });

  test('initInputController initializes InputController', () => {
    expect(InputController).toHaveBeenCalled();
    expect(InputBindings).toHaveBeenCalledWith(DEFAULT_BINDINGS);
  });

  test('generateUserCommand calls buildCommand on controller', () => {
    const cmd = generateUserCommand(16);
    expect(mockInputController.buildCommand).toHaveBeenCalledWith(16);
    expect(cmd).toBeDefined();
  });

  test('input handlers delegate to controller', () => {
    // We need to simulate events
    const keyEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
    window.dispatchEvent(keyEvent);
    expect(mockInputController.handleKeyDown).toHaveBeenCalledWith('KeyW', expect.any(Number));

    const mouseClick = new MouseEvent('mousedown', { button: 0 });
    window.dispatchEvent(mouseClick);
    expect(mockInputController.handleMouseButtonDown).toHaveBeenCalledWith(0, expect.any(Number));
  });

  test('input handlers do not fire when not in game mode', () => {
    setInputMode('menu');

    const keyEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
    window.dispatchEvent(keyEvent);
    expect(mockInputController.handleKeyDown).not.toHaveBeenCalled();
  });

  test('mouse move only processed when pointer locked', () => {
    // Mock document.pointerLockElement
    Object.defineProperty(document, 'pointerLockElement', {
      value: document.body,
      configurable: true
    });

    // Manually trigger the listener logic since MouseEvent constructor options like movementX
    // might not populate the event object correctly in all JSDOM environments without overrides
    // or the listener might be reading it differently.
    // Instead we can just dispatch an event with the properties directly on it if JSDOM allows,
    // or wrap the creation.
    // However, TypeScript might complain if we just cast it.

    // In JSDOM, MouseEvent might not fully support movementX/Y in the constructor in older versions,
    // but let's try defining getter if needed or check if the event actually had it.

    const mouseMove = new MouseEvent('mousemove', { bubbles: true });
    Object.defineProperties(mouseMove, {
        movementX: { value: 10 },
        movementY: { value: 5 }
    });

    window.dispatchEvent(mouseMove);
    expect(mockInputController.handleMouseMove).toHaveBeenCalledWith(10, 5);

    // Now test without pointer lock
    Object.defineProperty(document, 'pointerLockElement', {
      value: null,
      configurable: true
    });

    window.dispatchEvent(mouseMove);
    expect(mockInputController.handleMouseMove).toHaveBeenCalledTimes(1); // Still 1 from before
  });

  test('cleanupInputController removes listeners and clears controller', () => {
    cleanupInputController();
    expect(getInputController()).toBeNull();

    // Verify events don't trigger anything (though we can't easily spy on removed listeners,
    // we can verify no calls happen on cached controller ref if we kept it,
    // but here we just check global state is null)

    const cmd = generateUserCommand(16);
    // Should return empty/default command
    expect(cmd.forwardmove).toBe(0);
  });
});
