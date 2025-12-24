import { performanceService, FpsCounter } from '../../../src/services/performanceService';

describe('FpsCounter', () => {
    let fpsCounter: FpsCounter;

    beforeEach(() => {
        fpsCounter = performanceService.createFpsCounter();
    });

    it('should calculate average FPS correctly', () => {
        // Mock timestamps for 60 FPS (approx 16.6ms)
        const frameTime = 1000 / 60;
        let currentTime = 0;

        fpsCounter.update(currentTime); // Initialize

        for (let i = 0; i < 60; i++) {
            currentTime += frameTime;
            fpsCounter.update(currentTime);
        }

        const avg = fpsCounter.getAverageFps();
        expect(avg).toBeCloseTo(60, 0);
    });

    it('should reset properly', () => {
        fpsCounter.update(0);
        fpsCounter.update(16);
        expect(fpsCounter.getAverageFps()).toBeGreaterThan(0);

        fpsCounter.reset();
        expect(fpsCounter.getAverageFps()).toBe(0);
        expect(fpsCounter.getMinFps()).toBe(0);
        expect(fpsCounter.getMaxFps()).toBe(0);
    });

    it('should calculate min and max FPS', () => {
        fpsCounter.update(0); // init

        // 60 FPS frame (16.6ms)
        fpsCounter.update(16.6);

        // 30 FPS frame (33.3ms)
        fpsCounter.update(16.6 + 33.3);

        expect(fpsCounter.getMaxFps()).toBeCloseTo(60, -1);
        expect(fpsCounter.getMinFps()).toBeCloseTo(30, -1);
    });
});

describe('performanceService', () => {
    beforeAll(() => {
        // Setup performance API mocks
        Object.defineProperty(global, 'performance', {
            writable: true,
            value: {
                now: vi.fn(() => Date.now()),
                mark: vi.fn(),
                measure: vi.fn(),
            },
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should call performance.mark on startMeasure', () => {
        performanceService.startMeasure('test-op');
        expect(performance.mark).toHaveBeenCalledWith('test-op-start');
    });

    it('should call performance.mark and measure on endMeasure', () => {
        performanceService.endMeasure('test-op');
        expect(performance.mark).toHaveBeenCalledWith('test-op-end');
        expect(performance.measure).toHaveBeenCalledWith('test-op', 'test-op-start', 'test-op-end');
    });

    it('should handle custom measure name', () => {
        performanceService.endMeasure('test-op', 'custom-measure');
        expect(performance.measure).toHaveBeenCalledWith('custom-measure', 'test-op-start', 'test-op-end');
    });

    it('should gracefully handle measure errors', () => {
        (performance.measure as vi.Mock).mockImplementationOnce(() => {
            throw new Error('Invalid mark');
        });

        // Should not throw
        expect(() => {
            performanceService.endMeasure('invalid-op');
        }).not.toThrow();

        expect(performance.mark).toHaveBeenCalledWith('invalid-op-end');
    });
});
