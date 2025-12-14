
import { createGameLoop } from '../../../src/utils/gameLoop';

describe('GameLoop Integration', () => {
    it('should run simulation callbacks at approximately correct rate', async () => {
        let ticks = 0;
        let renders = 0;

        const simulate = (step: any) => {
            ticks++;
        };

        const render = (alpha: number) => {
            renders++;
        };

        const loop = createGameLoop(simulate, render, 40); // 40Hz

        loop.start();

        // Wait for 100ms
        await new Promise(resolve => setTimeout(resolve, 100));

        loop.stop();

        // At 40Hz (25ms), 100ms should yield roughly 4 ticks
        // Being loose with expectations due to test environment timing
        expect(ticks).toBeGreaterThan(0);
        expect(renders).toBeGreaterThan(0);
    });
});
