
import { initInputController, cleanupInputController, generateUserCommand, setInputMode, getInputController } from '@/src/services/inputService';
import { InputController, InputBindings } from '@quake2ts/client';

// Mock quake2ts/client
vi.mock('@quake2ts/client', () => {
    const mockInputController = {
        handleKeyDown: vi.fn(),
        handleKeyUp: vi.fn(),
        handleMouseButtonDown: vi.fn(),
        handleMouseButtonUp: vi.fn(),
        handleMouseMove: vi.fn(),
        buildCommand: vi.fn().mockReturnValue({ buttons: 0 }),
        getDefaultBindings: vi.fn().mockReturnValue({
            getBinding: vi.fn().mockReturnValue(null)
        })
    };
    return {
        InputController: vi.fn().mockImplementation(() => mockInputController),
        InputBindings: vi.fn().mockImplementation(() => ({}))
    };
});

describe('InputService', () => {
    let mockController: any;

    beforeEach(() => {
        vi.clearAllMocks();
        cleanupInputController();
        // Initialize to get the mock instance
        initInputController();
        mockController = (InputController as unknown as vi.Mock).mock.results[0].value;
        // Reset call counts from init
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanupInputController();
    });

    it('should initialize input controller', () => {
        // Need to clear mocks and re-init to capture call
        vi.clearAllMocks();
        cleanupInputController();

        initInputController();
        expect(InputController).toHaveBeenCalled();
        expect(getInputController()).toBeDefined();
    });

    it('should cleanup input controller', () => {
        cleanupInputController();
        expect(getInputController()).toBeNull();
    });

    it('should handle key events in game mode', () => {
        initInputController();

        const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
        window.dispatchEvent(keyDown);
        expect(mockController.handleKeyDown).toHaveBeenCalledWith('KeyW', expect.any(Number));

        const keyUp = new KeyboardEvent('keyup', { code: 'KeyW' });
        window.dispatchEvent(keyUp);
        expect(mockController.handleKeyUp).toHaveBeenCalledWith('KeyW', expect.any(Number));
    });

    it('should prevent default on bound keys', () => {
        initInputController();

        mockController.getDefaultBindings().getBinding.mockReturnValue('some_command');

        const keyDown = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
        const spy = vi.spyOn(keyDown, 'preventDefault');
        window.dispatchEvent(keyDown);

        expect(spy).toHaveBeenCalled();
    });

    it('should ignore events when not in game mode (or disabled)', () => {
        // Technically setInputMode controls 'isGameMode' flag which defaults to true on init.
        // Let's toggle it.
        setInputMode('menu');

        const keyDown = new KeyboardEvent('keydown', { code: 'KeyW' });
        window.dispatchEvent(keyDown);
        expect(mockController.handleKeyDown).not.toHaveBeenCalled();
    });

    it('should ignore F-keys', () => {
        initInputController();

        const f5 = new KeyboardEvent('keydown', { code: 'F5' });
        window.dispatchEvent(f5);
        expect(mockController.handleKeyDown).not.toHaveBeenCalled();
    });

    it('should handle mouse button events', () => {
        initInputController();

        const mouseDown = new MouseEvent('mousedown', { button: 0 });
        window.dispatchEvent(mouseDown);
        expect(mockController.handleMouseButtonDown).toHaveBeenCalledWith(0, expect.any(Number));

        const mouseUp = new MouseEvent('mouseup', { button: 0 });
        window.dispatchEvent(mouseUp);
        expect(mockController.handleMouseButtonUp).toHaveBeenCalledWith(0, expect.any(Number));
    });

    it('should handle mouse move events ONLY when pointer is locked', () => {
        initInputController();

        // Helper to create valid mouse event with movement
        const createMoveEvent = (x: number, y: number) => {
            const event = new MouseEvent('mousemove');
            // JSDOM MouseEvent doesn't support movementX/Y in constructor args correctly
            Object.defineProperty(event, 'movementX', { value: x });
            Object.defineProperty(event, 'movementY', { value: y });
            return event;
        };

        // Simulate unlocked
        Object.defineProperty(document, 'pointerLockElement', { value: null, writable: true });
        window.dispatchEvent(createMoveEvent(10, 5));
        expect(mockController.handleMouseMove).not.toHaveBeenCalled();

        // Simulate locked
        Object.defineProperty(document, 'pointerLockElement', { value: document.body, writable: true });
        window.dispatchEvent(createMoveEvent(10, 5));
        expect(mockController.handleMouseMove).toHaveBeenCalledWith(10, 5);
    });

    it('should generate user commands', () => {
        initInputController();
        const cmd = generateUserCommand(16);
        expect(mockController.buildCommand).toHaveBeenCalledWith(16);
        expect(cmd).toBeDefined();
    });

    it('should return empty command if not initialized', () => {
        cleanupInputController();
        const cmd = generateUserCommand(16);
        expect(cmd.msec).toBe(16);
        expect(cmd.buttons).toBe(0);
        // Verify it didn't crash
    });
});
