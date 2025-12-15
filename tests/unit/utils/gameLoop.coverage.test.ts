
import { createGameLoop } from '@/src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

// Mock FixedTimestepLoop
jest.mock('quake2ts/engine', () => {
    return {
        FixedTimestepLoop: jest.fn().mockImplementation(() => ({
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn().mockReturnValue(true),
            pump: jest.fn()
        }))
    };
});

describe('GameLoop Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should create a game loop with default options', () => {
        const loop = createGameLoop(() => {}, () => {});
        expect(loop).toBeDefined();
        // It passes 2 args: callbacks object and options object
        expect(FixedTimestepLoop).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });

    it('should start and pump loop', () => {
        const loop = createGameLoop(() => {}, () => {});
        const mockInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;

        loop.start();
        expect(mockInstance.start).toHaveBeenCalled();

        // Trigger frame
        jest.runOnlyPendingTimers(); // requestAnimationFrame
        expect(mockInstance.pump).toHaveBeenCalled();
    });

    it('should stop loop', () => {
        const loop = createGameLoop(() => {}, () => {});
        loop.start();
        loop.stop();

        const mockInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
        expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('should pause and resume', () => {
        const loop = createGameLoop(() => {}, () => {});
        const mockInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;

        loop.start();

        loop.pause();
        jest.runOnlyPendingTimers();
        // When paused, pump should NOT be called again?
        // Logic says: if isPaused, do not pump.
        mockInstance.pump.mockClear();
        jest.runOnlyPendingTimers();
        expect(mockInstance.pump).not.toHaveBeenCalled();

        loop.resume();
        expect(mockInstance.stop).toHaveBeenCalled(); // Resume restarts internal loop
        expect(mockInstance.start).toHaveBeenCalledTimes(2); // Start called again
    });

    it('should configure deltaMs', () => {
        createGameLoop(() => {}, () => {}, 20); // 20Hz = 50ms
        const options = (FixedTimestepLoop as jest.Mock).mock.calls[0][1];
        expect(options.fixedDeltaMs).toBe(1000/20);
    });

    it('should execute callbacks via engine wrapper', () => {
        const simulate = jest.fn();
        const render = jest.fn();

        createGameLoop(simulate, render);

        const callbacks = (FixedTimestepLoop as jest.Mock).mock.calls[0][0];

        callbacks.simulate({ delta: 16, now: 1000 });
        expect(simulate).toHaveBeenCalled();

        callbacks.render({ alpha: 0.5 });
        expect(render).toHaveBeenCalled();
    });
});
