import { initInputController, cleanupInputController, generateUserCommand, getInputController } from '@/src/services/inputService';
import { InputController, InputBindings } from 'quake2ts/client';

// Mock quake2ts dependencies
jest.mock('quake2ts/client', () => {
  return {
    InputController: jest.fn().mockImplementation(() => ({
      handleKeyDown: jest.fn(),
      handleKeyUp: jest.fn(),
      handleMouseButtonDown: jest.fn(),
      handleMouseButtonUp: jest.fn(),
      handleMouseMove: jest.fn(),
      buildCommand: jest.fn().mockReturnValue({
        msec: 0,
        buttons: 0,
        angles: { x: 0, y: 0, z: 0 },
        forwardmove: 0,
        sidemove: 0,
        upmove: 0
      })
    })),
    InputBindings: jest.fn()
  };
});

describe('inputService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupInputController();
  });

  afterEach(() => {
    cleanupInputController();
  });

  it('initializes InputController with bindings', () => {
    initInputController();
    expect(InputBindings).toHaveBeenCalled();
    expect(InputController).toHaveBeenCalled();
  });

  it('generates user command', () => {
    initInputController();
    const cmd = generateUserCommand(16);
    expect(getInputController()?.buildCommand).toHaveBeenCalledWith(16);
    expect(cmd).toBeDefined();
  });

  it('handles keyboard events', () => {
    initInputController();
    const controller = getInputController();

    const keyDownEvent = new KeyboardEvent('keydown', { code: 'KeyW' });
    window.dispatchEvent(keyDownEvent);
    expect(controller?.handleKeyDown).toHaveBeenCalledWith('KeyW', expect.any(Number));

    const keyUpEvent = new KeyboardEvent('keyup', { code: 'KeyW' });
    window.dispatchEvent(keyUpEvent);
    expect(controller?.handleKeyUp).toHaveBeenCalledWith('KeyW', expect.any(Number));
  });

  it('handles mouse events', () => {
    initInputController();
    const controller = getInputController();

    const mouseDownEvent = new MouseEvent('mousedown', { button: 0 });
    window.dispatchEvent(mouseDownEvent);
    expect(controller?.handleMouseButtonDown).toHaveBeenCalledWith(0, expect.any(Number));

    const mouseUpEvent = new MouseEvent('mouseup', { button: 0 });
    window.dispatchEvent(mouseUpEvent);
    expect(controller?.handleMouseButtonUp).toHaveBeenCalledWith(0, expect.any(Number));

    const mouseMoveEvent = new MouseEvent('mousemove');
    Object.defineProperties(mouseMoveEvent, {
      movementX: { value: 10 },
      movementY: { value: 20 }
    });
    window.dispatchEvent(mouseMoveEvent);
    expect(controller?.handleMouseMove).toHaveBeenCalledWith(10, 20);
  });

  it('cleans up event listeners', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    initInputController();
    expect(addSpy).toHaveBeenCalledTimes(5); // keydown, keyup, mousedown, mouseup, mousemove

    cleanupInputController();
    expect(removeSpy).toHaveBeenCalledTimes(5);
    expect(getInputController()).toBeNull();
  });
});
