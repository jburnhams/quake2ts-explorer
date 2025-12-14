import { FixedTimestepLoop, type FixedStepContext } from 'quake2ts/engine';

export interface GameLoop {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  pause(): void;
  resume(): void;
}

export function createGameLoop(
  simulate: (step: FixedStepContext) => void,
  render: (alpha: number) => void,
  tickRate: number = 40
): GameLoop {
  let paused = false;

  // Wrapper for simulate to handle pause
  const wrappedSimulate = (step: FixedStepContext) => {
    if (!paused) {
      simulate(step);
    }
  };

  // Wrapper for render to handle pause
  const wrappedRender = (context: any) => {
      // context is RenderContext { alpha, nowMs, ... }
      render(context.alpha);
  };

  // FixedTimestepLoop from quake2ts/engine
  const loop = new FixedTimestepLoop(
    {
      simulate: wrappedSimulate,
      render: wrappedRender
    },
    {
      fixedDeltaMs: 1000 / tickRate, // tickRate is Hz, need ms
      startTimeMs: performance.now(),
      now: () => performance.now(),
      schedule: (cb) => requestAnimationFrame(cb)
    }
  );

  return {
    start: () => {
      paused = false;
      loop.start();
    },
    stop: () => {
      loop.stop();
    },
    isRunning: () => {
      return loop.isRunning();
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    }
  };
}
