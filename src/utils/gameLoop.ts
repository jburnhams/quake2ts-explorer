import { FixedTimestepLoop, FixedStepContext, RenderContext } from 'quake2ts/engine';

export interface GameLoop {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  isRunning(): boolean;
  isPaused(): boolean;
}

export function createGameLoop(
  simulate: (context: FixedStepContext) => void,
  render: (context: RenderContext) => void,
  frequency: number = 40
): GameLoop {

  // Create callbacks object for FixedTimestepLoop
  const callbacks = {
    simulate,
    render
  };

  // Configure loop
  const options = {
    fixedDeltaMs: 1000 / frequency,
    maxSubSteps: 10, // Prevent spiral of death
    maxDeltaMs: 250 // Max accumulated time per frame
  };

  // Instantiate the engine loop
  const loop = new FixedTimestepLoop(callbacks, options);

  let paused = false;
  let rafId: number | null = null;

  const pump = (now: number) => {
      loop.pump(now);
      if (!paused && rafId !== null) {
          rafId = requestAnimationFrame(pump);
      }
  };

  const wrapper: GameLoop = {
    start() {
        if (paused) {
            paused = false;
        } else {
            loop.start();
        }

        if (rafId === null) {
            rafId = requestAnimationFrame(pump);
        }
    },
    stop() {
        loop.stop();
        paused = false;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    },
    pause() {
        paused = true;
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    },
    resume() {
        if (paused) {
            paused = false;
            // Resume RAF
            if (rafId === null) {
                // Resume loop accumulator logic
                loop.start(); // Resets lastTimeMs to now
                rafId = requestAnimationFrame(pump);
            }
        }
    },
    isRunning() {
        return rafId !== null;
    },
    isPaused() {
        return paused;
    }
  };

  return wrapper;
}
