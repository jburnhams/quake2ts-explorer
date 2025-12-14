// src/utils/gameLoop.ts
import { FixedTimestepLoop } from 'quake2ts/engine';

export interface GameLoop {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

export function createGameLoop(
  simulate: (deltaMs: number) => void,
  render: (alpha: number) => void
): GameLoop {
  // We use FixedTimestepLoop from engine which handles the RAF loop
  // and fixed timestep accumulation.
  const loop = new FixedTimestepLoop(
    {
      // @ts-ignore
      simulate: (context: any) => {
          const delta = typeof context === 'number' ? context : context.intervalMs || 16;
          simulate(delta);
      },
      // @ts-ignore
      render: (context: any) => {
          const alpha = typeof context === 'number' ? context : context.alpha || 0;
          render(alpha);
      }
    },
    // @ts-ignore - tickRate might be named differently or not part of Partial<LoopOptions> in this version
    {
      // @ts-ignore
      tickRate: 40, // 40Hz physics
      startTimeMs: performance.now()
    }
  );

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    isRunning: () => loop.isRunning()
  };
}
