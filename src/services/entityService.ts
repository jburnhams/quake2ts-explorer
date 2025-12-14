import {
  VirtualFileSystem,
  parseBsp,
  BspEntity,
  BspMap,
  BspEntities
} from 'quake2ts/engine';
import { toArrayBuffer } from '../utils/helpers';

export interface EntityRecord {
  id: string; // Unique ID (mapName + index)
  mapName: string;
  index: number;
  classname: string;
  targetname?: string;
  origin?: { x: number, y: number, z: number };
  properties: Record<string, string>;
  raw: BspEntity;
}

export interface EntityDatabaseStats {
  totalEntities: number;
  entitiesPerMap: Record<string, number>;
  entitiesByType: Record<string, number>;
}

export class EntityService {
  constructor(private vfs: VirtualFileSystem) {}

  /**
   * Scans all BSP files in the VFS and extracts entities.
   * This can be slow for large PAKs, so an optional progress callback is provided.
   */
  async scanAllMaps(onProgress?: (current: number, total: number, currentMap: string) => void): Promise<EntityRecord[]> {
    const bspFiles = this.vfs.findByExtension('bsp');
    const allEntities: EntityRecord[] = [];

    // console.log('Found BSP files:', bspFiles);

    for (let i = 0; i < bspFiles.length; i++) {
      // bspFiles contains VirtualFileHandle objects (path, size, sourcePak)
      // We need to cast it to any because the type definition might not be fully accurate in the environment
      const fileHandle = bspFiles[i] as any;
      const bspPath = fileHandle.path || fileHandle;

      if (onProgress) {
        onProgress(i, bspFiles.length, bspPath);
      }

      try {
        const data = await this.vfs.readFile(bspPath);
        if (!data) continue;

        const buffer = toArrayBuffer(data);
        // We catch errors here because some BSPs might be corrupt or different version
        const map = parseBsp(buffer);

        // Extract entities
        const mapEntities = this.extractEntitiesFromMap(map, bspPath);
        allEntities.push(...mapEntities);
      } catch (err) {
        console.warn(`Failed to parse entities from ${bspPath}:`, err);
      }
    }

    if (onProgress) {
      onProgress(bspFiles.length, bspFiles.length, 'Complete');
    }

    return allEntities;
  }

  /**
   * Extract entities from a single parsed BspMap
   */
  extractEntitiesFromMap(map: BspMap, mapName: string): EntityRecord[] {
    const records: EntityRecord[] = [];
    const bspEntities = map.entities;

    // Check if entities is iterable or has .entities property
    const entitiesArray: BspEntity[] = (Array.isArray(bspEntities)
      ? bspEntities
      : (bspEntities.entities || []));

    entitiesArray.forEach((ent, index) => {
      // Parse origin if available
      let origin: { x: number, y: number, z: number } | undefined;
      if (ent.properties.origin) {
        const parts = ent.properties.origin.split(' ').map(parseFloat);
        if (parts.length === 3 && !parts.some(isNaN)) {
          origin = { x: parts[0], y: parts[1], z: parts[2] };
        }
      }

      records.push({
        id: `${mapName}_${index}`,
        mapName: mapName,
        index: index,
        classname: ent.classname || ent.properties.classname || 'unknown',
        targetname: ent.properties.targetname,
        origin: origin,
        properties: ent.properties,
        raw: ent
      });
    });

    return records;
  }

  getStats(records: EntityRecord[]): EntityDatabaseStats {
    const stats: EntityDatabaseStats = {
      totalEntities: records.length,
      entitiesPerMap: {},
      entitiesByType: {}
    };

    for (const record of records) {
      // Per map
      stats.entitiesPerMap[record.mapName] = (stats.entitiesPerMap[record.mapName] || 0) + 1;

      // Per type
      stats.entitiesByType[record.classname] = (stats.entitiesByType[record.classname] || 0) + 1;
    }

    return stats;
  }
}
