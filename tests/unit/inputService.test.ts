import { getInputService, resetInputService } from '../../src/services/inputService';
import { InputController } from 'quake2ts/client';

// Mock InputController
const mockHandleKeyDown = jest.fn();
const mockHandleKeyUp = jest.fn();
const mockHandleMouseButtonDown = jest.fn();
const mockHandleMouseButtonUp = jest.fn();
const mockHandleMouseMove = jest.fn();
const mockBuildCommand = jest.fn().mockReturnValue({});

jest.mock('quake2ts/client', () => {
  return {
    InputController: jest.fn().mockImplementation(() => {
        return {
          handleKeyDown: mockHandleKeyDown,
          handleKeyUp: mockHandleKeyUp,
          handleMouseButtonDown: mockHandleMouseButtonDown,
          handleMouseButtonUp: mockHandleMouseButtonUp,
          handleMouseMove: mockHandleMouseMove,
          buildCommand: mockBuildCommand,
        };
    }),
    InputBindings: jest.fn()
  };
});

// Mock DOM events
class MockKeyboardEvent extends Event {
  code: string;
  constructor(type: string, options: any) {
    super(type, options);
    this.code = options.code;
  }
}

class MockMouseEvent extends Event {
  button: number;
  movementX: number;
  movementY: number;
  constructor(type: string, options: any) {
    super(type, options);
    this.button = options.button || 0;
    this.movementX = options.movementX || 0;
    this.movementY = options.movementY || 0;
  }
}

describe('InputService', () => {
  let inputService: any;

  beforeEach(() => {
    resetInputService();
    jest.clearAllMocks(); // This clears the calls to mockHandleKeyDown etc.

    inputService = getInputService();
    inputService.init();
  });

  afterEach(() => {
      inputService.shutdown();
  });

  it('should initialize and listen to events', () => {
    inputService.shutdown();
    const addSpy = jest.spyOn(window, 'addEventListener');
    inputService.init();
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
  });

  it('should handle key events', () => {
    inputService.setActive(true);

    const event = new MockKeyboardEvent('keydown', { code: 'KeyW' });
    window.dispatchEvent(event);

    expect(mockHandleKeyDown).toHaveBeenCalledWith('KeyW');
  });

  it('should generate user command', () => {
    inputService.setActive(true);

    inputService.generateUserCommand(16, 1000);
    expect(mockBuildCommand).toHaveBeenCalledWith(16, 1000);
  });

  it('should ignore events when inactive', () => {
    inputService.setActive(false);
    mockHandleKeyDown.mockClear();

    const event = new MockKeyboardEvent('keydown', { code: 'KeyW' });
    window.dispatchEvent(event);

    expect(mockHandleKeyDown).not.toHaveBeenCalled();
  });
});
