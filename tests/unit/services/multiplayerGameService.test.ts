import { MultiplayerGameService } from '@/src/services/multiplayerGameService';
import { networkService } from '@/src/services/networkService';
import { predictionService } from '@/src/services/predictionService';
import { AssetManager } from 'quake2ts/engine';
import { createCollisionModel } from '@/src/utils/collisionAdapter';
import { traceBox, pointContents } from 'quake2ts/shared';

// Mock dependencies
vi.mock('@/src/services/networkService', () => ({
    __esModule: true,
    networkService: {
        setCallbacks: vi.fn(),
        sendCommand: vi.fn(),
        disconnect: vi.fn()
    }
}));
vi.mock('@/src/services/predictionService');
vi.mock('quake2ts/engine', () => ({
    AssetManager: vi.fn()
}));
vi.mock('@/src/utils/collisionAdapter');
vi.mock('quake2ts/shared', () => ({
    ...vi.requireActual('quake2ts/shared'),
    traceBox: vi.fn(),
    pointContents: vi.fn()
}));

describe('MultiplayerGameService', () => {
    let service: MultiplayerGameService;
    let mockAssetManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockAssetManager = {
            loadMap: vi.fn()
        };
        (AssetManager as vi.Mock).mockReturnValue(mockAssetManager);

        service = new MultiplayerGameService();
    });

    it('registers network callbacks on instantiation', () => {
        expect(networkService.setCallbacks).toHaveBeenCalled();
    });

    it('initializes with map', async () => {
        const vfs: any = {};
        const mockMap = { name: 'map' };
        const mockCollisionModel = { planes: [] };

        mockAssetManager.loadMap.mockResolvedValue(mockMap);
        (createCollisionModel as vi.Mock).mockReturnValue(mockCollisionModel);

        await service.init(vfs, 'demo1');

        expect(AssetManager).toHaveBeenCalledWith(vfs);
        expect(mockAssetManager.loadMap).toHaveBeenCalledWith('demo1');
        expect(createCollisionModel).toHaveBeenCalledWith(mockMap);
        expect(predictionService.init).toHaveBeenCalled();
    });

    it('start throws if not initialized', async () => {
        await expect(service.start()).rejects.toThrow('MultiplayerGameService not initialized');
    });

    it('starts and stops correctly', async () => {
        mockAssetManager.loadMap.mockResolvedValue({});
        await service.init({} as any, 'map');

        await service.start();
        expect(predictionService.setEnabled).toHaveBeenCalledWith(true);

        service.stop();
        expect(predictionService.setEnabled).toHaveBeenCalledWith(false);
    });

    it('shutdown cleans up', () => {
        service.shutdown();
        expect(networkService.disconnect).toHaveBeenCalled();
    });

    it('tick sends command and updates prediction', async () => {
        mockAssetManager.loadMap.mockResolvedValue({});
        await service.init({} as any, 'map');
        await service.start();

        const step: any = {};
        const cmd: any = { forwardMove: 100 };
        const mockPredicted = { origin: { x: 10, y: 0, z: 0 } };

        (predictionService.predict as vi.Mock).mockReturnValue(mockPredicted);

        service.tick(step, cmd);

        expect(networkService.sendCommand).toHaveBeenCalledWith(cmd);
        expect(predictionService.predict).toHaveBeenCalledWith(cmd);

        // Snapshot should reflect predicted state
        const snap = service.getSnapshot();
        expect(snap.origin.x).toBe(10);
    });

    it('returns empty snapshot if no state', () => {
        const snap = service.getSnapshot();
        expect(snap).toBeDefined();
        expect(snap.entities.activeCount).toBe(0);
    });

    it('handles server snapshot', () => {
        // Access private method callback via networkService.setCallbacks call
        const callbacks = (networkService.setCallbacks as vi.Mock).mock.calls[0][0];
        const mockSnapshot = {
            time: 1234,
            playerState: { origin: { x: 5, y: 5, z: 5 } },
            entities: []
        };

        callbacks.onSnapshot(mockSnapshot);

        expect(predictionService.onServerFrame).toHaveBeenCalledWith(mockSnapshot.playerState, 0, 1234);

        // Check if getSnapshot uses it (if prediction is null)
        (predictionService.predict as vi.Mock).mockReturnValue(null);
        // Reset local prediction state by not calling tick?
        // tick stores result in this.predictedState.
        // We need to verify that getSnapshot uses latestSnapshot if predictedState is null.
        // But tick sets predictedState.

        // If we haven't ticked, predictedState is null.
        const snap = service.getSnapshot();
        expect(snap.origin.x).toBe(5);
    });

    it('performs trace using collision model', async () => {
        const mockCollisionModel = { planes: [] };
        mockAssetManager.loadMap.mockResolvedValue({});
        (createCollisionModel as vi.Mock).mockReturnValue(mockCollisionModel);

        await service.init({} as any, 'map');

        // Capture init options to get trace callback
        const initOpts = (predictionService.init as vi.Mock).mock.calls[0][0];

        const mockTraceResult = {
            allsolid: false,
            startsolid: false,
            fraction: 0.5,
            endpos: { x: 50, y: 0, z: 0 },
            plane: { normal: { x: 1, y: 0, z: 0 } },
            surfaceFlags: 0,
            contents: 0
        };
        (traceBox as vi.Mock).mockReturnValue(mockTraceResult);

        const result = initOpts.trace({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, { x: -10, y: -10, z: -10 }, { x: 10, y: 10, z: 10 });

        expect(traceBox).toHaveBeenCalledWith(expect.objectContaining({
            model: mockCollisionModel,
            start: { x: 0, y: 0, z: 0 },
            end: { x: 100, y: 0, z: 0 }
        }));
        expect(result.fraction).toBe(0.5);
    });

    it('trace returns full fraction if no model', () => {
        // Not initialized
        const callbacks = (networkService.setCallbacks as vi.Mock).mock.calls[0][0];
        // Wait, how to access trace? It was passed to init.
        // But we haven't called init.
        // We can access private method if we cast to any, or use logic.

        // But predictionService.init is called in init().
        // So we can't test trace without init unless we mock init?
        // Actually, init calls predictionService.init with bound method.
        // So we call init() but make sure collisionModel is null?
        // init throws if map fails.
        // If createCollisionModel returns null?

        // We can mimic the scenario where init wasn't called but somehow trace is called?
        // Unlikely in real usage but `trace` implementation checks for `!this.collisionModel`.
        // We can inspect the method directly.
        const result = (service as any).trace({x:0,y:0,z:0}, {x:100,y:0,z:0});
        expect(result.fraction).toBe(1.0);
    });

    it('pointContents delegates to engine', async () => {
        const mockCollisionModel = {};
        mockAssetManager.loadMap.mockResolvedValue({});
        (createCollisionModel as vi.Mock).mockReturnValue(mockCollisionModel);
        await service.init({} as any, 'map');

        const initOpts = (predictionService.init as vi.Mock).mock.calls[0][0];

        (pointContents as vi.Mock).mockReturnValue(42);

        const result = initOpts.pointContents({ x: 10, y: 10, z: 10 });
        expect(pointContents).toHaveBeenCalledWith({ x: 10, y: 10, z: 10 }, mockCollisionModel, 0);
        expect(result).toBe(42);
    });
});
