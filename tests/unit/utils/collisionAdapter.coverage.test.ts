import { createCollisionModel } from '@/src/utils/collisionAdapter';
import { BspMap } from '@quake2ts/engine';

describe('collisionAdapter', () => {
    it('handles nested leafBrushes structure', () => {
        const mockMap: any = {
            planes: [],
            nodes: [],
            brushSides: [],
            texInfo: [],
            brushes: [],
            leafLists: {
                leafBrushes: [[1, 2], [3]] // Nested
            },
            leafs: [
                { contents: 0, cluster: 0, area: 0, firstLeafBrush: 0, numLeafBrushes: 0 },
                { contents: 0, cluster: 0, area: 0, firstLeafBrush: 0, numLeafBrushes: 0 }
            ],
            models: [],
        };

        const result = createCollisionModel(mockMap);
        expect(result.leaves[0].numLeafBrushes).toBe(2);
        // The implementation flattens it, so firstLeafBrush should point to valid range in flattened array
        // We need to check if createCollisionModel calculates firstLeafBrush correctly for the result leaf?
        // createCollisionModel sets firstLeafBrush based on leafBrushes.length accumulator.
        expect(result.leaves[0].firstLeafBrush).toBe(0);
        expect(result.leaves[1].firstLeafBrush).toBe(2);
        expect(result.leafBrushes).toEqual([1, 2, 3]);
    });

    it('handles flat leafBrushes structure', () => {
        const mockMap: any = {
            planes: [],
            nodes: [],
            brushSides: [],
            texInfo: [],
            brushes: [],
            leafLists: {
                leafBrushes: [1, 2, 3] // Flat
            },
            leafs: [
                { contents: 0, cluster: 0, area: 0, firstLeafBrush: 0, numLeafBrushes: 2 },
                { contents: 0, cluster: 0, area: 0, firstLeafBrush: 2, numLeafBrushes: 1 }
            ],
            models: [],
        };

        const result = createCollisionModel(mockMap);
        expect(result.leaves[0].numLeafBrushes).toBe(2);
        expect(result.leaves[1].numLeafBrushes).toBe(1);
        expect(result.leafBrushes).toEqual([1, 2, 3]);
    });

    it('handles populated planes, nodes, brushes', () => {
        const mockMap: any = {
            planes: [
                { normal: [1, 0, 0], dist: 10, type: 0 },
                { normal: [-1, -1, -1], dist: 5, type: 1 }
            ],
            nodes: [
                { planeIndex: 0, children: [1, 2] }
            ],
            brushSides: [
                { planeIndex: 0, texInfo: 0 }
            ],
            texInfo: [
                { flags: 42 }
            ],
            brushes: [
                { firstSide: 0, numSides: 1, contents: 1 }
            ],
            leafLists: { leafBrushes: [] },
            leafs: [],
            models: [
                { mins: [0,0,0], maxs: [10,10,10], origin: [5,5,5], headNode: 0 }
            ],
            visibility: {
                numClusters: 1,
                clusters: [{ pvs: new Uint8Array(), phs: new Uint8Array() }]
            }
        };

        const result = createCollisionModel(mockMap);

        // Verify planes and signbits
        expect(result.planes).toHaveLength(2);
        expect(result.planes[0].signbits).toBe(0);
        expect(result.planes[1].signbits).toBe(7); // all negative

        // Verify nodes
        expect(result.nodes).toHaveLength(1);
        expect(result.nodes[0].plane).toBe(result.planes[0]);

        // Verify brushes
        expect(result.brushes).toHaveLength(1);
        expect(result.brushes[0].sides[0].surfaceFlags).toBe(42);

        // Verify bmodels
        expect(result.bmodels).toHaveLength(1);

        // Verify visibility
        expect(result.visibility).toBeDefined();
    });
});
