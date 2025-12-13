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
      simulate: (deltaMs: number) => {
        simulate(deltaMs);
      },
      render: (alpha: number) => {
        render(alpha);
      }
    },
    {
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
