import { BspMap, BspLeaf, BspNode, BspBrush, BspPlane, BspBrushSide, BspModel } from 'quake2ts/engine';
import {
  CollisionLumpData,
  CollisionModel,
  buildCollisionModel,
  Vec3
} from 'quake2ts/shared';

// Adapter to convert engine BspMap to shared CollisionModel

export function createCollisionModel(map: BspMap): CollisionModel {

  const lumps: CollisionLumpData = {
    planes: map.planes.map(p => ({
        normal: p.normal,
        dist: p.dist,
        type: p.type
    })),
    nodes: map.nodes.map(n => ({
        planenum: n.planeIndex,
        children: n.children
    })),
    leaves: map.leafs.map(l => ({
        contents: l.contents,
        cluster: l.cluster,
        area: l.area,
        firstLeafBrush: l.firstLeafBrush,
        numLeafBrushes: l.numLeafBrushes
    })),
    brushes: map.brushes.map(b => ({
        firstSide: b.firstSide,
        numSides: b.numSides,
        contents: b.contents
    })),
    brushSides: map.brushSides.map(s => ({
        planenum: s.planeIndex,
        surfaceFlags: 0
    })),
    leafBrushes: [] as number[],

    bmodels: map.models.map(m => ({
        mins: m.mins,
        maxs: m.maxs,
        origin: m.origin,
        headnode: m.headNode
    })),
    visibility: map.visibility ? {
        numClusters: map.visibility.numClusters,
        clusters: map.visibility.clusters.map(d => ({
            pvs: d.pvs,
            phs: d.phs
        }))
    } : undefined
  };

  const flatLeafBrushes: number[] = [];

  const newLeaves = lumps.leaves.map((l, i) => {
      const leafBrushes = map.leafLists && map.leafLists.leafBrushes;

      let brushes: number[] = [];
      if (Array.isArray(leafBrushes)) {
          if (leafBrushes.length > 0 && typeof leafBrushes[0] === 'number') {
              const start = l.firstLeafBrush;
              const count = l.numLeafBrushes;
              const flat = leafBrushes as any as number[];
              brushes = flat.slice(start, start + count);
          } else {
              brushes = (leafBrushes[i] as number[]) || [];
          }
      }

      const first = flatLeafBrushes.length;
      for (const brush of brushes) {
          flatLeafBrushes.push(brush);
      }
      const num = brushes.length;

      return {
          ...l,
          firstLeafBrush: first,
          numLeafBrushes: num
      };
  });

  lumps.leaves = newLeaves;
  lumps.leafBrushes = flatLeafBrushes;

  lumps.brushSides = map.brushSides.map(s => {
      const tex = map.texInfo[s.texInfo];
      return {
          planenum: s.planeIndex,
          surfaceFlags: tex ? tex.flags : 0
      };
  });

  return buildCollisionModel(lumps);
}
