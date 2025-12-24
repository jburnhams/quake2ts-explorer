
import { createGameLoop } from '@/src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

vi.mock('quake2ts/engine', () => ({
  FixedTimestepLoop: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pump: vi.fn(),
    isRunning: vi.fn().mockReturnValue(true)
  }))
}));

describe('GameLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
       return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
       clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create and start loop', () => {
    const simulate = vi.fn();
    const render = vi.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();

    expect(FixedTimestepLoop).toHaveBeenCalled();
    const mockLoop = (FixedTimestepLoop as vi.Mock).mock.results[0].value;
    expect(mockLoop.start).toHaveBeenCalled();

    // Advance timer to trigger RAF
    vi.advanceTimersByTime(20);
    expect(mockLoop.pump).toHaveBeenCalled();
  });

  it('should not start multiple loops', () => {
    const simulate = vi.fn();
    const render = vi.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    rafSpy.mockClear();

    loop.start();

    // Should not call RAF again immediately
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('should stop loop', () => {
    const simulate = vi.fn();
    const render = vi.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();
    loop.stop();

    const mockLoop = (FixedTimestepLoop as vi.Mock).mock.results[0].value;
    expect(mockLoop.stop).toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should pause and resume loop', () => {
    const simulate = vi.fn();
    const render = vi.fn();
    const loop = createGameLoop(simulate, render);
    const mockLoop = (FixedTimestepLoop as vi.Mock).mock.results[0].value;

    loop.start();
    vi.advanceTimersByTime(20);
    expect(mockLoop.pump).toHaveBeenCalledTimes(1);

    loop.pause();
    mockLoop.pump.mockClear();
    vi.advanceTimersByTime(20);
    expect(mockLoop.pump).not.toHaveBeenCalled(); // Should not pump when paused

    loop.resume();
    // Resume restarts internal loop
    expect(mockLoop.stop).toHaveBeenCalled();
    expect(mockLoop.start).toHaveBeenCalledTimes(2); // Initial start + resume start

    vi.advanceTimersByTime(20);
    expect(mockLoop.pump).toHaveBeenCalled();
  });

  it('should execute simulation and render callbacks', () => {
    const simulate = vi.fn();
    const render = vi.fn();
    createGameLoop(simulate, render);

    // Get the config passed to FixedTimestepLoop
    const config = (FixedTimestepLoop as vi.Mock).mock.calls[0][0];

    // Call them
    config.simulate({});
    expect(simulate).toHaveBeenCalled();

    config.render({});
    expect(render).toHaveBeenCalled();
  });

  it('passes correct options to FixedTimestepLoop', () => {
    const simulate = vi.fn();
    const render = vi.fn();
    createGameLoop(simulate, render, 60);

    const options = (FixedTimestepLoop as vi.Mock).mock.calls[0][1];
    expect(options.fixedDeltaMs).toBeCloseTo(1000 / 60);

    // Test 'now'
    expect(options.now()).toBeDefined();

    // Test 'schedule'
    const cb = vi.fn();
    options.schedule(cb);
    expect(window.requestAnimationFrame).toHaveBeenCalledWith(cb);
  });
});
