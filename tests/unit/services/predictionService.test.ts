import {
  type TraceFunction,
  type PointContentsFunction,
  type UserCommand,
  type PlayerState,
  type PmoveTraceResult,
  Vec3
} from '@quake2ts/shared';

import {
  ClientPrediction,
  type PredictionState
} from '@quake2ts/client';

import { predictionService } from '../../../src/services/predictionService';

// Mock ClientPrediction
vi.mock('@quake2ts/client', () => {
  return {
    ClientPrediction: vi.fn().mockImplementation(() => ({
      setPredictionEnabled: vi.fn(),
      enqueueCommand: vi.fn().mockReturnValue({
          origin: { x: 100, y: 0, z: 0 }, // Mock predicted state
          pmove: { origin: { x: 100, y: 0, z: 0 } }
      }),
      setAuthoritative: vi.fn(),
      getPredictionError: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
      decayError: vi.fn(),
      getPredictedState: vi.fn().mockReturnValue({
          origin: { x: 100, y: 0, z: 0 }
      })
    }))
  };
});

describe('PredictionService', () => {
  let mockTrace: TraceFunction;
  let mockPointContents: PointContentsFunction;

  beforeEach(() => {
    mockTrace = vi.fn();
    mockPointContents = vi.fn();
    (ClientPrediction as vi.Mock).mockClear();
  });

  it('should initialize successfully', () => {
    predictionService.init({
      trace: mockTrace,
      pointContents: mockPointContents
    });

    expect(ClientPrediction).toHaveBeenCalledTimes(1);
    // Expect single object argument with properties
    expect(ClientPrediction).toHaveBeenCalledWith({
      trace: mockTrace,
      pointContents: mockPointContents
    });
  });

  it('should enable/disable prediction', () => {
    predictionService.init({ trace: mockTrace, pointContents: mockPointContents });

    // Access the mock instance
    const instance = (ClientPrediction as vi.Mock).mock.results[0].value;

    predictionService.setEnabled(true);
    expect(instance.setPredictionEnabled).toHaveBeenCalledWith(true);

    predictionService.setEnabled(false);
    expect(instance.setPredictionEnabled).toHaveBeenCalledWith(false);
  });

  it('should predict user command', () => {
    predictionService.init({ trace: mockTrace, pointContents: mockPointContents });
    const instance = (ClientPrediction as vi.Mock).mock.results[0].value;

    const cmd: UserCommand = {
        msec: 16,
        buttons: 0,
        angles: { x: 0, y: 0, z: 0 },
        forwardmove: 100,
        sidemove: 0,
        upmove: 0,
        impulse: 0,
        lightlevel: 0
    };

    const state = predictionService.predict(cmd);

    expect(instance.enqueueCommand).toHaveBeenCalledWith(cmd);
    expect(state).toBeDefined();
    expect(state.origin.x).toBe(100);
  });

  it('should delegate server frame updates', () => {
    predictionService.init({ trace: mockTrace, pointContents: mockPointContents });
    const instance = (ClientPrediction as vi.Mock).mock.results[0].value;

    const serverState = { origin: { x: 0, y: 0, z: 0 } } as PredictionState;
    // Updated signature call
    predictionService.onServerFrame(serverState, 123, 1000);

    expect(instance.setAuthoritative).toHaveBeenCalled();
    const args = instance.setAuthoritative.mock.calls[0][0];
    expect(args.time).toBe(1000);
    expect(args.state).toBe(serverState);
  });

  it('should track mispredictions', () => {
      predictionService.init({ trace: mockTrace, pointContents: mockPointContents });
      const instance = (ClientPrediction as vi.Mock).mock.results[0].value;

      // Mock getPredictionError to return significant error
      instance.getPredictionError.mockReturnValue({ x: 10, y: 0, z: 0 });

      const serverState = { origin: { x: 0, y: 0, z: 0 } } as PredictionState;
      predictionService.onServerFrame(serverState, 123, 1000);

      expect(predictionService.getMispredictionCount()).toBe(1);

      // Mock small error
      instance.getPredictionError.mockReturnValue({ x: 0.05, y: 0, z: 0 });
      predictionService.onServerFrame(serverState, 124, 1050);

      expect(predictionService.getMispredictionCount()).toBe(1); // Should not increment
  });

  it('should handle uninitialized state safely', () => {
      // Force uninitialized state by modifying private property
      (predictionService as any).predictor = null;

      expect(() => predictionService.predict({} as any)).toThrow("PredictionService not initialized");

      expect(() => predictionService.setEnabled(true)).not.toThrow();

      expect(() => predictionService.onServerFrame({} as any, 0, 0)).not.toThrow();

      expect(predictionService.getPredictionError()).toEqual({ x: 0, y: 0, z: 0 });

      expect(() => predictionService.decayError(16)).not.toThrow();

      expect(predictionService.getPredictedState()).toBeNull();
  });
});
