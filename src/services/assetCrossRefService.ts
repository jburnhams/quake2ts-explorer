import { VirtualFileSystem, parseMd2, parseMd3, parseBsp } from 'quake2ts/engine';

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
        // parseBsp returns BspMap which has textures
        const map = parseBsp(arrayBuffer);
        // Cast map to any because properties might be missing in strict types or named differently
        const mapAny = map as any;
        if (map && Array.isArray(mapAny.textures)) {
          refs = mapAny.textures.map((t: any) => typeof t === 'string' ? t : t.name);
        }
      }
    } catch (e) {
      console.warn(`Error parsing ${filePath} for references`, e);
    }

    this.cache.set(filePath, refs);
    return refs;
  }
}
