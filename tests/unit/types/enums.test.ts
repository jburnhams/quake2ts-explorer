import { CameraMode } from '../../../src/types/cameraMode';
import { DebugMode } from '../../../src/types/debugMode';

describe('Types/Enums', () => {
    it('CameraMode enum exists', () => {
        expect(CameraMode.FirstPerson).toBe('first-person');
        expect(CameraMode.ThirdPerson).toBe('third-person');
        expect(CameraMode.Free).toBe('free');
        expect(CameraMode.Orbital).toBe('orbital');
        expect(CameraMode.Cinematic).toBe('cinematic');
    });

    it('DebugMode enum exists', () => {
        expect(DebugMode.None).toBe('none');
        expect(DebugMode.BoundingBoxes).toBe('bounding-boxes');
        expect(DebugMode.Normals).toBe('normals');
        expect(DebugMode.PVSClusters).toBe('pvs-clusters');
        expect(DebugMode.CollisionHulls).toBe('collision-hulls');
        expect(DebugMode.Lightmaps).toBe('lightmaps');
        expect(DebugMode.Skeleton).toBe('skeleton');
    });
});
