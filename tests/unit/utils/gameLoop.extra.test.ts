import { createGameLoop } from '../../../src/utils/gameLoop';


let capturedOpts: any;
let capturedConfig: any;
const mockStart = vi.fn();
const mockStop = vi.fn();
const mockIsRunning = vi.fn();
const mockPump = vi.fn();

vi.mock('@quake2ts/engine', () => {
    
    return {
        FixedTimestepLoop: vi.fn().mockImplementation((opts, config) => {
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
const mockRaf = vi.fn((cb: any) => 123);
const mockCancelRaf = vi.fn();
global.requestAnimationFrame = mockRaf as any;
global.cancelAnimationFrame = mockCancelRaf as any;

describe('gameLoop extra coverage', () => {
    beforeAll(() => {
        // @ts-ignore
        if (!global.performance) global.performance = {};
        // @ts-ignore
        if (!global.performance.now) global.performance.now = () => 0;

        vi.spyOn(global.performance, 'now').mockReturnValue(1000);
    });
    let simulate: any;
    let render: any;

    beforeEach(() => {
        capturedOpts = null;
        capturedConfig = null;
        simulate = vi.fn();
        render = vi.fn();
        vi.clearAllMocks();
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
        const cb = vi.fn();
        capturedConfig.schedule(cb);
        expect(mockRaf).toHaveBeenCalledWith(cb);
    });
});
