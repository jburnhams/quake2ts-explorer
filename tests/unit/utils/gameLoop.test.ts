
import { createGameLoop } from '@/src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

jest.mock('quake2ts/engine', () => ({
  FixedTimestepLoop: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    pump: jest.fn(),
    isRunning: jest.fn().mockReturnValue(true)
  }))
}));

describe('GameLoop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
       return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
       clearTimeout(id);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create and start loop', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();

    expect(FixedTimestepLoop).toHaveBeenCalled();
    const mockLoop = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
    expect(mockLoop.start).toHaveBeenCalled();

    // Advance timer to trigger RAF
    jest.advanceTimersByTime(20);
    expect(mockLoop.pump).toHaveBeenCalled();
  });

  it('should not start multiple loops', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
    rafSpy.mockClear();

    loop.start();

    // Should not call RAF again immediately
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('should stop loop', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();
    loop.stop();

    const mockLoop = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
    expect(mockLoop.stop).toHaveBeenCalled();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('should pause and resume loop', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);
    const mockLoop = (FixedTimestepLoop as jest.Mock).mock.results[0].value;

    loop.start();
    jest.advanceTimersByTime(20);
    expect(mockLoop.pump).toHaveBeenCalledTimes(1);

    loop.pause();
    mockLoop.pump.mockClear();
    jest.advanceTimersByTime(20);
    expect(mockLoop.pump).not.toHaveBeenCalled(); // Should not pump when paused

    loop.resume();
    // Resume restarts internal loop
    expect(mockLoop.stop).toHaveBeenCalled();
    expect(mockLoop.start).toHaveBeenCalledTimes(2); // Initial start + resume start

    jest.advanceTimersByTime(20);
    expect(mockLoop.pump).toHaveBeenCalled();
  });

  it('should execute simulation and render callbacks', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    createGameLoop(simulate, render);

    // Get the config passed to FixedTimestepLoop
    const config = (FixedTimestepLoop as jest.Mock).mock.calls[0][0];

    // Call them
    config.simulate({});
    expect(simulate).toHaveBeenCalled();

    config.render({});
    expect(render).toHaveBeenCalled();
  });
});
