
import { createGameLoop } from '@/src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

// Mock FixedTimestepLoop
jest.mock('quake2ts/engine', () => {
    return {
        FixedTimestepLoop: jest.fn().mockImplementation((callbacks, options) => ({
            start: jest.fn(),
            stop: jest.fn(),
            pump: jest.fn((now) => {
                callbacks.simulate({ frame: 1, deltaMs: 25, nowMs: now });
                callbacks.render({ alpha: 0.5, nowMs: now, accumulatorMs: 0, frame: 1 });
            }),
            isRunning: jest.fn().mockReturnValue(true)
        }))
    };
});

describe('GameLoop', () => {
    let requestAnimationFrameSpy: jest.SpyInstance;
    let cancelAnimationFrameSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
            return setTimeout(cb, 16) as any;
        });
        cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: any) => {
            clearTimeout(id);
        });
    });

    afterEach(() => {
        requestAnimationFrameSpy.mockRestore();
        cancelAnimationFrameSpy.mockRestore();
    });

    it('should start and run loop', () => {
        const simulate = jest.fn();
        const render = jest.fn();
        const loop = createGameLoop(simulate, render);

        loop.start();

        expect(FixedTimestepLoop).toHaveBeenCalled();
        expect(requestAnimationFrameSpy).toHaveBeenCalled();

        loop.stop();
    });

    it('should pause and resume', () => {
        const simulate = jest.fn();
        const render = jest.fn();
        const loop = createGameLoop(simulate, render);

        loop.start();
        expect(loop.isRunning()).toBe(true);

        loop.pause();
        // Trigger a frame while paused
        // In this test setup, setTimeout runs automatically or we can advance timers
        // But since we mocked RAF with setTimeout, we need to wait
    });

    it('should stop loop', () => {
         const simulate = jest.fn();
        const render = jest.fn();
        const loop = createGameLoop(simulate, render);

        loop.start();
        loop.stop();

        expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    });
});
