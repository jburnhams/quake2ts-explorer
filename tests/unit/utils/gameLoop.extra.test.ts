import { createGameLoop } from '../../../src/utils/gameLoop';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let capturedOpts: any;
let capturedConfig: any;
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockIsRunning = jest.fn();
const mockPump = jest.fn();

jest.mock('quake2ts/engine', () => {
    const { jest } = require('@jest/globals');
    return {
        FixedTimestepLoop: jest.fn().mockImplementation((opts, config) => {
            capturedOpts = opts;
            capturedConfig = config;
            return {
                start: mockStart,
                stop: mockStop,
                isRunning: mockIsRunning,
                pump: mockPump
            };
        })
    };
});

// Need to mock RAF too because createGameLoop calls it
const mockRaf = jest.fn((cb: any) => 123);
const mockCancelRaf = jest.fn();
global.requestAnimationFrame = mockRaf as any;
global.cancelAnimationFrame = mockCancelRaf as any;

describe('gameLoop extra coverage', () => {
    beforeAll(() => {
        // @ts-ignore
        if (!global.performance) global.performance = {};
        // @ts-ignore
        if (!global.performance.now) global.performance.now = () => 0;

        jest.spyOn(global.performance, 'now').mockReturnValue(1000);
    });
    let simulate: any;
    let render: any;

    beforeEach(() => {
        capturedOpts = null;
        capturedConfig = null;
        simulate = jest.fn();
        render = jest.fn();
        jest.clearAllMocks();
        mockIsRunning.mockReturnValue(false);
    });

    it('delegates isRunning to the loop', () => {
        const loop = createGameLoop(simulate, render);
        mockIsRunning.mockReturnValue(true);
        expect(loop.isRunning()).toBe(true);
        expect(mockIsRunning).toHaveBeenCalled();
    });

    it('invokes internal options (now, schedule)', () => {
        createGameLoop(simulate, render);
        expect(capturedConfig).toBeDefined();

        // Cover 'now' callback
        const time = capturedConfig.now();
        expect(global.performance.now).toHaveBeenCalled();
        expect(time).toBe(1000);

        // Cover 'schedule' callback
        const cb = jest.fn();
        capturedConfig.schedule(cb);
        expect(mockRaf).toHaveBeenCalledWith(cb);
    });
});
