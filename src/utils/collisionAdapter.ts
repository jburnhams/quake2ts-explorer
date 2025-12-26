import type { BspMap } from '@quake2ts/engine';
import type {
  CollisionModel,
  CollisionNode,
  CollisionLeaf,
  CollisionPlane,
  CollisionBrush,
  CollisionBrushSide,
  CollisionBmodel,
  CollisionVisibility
} from '@quake2ts/shared';
import { Vec3 } from '@quake2ts/shared';

function toVec3(tuple: [number, number, number]): Vec3 {
  return { x: tuple[0], y: tuple[1], z: tuple[2] };
}

// Compute signbits for AABB collision optimization
// Used to quickly determine which corners of the box are "min" and "max" relative to the plane normal
function computePlaneSignBits(normal: Vec3): number {
  let bits = 0;
  if (normal.x < 0) bits |= 1;
  if (normal.y < 0) bits |= 2;
  if (normal.z < 0) bits |= 4;
  return bits;
}

export function createCollisionModel(map: BspMap): CollisionModel {
  const planes: CollisionPlane[] = map.planes.map(p => {
    const normal = toVec3(p.normal);
    return {
      normal: normal,
      dist: p.dist,
      type: p.type,
      signbits: computePlaneSignBits(normal)
    };
  });

  const nodes: CollisionNode[] = map.nodes.map(n => ({
    plane: planes[n.planeIndex],
    children: [...n.children] as [number, number]
  }));

  const brushSides: CollisionBrushSide[] = map.brushSides.map(s => ({
    plane: planes[s.planeIndex],
    surfaceFlags: 0
  }));

  map.brushSides.forEach((s, i) => {
      if (s.texInfo >= 0 && s.texInfo < map.texInfo.length) {
          brushSides[i].surfaceFlags = map.texInfo[s.texInfo].flags;
      }
  });

  const brushes: CollisionBrush[] = map.brushes.map(b => {
    const sides = brushSides.slice(b.firstSide, b.firstSide + b.numSides);
    return {
      contents: b.contents,
      sides: sides
    };
  });

  // Flatten leaf brushes
  const leafBrushes: number[] = [];
  const leaves: CollisionLeaf[] = [];

  const rawLeafBrushes = map.leafLists.leafBrushes as any;
  const isNested = Array.isArray(rawLeafBrushes) && (rawLeafBrushes.length === 0 || Array.isArray(rawLeafBrushes[0]));

  map.leafs.forEach((l, leafIndex) => {
      const first = leafBrushes.length;
      let count = 0;

      if (isNested) {
          // Nested array approach
          if (leafIndex < rawLeafBrushes.length) {
              const brushesForLeaf = rawLeafBrushes[leafIndex] as number[];
              if (brushesForLeaf) {
                  leafBrushes.push(...brushesForLeaf);
                  count = brushesForLeaf.length;
              }
          }
      } else {
          // Flat array approach
          const flat = rawLeafBrushes as number[];
          if (l.firstLeafBrush >= 0 && l.firstLeafBrush + l.numLeafBrushes <= flat.length) {
             const slice = flat.slice(l.firstLeafBrush, l.firstLeafBrush + l.numLeafBrushes);
             leafBrushes.push(...slice);
             count = slice.length;
          }
      }

      leaves.push({
          contents: l.contents,
          cluster: l.cluster,
          area: l.area,
          firstLeafBrush: first,
          numLeafBrushes: count
      });
  });

  const bmodels: CollisionBmodel[] = map.models.map(m => ({
    mins: toVec3(m.mins),
    maxs: toVec3(m.maxs),
    origin: toVec3(m.origin),
    headnode: m.headNode
  }));

  let visibility: CollisionVisibility | undefined = undefined;
  if (map.visibility) {
      visibility = {
          numClusters: map.visibility.numClusters,
          clusters: map.visibility.clusters.map(c => ({
              pvs: c.pvs,
              phs: c.phs
          }))
      };
  }

  return {
    planes,
    nodes,
    leaves,
    brushes,
    leafBrushes,
    bmodels,
    visibility
  };
}
