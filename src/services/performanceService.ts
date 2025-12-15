export class FpsCounter {
    private frames: number[] = [];
    private lastTime: number = 0;
    private readonly windowSize: number = 100;
    private hasStarted: boolean = false;

    constructor(windowSize: number = 100) {
        this.windowSize = windowSize;
    }

    update(time: number): void {
        if (!this.hasStarted) {
            this.lastTime = time;
            this.hasStarted = true;
            return;
        }

        const delta = time - this.lastTime;

        // Prevent division by zero or negative delta
        if (delta <= 0) return;

        this.lastTime = time;

        const fps = 1000 / delta;
        this.frames.push(fps);

        if (this.frames.length > this.windowSize) {
            this.frames.shift();
        }
    }

    getAverageFps(): number {
        if (this.frames.length === 0) return 0;
        const sum = this.frames.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.frames.length);
    }

    getMinFps(): number {
        if (this.frames.length === 0) return 0;
        return Math.round(Math.min(...this.frames));
    }

    getMaxFps(): number {
        if (this.frames.length === 0) return 0;
        return Math.round(Math.max(...this.frames));
    }

    reset(): void {
        this.frames = [];
        this.lastTime = 0;
        this.hasStarted = false;
    }
}

export const performanceService = {
    now: () => performance.now(),
    createFpsCounter: (windowSize?: number) => new FpsCounter(windowSize),

    startMeasure: (name: string): void => {
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark(`${name}-start`);
        }
    },

    endMeasure: (name: string, measureName?: string): void => {
        if (typeof performance === 'undefined') return;

        const startMark = `${name}-start`;
        const endMark = `${name}-end`;

        if (performance.mark) {
            performance.mark(endMark);
        }

        try {
            if (performance.measure) {
                performance.measure(measureName || name, startMark, endMark);
            }
        } catch (e) {
            // Ignore errors if marks are missing (e.g. if startMeasure wasn't called)
            console.warn(`Failed to measure ${name}:`, e);
        }
    }
};
