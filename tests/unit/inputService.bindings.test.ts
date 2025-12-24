
import { initInputController, cleanupInputController } from '@/src/services/inputService';
import { InputController, InputBindings } from 'quake2ts/client';
import { DEFAULT_BINDINGS } from '@/src/config/defaultBindings';

// Mock quake2ts/client
vi.mock('quake2ts/client', () => {
    return {
        InputController: vi.fn().mockImplementation(() => ({
            handleKeyDown: vi.fn(),
            handleKeyUp: vi.fn(),
            handleMouseButtonDown: vi.fn(),
            handleMouseButtonUp: vi.fn(),
            handleMouseMove: vi.fn(),
            buildCommand: vi.fn().mockReturnValue({ buttons: 0 }),
            getDefaultBindings: vi.fn().mockReturnValue({ getBinding: () => null })
        })),
        InputBindings: vi.fn().mockImplementation(() => ({
            getBinding: vi.fn()
        }))
    };
});

describe('InputService Bindings', () => {
    beforeEach(() => {
        cleanupInputController();
        (InputController as unknown as vi.Mock).mockClear();
        (InputBindings as unknown as vi.Mock).mockClear();
    });

    afterEach(() => {
        cleanupInputController();
    });

    it('should initialize with default bindings when no custom bindings provided', () => {
        initInputController();

        expect(InputBindings).toHaveBeenCalledTimes(1);
        expect(InputBindings).toHaveBeenCalledWith(DEFAULT_BINDINGS);
        expect(InputController).toHaveBeenCalledTimes(1);
    });

    it('should initialize with custom bindings when provided', () => {
        const customBindings = [
            { code: 'KeyZ', command: '+attack' }
        ];

        initInputController(customBindings);

        expect(InputBindings).toHaveBeenCalledTimes(1);
        expect(InputBindings).toHaveBeenCalledWith(customBindings);
    });

    it('should handle binding conflicts by respecting the list order (last one wins implicitly via library behavior)', () => {
        // We verify that the service simply passes the list to the library.
        // The library is responsible for resolution, so we mock checking that the list is passed as-is.
        const conflictingBindings = [
            { code: 'KeyA', command: '+moveleft' },
            { code: 'KeyA', command: '+moveright' }
        ];

        initInputController(conflictingBindings);

        expect(InputBindings).toHaveBeenCalledWith(conflictingBindings);
    });
});
