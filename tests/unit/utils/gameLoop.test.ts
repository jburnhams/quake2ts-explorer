import { createGameLoop } from '@/src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

jest.mock('quake2ts/engine', () => {
  return {
    FixedTimestepLoop: jest.fn().mockImplementation((callbacks) => ({
      start: jest.fn(),
      stop: jest.fn(),
      isRunning: jest.fn().mockReturnValue(true),
      getSimulationTime: jest.fn().mockReturnValue(100),
      pump: jest.fn((time) => {
        callbacks.simulate(25);
        callbacks.render(0.5);
      }),
    })),
  };
});

describe('createGameLoop', () => {
  beforeAll(() => {
    // Mock performance.now()
    global.performance.now = jest.fn(() => 1000);
  });

  it('should create and control the loop', () => {
    const simulate = jest.fn();
    const render = jest.fn();

    const loop = createGameLoop(simulate, render);

    expect(FixedTimestepLoop).toHaveBeenCalled();
    const constructorCalls = (FixedTimestepLoop as jest.Mock).mock.calls[0];
    expect(constructorCalls[0].simulate).toBe(simulate);
    expect(constructorCalls[0].render).toBe(render);
    expect(constructorCalls[1].tickRate).toBe(40);

    loop.start();
    const loopInstance = (FixedTimestepLoop as jest.Mock).mock.results[0].value;
    expect(loopInstance.start).toHaveBeenCalled();

    expect(loop.isRunning()).toBe(true);
    expect(loop.getSimulationTime()).toBe(100);

    loop.stop();
    expect(loopInstance.stop).toHaveBeenCalled();
  });
});
