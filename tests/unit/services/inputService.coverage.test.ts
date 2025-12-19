import { initInputController, cleanupInputController, generateUserCommand, getInputController, setInputMode } from '../../../src/services/inputService';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

jest.mock('quake2ts/client', () => {
    const { jest } = require('@jest/globals');
    return {
        InputController: jest.fn().mockImplementation(() => ({
            handleKeyDown: jest.fn(),
            handleKeyUp: jest.fn(),
            handleMouseButtonDown: jest.fn(),
            handleMouseButtonUp: jest.fn(),
            handleMouseMove: jest.fn(),
            buildCommand: jest.fn(() => ({ buttons: 1 })), // Mock command
            getDefaultBindings: jest.fn(() => ({
                getBinding: jest.fn((code) => code === 'Space') // Return true for bound key
            }))
        })),
        InputBindings: jest.fn()
    };
});

describe('InputService Coverage', () => {
    let mockController: any;

    beforeEach(() => {
        cleanupInputController();
        jest.clearAllMocks();
    });

    afterEach(() => {
        cleanupInputController();
    });

    it('initializes and cleans up', () => {
        initInputController();
        expect(getInputController()).toBeDefined();
        cleanupInputController();
        expect(getInputController()).toBeNull();
    });

    it('handles keyboard events', () => {
        initInputController();
        mockController = getInputController();

        const downEvent = new KeyboardEvent('keydown', { code: 'Space' });
        const preventDefaultSpy = jest.spyOn(downEvent, 'preventDefault');
        window.dispatchEvent(downEvent);
        expect(mockController.handleKeyDown).toHaveBeenCalledWith('Space', expect.any(Number));
        expect(preventDefaultSpy).toHaveBeenCalled(); // Bound key prevents default

        const upEvent = new KeyboardEvent('keyup', { code: 'Space' });
        window.dispatchEvent(upEvent);
        expect(mockController.handleKeyUp).toHaveBeenCalledWith('Space', expect.any(Number));
    });

    it('handles mouse events', () => {
        initInputController();
        mockController = getInputController();

        const downEvent = new MouseEvent('mousedown', { button: 0 });
        window.dispatchEvent(downEvent);
        expect(mockController.handleMouseButtonDown).toHaveBeenCalledWith(0, expect.any(Number));

        const upEvent = new MouseEvent('mouseup', { button: 0 });
        window.dispatchEvent(upEvent);
        expect(mockController.handleMouseButtonUp).toHaveBeenCalledWith(0, expect.any(Number));
    });

    it('handles mouse move when locked', () => {
        initInputController();
        mockController = getInputController();

        // Mock pointer lock
        Object.defineProperty(document, 'pointerLockElement', { value: document.body, configurable: true });

        const moveEvent = new MouseEvent('mousemove');
        Object.defineProperty(moveEvent, 'movementX', { value: 10 });
        Object.defineProperty(moveEvent, 'movementY', { value: 5 });
        window.dispatchEvent(moveEvent);
        expect(mockController.handleMouseMove).toHaveBeenCalledWith(10, 5);

        // Remove lock
        Object.defineProperty(document, 'pointerLockElement', { value: null, configurable: true });

        const moveEvent2 = new MouseEvent('mousemove');
        Object.defineProperty(moveEvent2, 'movementX', { value: 10 });
        Object.defineProperty(moveEvent2, 'movementY', { value: 5 });
        window.dispatchEvent(moveEvent2);
        expect(mockController.handleMouseMove).toHaveBeenCalledTimes(1); // Not called again
    });

    it('generates user command', () => {
        initInputController();
        const cmd = generateUserCommand(16);
        expect(cmd).toEqual({ buttons: 1 });
    });

    it('generates dummy command if not initialized', () => {
        cleanupInputController();
        const cmd = generateUserCommand(16);
        expect(cmd.msec).toBe(16);
        expect(cmd.buttons).toBe(0);
    });

    it('handles setInputMode', () => {
        initInputController();
        mockController = getInputController();

        setInputMode('menu');
        // Trigger event, should be ignored
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        expect(mockController.handleKeyDown).not.toHaveBeenCalled();

        setInputMode('game');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        expect(mockController.handleKeyDown).toHaveBeenCalled();
    });

    it('ignores F-keys', () => {
        initInputController();
        mockController = getInputController();

        const f5 = new KeyboardEvent('keydown', { code: 'F5' });
        window.dispatchEvent(f5);
        expect(mockController.handleKeyDown).not.toHaveBeenCalled();
    });
});
