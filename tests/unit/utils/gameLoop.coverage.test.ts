import { createGameLoop } from '@/src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

jest.mock('quake2ts/engine', () => {
    return {
        FixedTimestepLoop: jest.fn().mockImplementation((callbacks, options) => {
            return {
                start: jest.fn(),
                stop: jest.fn(),
                pump: jest.fn(),
                isRunning: jest.fn().mockReturnValue(true)
            };
        })
    };
});

describe('GameLoop Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            return setTimeout(() => cb(performance.now()), 16) as unknown as number;
        });
        jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
            clearTimeout(id);
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should start and pump loop', () => {
        const loop = createGameLoop(() => {}, () => {});
        loop.start();

        const mockInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
        expect(mockInstance.pump).not.toHaveBeenCalled();

        // Trigger frame
        jest.runOnlyPendingTimers(); // requestAnimationFrame
        expect(mockInstance.pump).toHaveBeenCalled();
    });

    it('should stop loop', () => {
        const loop = createGameLoop(() => {}, () => {});
        loop.start();
        loop.stop();

        expect(window.cancelAnimationFrame).toHaveBeenCalled();
        const mockInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
        expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('should pause and resume', () => {
        const loop = createGameLoop(() => {}, () => {});
        loop.start();

        // Trigger frame to ensure running
        jest.runOnlyPendingTimers();
        const mockInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
        mockInstance.pump.mockClear();

        loop.pause();
        expect(window.cancelAnimationFrame).toHaveBeenCalled();

        // Pump should not be called after pause
        jest.runOnlyPendingTimers();
        expect(mockInstance.pump).not.toHaveBeenCalled();

        loop.resume();
        // Resume restarts internal loop
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
        callbacks.simulate({ deltaMs: 16 });
        expect(simulate).toHaveBeenCalledWith({ deltaMs: 16 });

        callbacks.render({ alpha: 0.5 });
        expect(render).toHaveBeenCalledWith({ alpha: 0.5 });
    });
});
