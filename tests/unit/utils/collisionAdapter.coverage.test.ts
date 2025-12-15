
import { createCollisionModel } from '@/src/utils/collisionAdapter';
import type { BspMap } from 'quake2ts/engine';

describe('createCollisionModel Coverage', () => {
    // Helper to create minimal valid map
    const createBaseMap = (): any => ({
        planes: [],
        nodes: [],
        brushSides: [],
        texInfo: [],
        brushes: [],
        leafs: [],
        leafLists: { leafBrushes: [] },
        models: [],
        visibility: undefined
    });

    it('should handle nested leafBrushes (Array of Arrays)', () => {
        const map = createBaseMap();
        // Setup leafs
        map.leafs = [
            { firstLeafBrush: 0, numLeafBrushes: 0, contents: 0, cluster: 0, area: 0 },
            { firstLeafBrush: 0, numLeafBrushes: 0, contents: 0, cluster: 0, area: 0 }
        ];
        // Setup nested leafBrushes
        // The adapter checks if rawLeafBrushes[0] is array.
        const nested = [
            [1, 2], // For leaf 0
            [3]     // For leaf 1
        ];
        map.leafLists.leafBrushes = nested;

        const model = createCollisionModel(map as BspMap);

        expect(model.leaves[0].numLeafBrushes).toBe(2);
        expect(model.leaves[1].numLeafBrushes).toBe(1);
        expect(model.leafBrushes).toEqual([1, 2, 3]);
    });

    it('should handle missing entry in nested leafBrushes', () => {
        const map = createBaseMap();
        map.leafs = [{ firstLeafBrush: 0, numLeafBrushes: 0, contents: 0, cluster: 0, area: 0 }];
        // Array of arrays but undefined for index 0
        const nested: any[] = [];
        nested[1] = [1]; // Set index 1 so it detects as array
        // index 0 is undefined
        map.leafLists.leafBrushes = nested;

        const model = createCollisionModel(map as BspMap);
        expect(model.leaves[0].numLeafBrushes).toBe(0);
    });

    it('should handle flat leafBrushes', () => {
        const map = createBaseMap();
        map.leafs = [
            { firstLeafBrush: 0, numLeafBrushes: 2, contents: 0, cluster: 0, area: 0 }
        ];
        map.leafLists.leafBrushes = [10, 20]; // Flat array

        const model = createCollisionModel(map as BspMap);

        expect(model.leaves[0].numLeafBrushes).toBe(2);
        expect(model.leafBrushes).toEqual([10, 20]);
    });

    it('should handle map with visibility data', () => {
        const map = createBaseMap();
        map.visibility = {
            numClusters: 1,
            clusters: [
                { pvs: new Uint8Array([1]), phs: new Uint8Array([2]) }
            ]
        };

        const model = createCollisionModel(map as BspMap);
        expect(model.visibility).toBeDefined();
        expect(model.visibility?.numClusters).toBe(1);
        expect(model.visibility?.clusters[0].pvs).toEqual(new Uint8Array([1]));
    });

    it('should handle brush sides with texture info', () => {
        const map = createBaseMap();
        map.planes = [{ normal: [0, 1, 0], dist: 0, type: 0 }];
        map.brushSides = [{ planeIndex: 0, texInfo: 0 }];
        map.texInfo = [{ flags: 123 }];
        map.brushes = [{ firstSide: 0, numSides: 1, contents: 0 }];

        const model = createCollisionModel(map as BspMap);
        expect(model.brushes[0].sides[0].surfaceFlags).toBe(123);
    });
});
