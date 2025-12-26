import { VirtualFileSystem, parseMd2, parseMd3, parseBsp } from '@quake2ts/engine';

export interface AssetUsage {
  type: 'model' | 'map';
  path: string;
  details?: string;
}

export class AssetCrossRefService {
  private vfs: VirtualFileSystem;
  private cache: Map<string, string[]> = new Map();

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
  }

  clearCache() {
    this.cache.clear();
  }

  async findTextureUsage(texturePath: string): Promise<AssetUsage[]> {
    const normalizedTexturePath = texturePath.toLowerCase().replace(/\\/g, '/');
    // Strip extension for loose matching
    const searchBase = normalizedTexturePath.substring(0, normalizedTexturePath.lastIndexOf('.'));

    const usages: AssetUsage[] = [];

    // Use any cast to handle potential type mismatches or version differences in findByExtension
    const md2Files = (this.vfs.findByExtension('md2') as any[]).map(f => f.path);
    const md3Files = (this.vfs.findByExtension('md3') as any[]).map(f => f.path);
    const bspFiles = (this.vfs.findByExtension('bsp') as any[]).map(f => f.path);

    const allFiles = [...md2Files, ...md3Files, ...bspFiles];

    let processedCount = 0;

    for (const file of allFiles) {
      try {
        // Yield to event loop every 5 files to prevent UI freeze
        if (++processedCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const refs = await this.getReferences(file);

        for (const ref of refs) {
          if (!ref) continue;

          const normalizedRef = ref.toLowerCase().replace(/\\/g, '/');

          // Check for exact match or match without extension
          // e.g. "models/objects/box/skin" matches "models/objects/box/skin.pcx"
          const refBase = normalizedRef.includes('.')
            ? normalizedRef.substring(0, normalizedRef.lastIndexOf('.'))
            : normalizedRef;

          const textureBase = normalizedTexturePath.includes('.')
            ? normalizedTexturePath.substring(0, normalizedTexturePath.lastIndexOf('.'))
            : normalizedTexturePath;

          if (normalizedRef === normalizedTexturePath || refBase === textureBase) {
             usages.push({
               type: file.endsWith('.bsp') ? 'map' : 'model',
               path: file,
               details: `Ref: ${ref}`
             });
             break; // Found usage, move to next file
          }
        }
      } catch (e) {
        console.warn(`Failed to analyze ${file}`, e);
      }
    }

    return usages;
  }

  async findSoundUsage(soundPath: string): Promise<AssetUsage[]> {
    const normalizedSoundPath = soundPath.toLowerCase().replace(/\\/g, '/');
    const usages: AssetUsage[] = [];

    // Sounds are mainly referenced in BSP entities
    const bspFiles = (this.vfs.findByExtension('bsp') as any[]).map(f => f.path);

    let processedCount = 0;

    for (const file of bspFiles) {
      try {
        if (++processedCount % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        const refs = await this.getReferences(file);

        // First pass: look for detailed entity references
        let foundDetailed = false;
        for (const ref of refs) {
            if (ref.startsWith('entity:')) {
                const parts = ref.split('|');
                if (parts.length >= 3) {
                   const path = parts[2];
                   if (path.toLowerCase() === normalizedSoundPath || path.toLowerCase().endsWith(normalizedSoundPath)) {
                       usages.push({
                           type: 'map',
                           path: file,
                           details: `classname: ${parts[1]}`
                       });
                       foundDetailed = true;
                   }
                }
            }
        }

        // If no detailed refs found, fall back to simple check (but only if we haven't added this file yet)
        if (!foundDetailed) {
            for (const ref of refs) {
                if (!ref || ref.startsWith('entity:')) continue;
                const normalizedRef = ref.toLowerCase().replace(/\\/g, '/');

                if (normalizedRef === normalizedSoundPath || normalizedRef.endsWith(normalizedSoundPath)) {
                    usages.push({
                        type: 'map',
                        path: file,
                        details: `Used in map`
                    });
                    break;
                }
            }
        }
      } catch (e) {
        console.warn(`Failed to analyze ${file}`, e);
      }
    }

    return usages;
  }

  private async getReferences(filePath: string): Promise<string[]> {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    const buffer = this.vfs.readFile(filePath);
    // If it's a promise, await it. If it's a value, it resolves.
    const data = await Promise.resolve(buffer);
    if (!data) return [];

    let refs: string[] = [];
    const ext = filePath.split('.').pop()?.toLowerCase();

    // Ensure we are working with ArrayBuffer
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;

    try {
      if (ext === 'md2') {
        // parseMd2 returns Md2Model which has skins array
        const model = parseMd2(arrayBuffer);
        if (model && Array.isArray(model.skins)) {
          // MD2 skins are objects with a name property
          refs = model.skins.map((s: any) => typeof s === 'string' ? s : s.name);
        }
      } else if (ext === 'md3') {
        // parseMd3 returns Md3Model which has surfaces -> shaders -> name
        const model = parseMd3(arrayBuffer);
        if (model && Array.isArray(model.surfaces)) {
          refs = model.surfaces.flatMap((s: any) =>
            Array.isArray(s.shaders) ? s.shaders.map((sh: any) => sh.name) : []
          );
        }
      } else if (ext === 'bsp') {
        // parseBsp returns BspMap which has textures AND entities
        const map = parseBsp(arrayBuffer);
        const mapAny = map as any;

        // 1. Textures
        if (map && Array.isArray(mapAny.textures)) {
          const textures = mapAny.textures.map((t: any) => typeof t === 'string' ? t : t.name);
          refs.push(...textures);
        }

        // 2. Entities
        // Handle different BSP versions/structures where entities might be nested or direct
        let entitiesList: any[] = [];
        if (mapAny.entities) {
            if (Array.isArray(mapAny.entities)) {
                entitiesList = mapAny.entities;
            } else if (Array.isArray(mapAny.entities.entities)) {
                entitiesList = mapAny.entities.entities;
            }
        }

        if (entitiesList.length > 0) {
            for (const entity of entitiesList) {
                // Check all properties for potential file paths
                // Entities can be objects or have a properties field
                const props = entity.properties || entity;

                for (const [key, value] of Object.entries(props)) {
                    if (typeof value === 'string') {
                        // Check for common sound keys
                        if (key === 'noise' || key === 'sound' || key === 'message') {
                            refs.push(value);
                            // Also push a detailed ref for better context if possible, but be careful not to break simple matching
                            // Actually, let's append a special format string that we can parse later,
                            // but keep the simple one too for simple matching?
                            // No, duplicate entries might be annoying.
                            // Let's just use the special format and update findTextureUsage/findSoundUsage to handle it?
                            // That might break findTextureUsage if it expects exact string match.
                            // Better: Push BOTH. But de-duplicate?
                            // Or better: update findSoundUsage to look for this special format.
                            refs.push(`entity:${key}|${entity.classname}|${value}`);
                        }
                        // Or check for file extensions
                        else if (value.toLowerCase().endsWith('.wav') || value.toLowerCase().endsWith('.pcx') || value.toLowerCase().endsWith('.tga') || value.toLowerCase().endsWith('.md2')) {
                            refs.push(value);
                        }
                    }
                }
            }
        }
      }
    } catch (e) {
      console.warn(`Error parsing ${filePath} for references`, e);
    }

    this.cache.set(filePath, refs);
    return refs;
  }
}
