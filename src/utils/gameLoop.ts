import { FixedTimestepLoop } from 'quake2ts/engine';

export interface GameLoop {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  getSimulationTime(): number;
}

export function createGameLoop(
  simulate: (deltaMs: number) => void,
  render: (alpha: number) => void
): GameLoop {
  const loop = new FixedTimestepLoop(
    {
      simulate,
      render,
    },
    {
      tickRate: 40,
      startTimeMs: performance.now(),
    }
  );

  return {
    start: () => loop.start(),
    stop: () => loop.stop(),
    isRunning: () => loop.isRunning(),
    getSimulationTime: () => loop.getSimulationTime(),
  };
}
