
import { createGameLoop } from '../../../src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

jest.mock('quake2ts/engine', () => {
    return {
        FixedTimestepLoop: jest.fn().mockImplementation((callbacks, options) => {
            return {
                start: jest.fn(),
                stop: jest.fn(),
                pump: jest.fn(),
                isRunning: jest.fn().mockReturnValue(true),
                callbacks, // Expose for testing
            };
        })
    };
});

describe('GameLoop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should create and start loop', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);

    loop.start();

    expect(FixedTimestepLoop).toHaveBeenCalled();
    const mockLoopInstance = (FixedTimestepLoop as any).mock.results[0].value;
    expect(mockLoopInstance.start).toHaveBeenCalled();
  });

  it('should stop loop', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);

    loop.stop();

    const mockLoopInstance = (FixedTimestepLoop as any).mock.results[0].value;
    expect(mockLoopInstance.stop).toHaveBeenCalled();
  });

  it('should pause and resume simulation', () => {
    const simulate = jest.fn();
    const render = jest.fn();
    const loop = createGameLoop(simulate, render);

    // Access the wrapped callbacks passed to FixedTimestepLoop
    const mockLoopInstance = (FixedTimestepLoop as any).mock.results[0].value;
    const wrappedSimulate = mockLoopInstance.callbacks.simulate;

    loop.start();

    const step = { frame: 1, deltaMs: 25, nowMs: 1000 };

    // Normal running
    wrappedSimulate(step);
    expect(simulate).toHaveBeenCalledTimes(1);

    // Pause
    loop.pause();
    wrappedSimulate(step);
    expect(simulate).toHaveBeenCalledTimes(1); // Should not increase

    // Resume
    loop.resume();
    wrappedSimulate(step);
    expect(simulate).toHaveBeenCalledTimes(2);
  });
});
