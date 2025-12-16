import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { multiplayerGameService } from '../../../src/services/multiplayerGameService';
import { networkService } from '../../../src/services/networkService';
import { predictionService } from '../../../src/services/predictionService';

// Mock dependencies
jest.mock('../../../src/services/networkService', () => {
    const setCallbacks = jest.fn();
    const sendCommand = jest.fn();
    const disconnect = jest.fn();

    return {
      networkService: {
        setCallbacks,
        sendCommand,
        disconnect,
        // Helper to access mock funcs
        __mocks: { setCallbacks, sendCommand, disconnect }
      }
    };
});

jest.mock('../../../src/services/predictionService', () => ({
  predictionService: {
    init: jest.fn(),
    setEnabled: jest.fn(),
    predict: jest.fn().mockReturnValue({ origin: { x: 100, y: 0, z: 0 } }),
    onServerFrame: jest.fn()
  }
}));

jest.mock('quake2ts/shared', () => ({
    traceBox: jest.fn().mockReturnValue({ fraction: 1.0, endpos: {x:0,y:0,z:0}, allsolid: false, startsolid: false }),
    pointContents: jest.fn().mockReturnValue(0),
    CONTENTS_SOLID: 1,
    Vec3: jest.fn(),
    CollisionEntityIndex: jest.fn()
}));

jest.mock('quake2ts/engine', () => ({
    AssetManager: jest.fn().mockImplementation(() => ({
        loadMap: jest.fn().mockResolvedValue({}) // Mock map
    })),
    FixedTimestepLoop: jest.fn()
}));

jest.mock('../../../src/utils/collisionAdapter', () => ({
    createCollisionModel: jest.fn().mockReturnValue({})
}));

describe('MultiplayerGameService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    multiplayerGameService.shutdown(); // Reset state
  });

  it('should init and load map', async () => {
      const vfs = {} as any;
      await multiplayerGameService.init(vfs, 'q2dm1');

      expect(predictionService.init).toHaveBeenCalled();
  });

  it('should start and enable prediction', async () => {
    const vfs = {} as any;
    await multiplayerGameService.init(vfs, 'q2dm1');

    await multiplayerGameService.start();
    expect(predictionService.setEnabled).toHaveBeenCalledWith(true);
  });

  it('should throw if starting without init', async () => {
      await expect(multiplayerGameService.start()).rejects.toThrow();
  });

  it('should stop and disable prediction', () => {
    multiplayerGameService.stop();
    expect(predictionService.setEnabled).toHaveBeenCalledWith(false);
  });

  it('should send command and predict on tick', async () => {
    const vfs = {} as any;
    await multiplayerGameService.init(vfs, 'q2dm1');
    await multiplayerGameService.start();

    const cmd = {
        msec: 16,
        buttons: 0,
        angles: { x: 0, y: 0, z: 0 },
        forwardmove: 100,
        sidemove: 0,
        upmove: 0,
        impulse: 0,
        lightlevel: 0
    };
    const step = { dt: 0.016, time: 1 };

    multiplayerGameService.tick(step as any, cmd as any);

    expect(networkService.sendCommand).toHaveBeenCalledWith(cmd);
    expect(predictionService.predict).toHaveBeenCalledWith(cmd);
  });

  it('should process server snapshots', () => {
    const serverSnapshot = {
        time: 100,
        playerState: { origin: { x: 10, y: 10, z: 10 } },
        entities: []
    };

    // Invoke private method via any
    (multiplayerGameService as any).onServerSnapshot(serverSnapshot);

    expect(predictionService.onServerFrame).toHaveBeenCalledWith(serverSnapshot.playerState, 0, 100);
  });

  it('should throw on save/load', () => {
      expect(() => multiplayerGameService.createSave("desc")).toThrow();
      expect(() => multiplayerGameService.loadSave({} as any)).toThrow();
  });

  it('should handle disconnect', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      (multiplayerGameService as any).onDisconnect("reason");
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("reason"));
      consoleSpy.mockRestore();
  });

  it('should provide config strings', () => {
      expect(multiplayerGameService.getConfigStrings()).toBeInstanceOf(Map);
  });

  it('should execute prediction trace', async () => {
      const vfs = {} as any;
      await multiplayerGameService.init(vfs, 'q2dm1');

      const config = (predictionService.init as jest.Mock).mock.calls[0][0];

      const result = config.trace({x:0,y:0,z:0}, {x:100,y:0,z:0});
      expect(result).toBeDefined();
      expect(result.fraction).toBe(1.0);

      const pc = config.pointContents({x:0,y:0,z:0});
      expect(pc).toBe(0);
  });
});
