import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getInputService, resetInputService } from '../../src/services/inputService';
import { InputController, InputBindings } from 'quake2ts/client';
import { DEFAULT_BINDINGS } from '../../src/config/defaultBindings';

// Mock quake2ts/client
jest.mock('quake2ts/client', () => {
    return {
        InputController: jest.fn().mockImplementation(() => ({
            handleKeyDown: jest.fn(),
            handleKeyUp: jest.fn(),
            handleMouseButtonDown: jest.fn(),
            handleMouseButtonUp: jest.fn(),
            handleMouseMove: jest.fn(),
            buildCommand: jest.fn().mockReturnValue({ buttons: 0 }),
            getDefaultBindings: jest.fn().mockReturnValue({ getBinding: () => null })
        })),
        InputBindings: jest.fn().mockImplementation(() => ({
            getBinding: jest.fn()
        }))
    };
});

describe('InputService Bindings', () => {
    beforeEach(() => {
        resetInputService();
        (InputController as unknown as jest.Mock).mockClear();
        (InputBindings as unknown as jest.Mock).mockClear();
    });

    afterEach(() => {
        resetInputService();
    });

    it('should initialize with default bindings when no custom bindings provided', () => {
        getInputService();

        expect(InputBindings).toHaveBeenCalledTimes(1);
        expect(InputBindings).toHaveBeenCalledWith(DEFAULT_BINDINGS);
        expect(InputController).toHaveBeenCalledTimes(1);
    });

    it('should initialize with custom bindings when provided', () => {
        const customBindings = new InputBindings([]);

        getInputService(customBindings);

        expect(InputController).toHaveBeenCalledWith(
            expect.anything(),
            customBindings
        );
    });
});
