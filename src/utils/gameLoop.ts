import {
  FixedTimestepLoop,
  type FixedStepContext,
  type RenderContext
} from '@quake2ts/engine';

export interface GameLoop {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  pause(): void;
  resume(): void;
}

/**
 * Creates a game loop using the engine's FixedTimestepLoop.
 *
 * @param simulate Callback for game simulation. Receives FixedStepContext.
 * @param render Callback for rendering. Receives RenderContext.
 * @param tickRate Optional tick rate in Hz (default 40).
 */
export function createGameLoop(
  simulate: (step: FixedStepContext) => void,
  render: (context: RenderContext) => void,
  tickRate: number = 40
): GameLoop {
  const loop = new FixedTimestepLoop(
    {
      simulate: (step) => simulate(step),
      render: (context) => render(context)
    },
    {
      fixedDeltaMs: 1000 / tickRate,
      maxSubSteps: 10,
      maxDeltaMs: 250,
      now: () => performance.now(),
      schedule: (cb) => requestAnimationFrame(cb)
    }
  );

  let rafId: number | null = null;
  let isPaused = false;

  const frame = (now: number) => {
      if (isPaused) {
         // Pause logic: do not pump
      } else {
        loop.pump(now);
      }

      if (loop.isRunning() || isPaused) {
          rafId = requestAnimationFrame(frame);
      }
  };

  return {
    start: () => {
        if (rafId !== null) return; // Already running

        loop.start();
        isPaused = false;
        rafId = requestAnimationFrame(frame);
    },
    stop: () => {
        loop.stop();
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    },
    isRunning: () => loop.isRunning(),
    pause: () => {
        isPaused = true;
    },
    resume: () => {
        if (isPaused) {
            isPaused = false;
            // Restart internal loop to reset accumulation
            loop.stop();
            loop.start();
        }
    }
  };
}
