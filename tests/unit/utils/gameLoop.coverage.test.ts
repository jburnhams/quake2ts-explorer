import { createGameLoop } from '../../../src/utils/gameLoop';


// Mock requestAnimationFrame
const mockRaf = vi.fn((cb: any) => setTimeout(cb, 16));
const mockCancelRaf = vi.fn((id: any) => clearTimeout(id));
global.requestAnimationFrame = mockRaf as any;
global.cancelAnimationFrame = mockCancelRaf as any;

// Global mocks for FixedTimestepLoop methods to verify calls
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockIsRunning = vi.fn();
const mockPump = vi.fn();

let capturedOpts: any;

vi.mock('quake2ts/engine', () => {
    
    return {
        FixedTimestepLoop: vi.fn().mockImplementation((opts) => {
            capturedOpts = opts;
            return {
                start: mockStart,
                stop: mockStop,
                isRunning: mockIsRunning,
                pump: mockPump
            };
        })
    };
});

describe('createGameLoop', () => {
    let simulate: any;
    let render: any;

    beforeEach(() => {
        capturedOpts = null;
        simulate = vi.fn();
        render = vi.fn();
        vi.clearAllMocks();
        mockIsRunning.mockReturnValue(false);
    });

    it('creates a loop and starts it', () => {
        const loop = createGameLoop(simulate, render);
        loop.start();
        expect(mockStart).toHaveBeenCalled();
        expect(mockRaf).toHaveBeenCalled();
    });

    it('stops the loop', () => {
        const loop = createGameLoop(simulate, render);
        loop.start();
        loop.stop();
        expect(mockStop).toHaveBeenCalled();
        expect(mockCancelRaf).toHaveBeenCalled();
    });

    it('prevents multiple starts', () => {
        const loop = createGameLoop(simulate, render);
        loop.start();
        loop.start();
        expect(mockStart).toHaveBeenCalledTimes(1);
    });

    it('handles pause and resume', () => {
        const loop = createGameLoop(simulate, render);
        loop.start();

        loop.pause();
        // Trigger frame
        const frameCallback = mockRaf.mock.calls[0][0];
        frameCallback(performance.now());

        // Should NOT pump when paused
        expect(mockPump).not.toHaveBeenCalled();

        loop.resume();
        expect(mockStop).toHaveBeenCalled(); // Resume restarts internal loop
        expect(mockStart).toHaveBeenCalledTimes(2); // Initial start + resume start
    });

    it('pumps when running', () => {
        mockIsRunning.mockReturnValue(true);
        const loop = createGameLoop(simulate, render);
        loop.start();

        const frameCallback = mockRaf.mock.calls[0][0];
        frameCallback(performance.now());

        expect(mockPump).toHaveBeenCalled();
        expect(mockRaf).toHaveBeenCalledTimes(2); // Initial + next frame
    });

    it('wraps simulate and render callbacks', () => {
        createGameLoop(simulate, render);
        expect(capturedOpts).toBeDefined();

        // Call the wrappers
        capturedOpts.simulate({ deltaMs: 16 });
        expect(simulate).toHaveBeenCalledWith({ deltaMs: 16 });

        capturedOpts.render({ alpha: 0.5 });
        expect(render).toHaveBeenCalledWith({ alpha: 0.5 });
    });
});
