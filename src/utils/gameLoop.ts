import {
  FixedTimestepLoop
} from 'quake2ts/engine';

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
 * @param simulate Callback for game simulation. Receives deltaMs (usually 25ms).
 * @param render Callback for rendering. Receives alpha (interpolation factor 0..1).
 */
export function createGameLoop(
  simulate: (deltaMs: number) => void,
  render: (alpha: number) => void
): GameLoop {
  const loop = new FixedTimestepLoop(
    {
      simulate: (deltaMs) => simulate(deltaMs),
      render: (alpha) => render(alpha)
    },
    {
      tickRate: 40, // 40 Hz = 25ms
      startTimeMs: performance.now()
    }
  );

  let rafId: number | null = null;
  let isPaused = false;

  const frame = (now: number) => {
      if (isPaused) {
         // Even if paused, we might want to render (e.g. for UI or smooth transitions)?
         // For now, let's just keep the loop alive but not pump simulation.
         // Actually, if we want to pause game but keep rendering, we should pump but handle pause in simulation?
         // FixedTimestepLoop doesn't have pause.
         // Common pattern: loop.pump(now) is called, but we don't advance time if paused.
         // But loop.pump calculates dt based on now.

         // If we stop calling pump, time will jump when we resume.
         // The FixedTimestepLoop usually handles time accumulation.
         // If we stop calling it, then call it later with a much later `now`, it might try to catch up by running many simulation steps (spiral of death).

         // So for pause/resume, we might need to handle it by not calling pump and resetting the loop time on resume?
         // Or by calling stop/start on the loop object itself?
         // Engine's FixedTimestepLoop has stop() and start().
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
            // We might need to reset the loop time to avoid catching up?
            // FixedTimestepLoop usually resets on start(), but we are already started.
            // If we just continue pumping, `now` will be much larger than `lastTime`.
            // Ideally FixedTimestepLoop should have a way to reset time.
            // Assuming we just want to continue.
            // If the engine loop doesn't handle large gaps gracefully, we might need to restart it.
            // But let's assume for now we just resume.
            // To be safe, let's restart the internal loop to reset its timer.
            loop.stop();
            loop.start();
        }
    }
  };
}
