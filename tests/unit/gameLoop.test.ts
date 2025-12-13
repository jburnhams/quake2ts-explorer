
import { createGameLoop } from '../../src/utils/gameLoop';
import { FixedTimestepLoop } from 'quake2ts/engine';

jest.mock('quake2ts/engine', () => {
  return {
    FixedTimestepLoop: jest.fn().mockImplementation((callbacks, options) => {
      return {
        start: jest.fn(),
        stop: jest.fn(),
        isRunning: jest.fn().mockReturnValue(true),
        callbacks,
        options
      };
    })
  };
});

describe('createGameLoop', () => {
  it('should create a FixedTimestepLoop with correct options', () => {
    const simulate = jest.fn();
    const render = jest.fn();

    createGameLoop(simulate, render);

    expect(FixedTimestepLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        simulate: expect.any(Function),
        render: expect.any(Function)
      }),
      expect.objectContaining({
        tickRate: 40
      })
    );
  });

  it('should delegate start/stop/isRunning', () => {
    const loop = createGameLoop(jest.fn(), jest.fn());

    // In each test, createGameLoop is called, adding a new instance to mock.results.
    // The previous test called it once, so this test adds the 2nd instance (index 1).
    // But since tests run in unknown order (though usually sequential here),
    // it's safer to check the last instance.
    const mock = FixedTimestepLoop as unknown as jest.Mock;
    // mock.results might be undefined if not called? But we just called createGameLoop.
    // Wait, createGameLoop calls new FixedTimestepLoop().
    // Maybe mock.results is not populated when using mockImplementation returning object?
    // It should be.
    // Let's rely on mock.instances if mock.results is tricky, or just use the return value if we can access it from the mock.
    // But actually, we returned an object from the mock implementation.

    // Let's use mock.mock.results
    const instance = mock.mock.results[mock.mock.results.length - 1].value;

    loop.start();
    expect(instance.start).toHaveBeenCalled();

    loop.stop();
    expect(instance.stop).toHaveBeenCalled();

    const running = loop.isRunning();
    expect(instance.isRunning).toHaveBeenCalled();
    expect(running).toBe(true);
  });

  it('should call callbacks', () => {
    const simulate = jest.fn();
    const render = jest.fn();

    createGameLoop(simulate, render);

    const mock = FixedTimestepLoop as unknown as jest.Mock;
    // Get the arguments of the last call
    const callbacks = mock.mock.calls[mock.mock.calls.length - 1][0];

    callbacks.simulate(16);
    expect(simulate).toHaveBeenCalledWith(16);

    callbacks.render(0.5);
    expect(render).toHaveBeenCalledWith(0.5);
  });
});
