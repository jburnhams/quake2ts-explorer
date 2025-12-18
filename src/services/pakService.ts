import { MOD_PRIORITY } from '../types/modInfo';
import { workerService } from './workerService';
import { cacheService, CACHE_STORES } from './cacheService';
import { WorkerPakArchive } from '../utils/WorkerPakArchive';
import {
  PakArchive,
  VirtualFileSystem,
  parsePcx,
  pcxToRgba,
  parseWal,
  walToRgba,
  parseMd2,
  groupMd2Animations,
  parseMd3,
  parseWav,
  parseBsp,
  parseTga,
  type PcxImage,
  type WalTexture,
  type Md2Model,
  type Md2Animation,
  type Md3Model,
  type SpriteModel,
  type WavData,
  type BspMap,
  type TgaImage,
} from 'quake2ts/engine';

export interface VirtualFileHandle {
  readonly path: string;
  readonly size: number;
  readonly sourcePak: string;
}

export interface DirectoryListing {
  readonly files: VirtualFileHandle[];
  readonly directories: string[];
}

import { parseSprite } from '../utils/sp2Parser';

import {
  getFileType as getFileTypeHelper,
  getExtension,
  getFileName,
  toArrayBuffer,
  type FileType,
} from '../utils/helpers';

export type { FileType };

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  sourcePak: string;
  extension: string;
  fileType: FileType;
}

export interface ParsedPcx {
  type: 'pcx';
  image: PcxImage;
  rgba: Uint8Array;
  width: number;
  height: number;
}

export interface ParsedWal {
  type: 'wal';
  texture: WalTexture;
  rgba: Uint8Array | null;
  width: number;
  height: number;
  mipmaps?: { width: number; height: number; rgba: Uint8Array }[];
}

export interface ParsedTga {
  type: 'tga';
  image: TgaImage;
  rgba: Uint8Array;
  width: number;
  height: number;
}

export interface ParsedMd2 {
  type: 'md2';
  model: Md2Model;
  animations: Md2Animation[];
}

export type { Md2Animation };

export interface ParsedMd3 {
  type: 'md3';
  model: Md3Model;
}

export interface ParsedDm2 {
  type: 'dm2';
  data: Uint8Array;
}

export interface ParsedBsp {
  type: 'bsp';
  map: BspMap;
}

export interface ParsedSprite {
  type: 'sp2';
  model: SpriteModel;
}

export interface ParsedWav {
  type: 'wav';
  audio: WavData;
}

export interface ParsedText {
  type: 'txt';
  content: string;
}

export interface ParsedUnknown {
  type: 'unknown';
  data: Uint8Array;
  error?: string;
}

export type ParsedFile = ParsedPcx | ParsedWal | ParsedTga | ParsedMd2 | ParsedMd3 | ParsedBsp | ParsedDm2 | ParsedSprite | ParsedWav | ParsedText | ParsedUnknown;

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  isPakRoot?: boolean;
  pakId?: string;
  isUserPak?: boolean;
  children?: TreeNode[];
  file?: VirtualFileHandle;
}

export interface MountedPak {
  id: string;
  name: string;
  archive: PakArchive;
  isUser: boolean;
  priority: number;
  hash?: string;
}

export type ViewMode = 'merged' | 'by-pak';

function getFileType(path: string): FileType {
  return getFileTypeHelper(path);
}

export class PakService {
  public vfs: VirtualFileSystem;
  private paks: Map<string, MountedPak> = new Map();
  private palette: Uint8Array | null = null;

  constructor(vfs?: VirtualFileSystem) {
    this.vfs = vfs ?? new VirtualFileSystem();
  }

  async loadPakFile(file: File, id?: string, isUser: boolean = true, priority: number = 100): Promise<PakArchive> {
    const buffer = await file.arrayBuffer();
    return this.loadPakInternal(file.name, buffer, id, isUser, priority);
  }

  async loadPakFromBuffer(name: string, buffer: ArrayBuffer, id?: string, isUser: boolean = false, priority: number = 0): Promise<PakArchive> {
    return this.loadPakInternal(name, buffer, id, isUser, priority);
  }

  private async loadPakInternal(name: string, buffer: ArrayBuffer, id: string | undefined, isUser: boolean, priority: number): Promise<PakArchive> {
    const pakId = id || crypto.randomUUID();

    // Try to load from cache
    let hash: string | null = null;
    try {
      const size = buffer.byteLength;
      // Read first 64KB for hash computation
      const chunk = new Uint8Array(buffer, 0, Math.min(size, 64 * 1024));

      // Compute SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', chunk);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Combine with size and name for uniqueness
      hash = `${hashHex}_${size}_${name}`;

      const cachedEntries = await cacheService.get<Map<string, any>>(CACHE_STORES.PAK_INDEX, hash);
      if (cachedEntries) {
        // @ts-ignore
        const archive = new WorkerPakArchive(name, buffer, cachedEntries) as unknown as PakArchive;
        this.mountPak(archive, pakId, name, isUser, priority, hash || undefined);
        return archive;
      }
    } catch (e) {
      console.warn('Cache lookup failed', e);
    }

    try {
      const result = await workerService.executePakParserTask(api => api.parsePak(pakId, buffer));

      // Cache the result
      if (hash) {
        cacheService.set(CACHE_STORES.PAK_INDEX, hash, result.entries).catch(e =>
          console.warn('Failed to cache pak index', e)
        );
      }

      // @ts-ignore
      const archive = new WorkerPakArchive(result.name, result.buffer, result.entries) as unknown as PakArchive;
      this.mountPak(archive, pakId, name, isUser, priority, hash || undefined);
      return archive;
    } catch (error) {
      console.warn('Worker parsing failed, falling back to main thread', error);
      const archive = PakArchive.fromArrayBuffer(pakId, buffer);
      this.mountPak(archive, pakId, name, isUser, priority, hash || undefined);
      return archive;
    }
  }

  private mountPak(archive: PakArchive, id: string, name: string, isUser: boolean, priority: number, hash?: string) {
    this.paks.set(id, { id, name, archive, isUser, priority, hash });
    this.vfs.mountPak(archive, priority);
    this.tryLoadPalette();
  }

  unloadPak(id: string): void {
    const pak = this.paks.get(id);
    if (pak) {
        this.paks.delete(id);
        this.rebuildVfs();
    }
  }

  private rebuildVfs() {
    if ('unmountPak' in this.vfs) {
        for (const pak of this.paks.values()) {
             (this.vfs as any).unmountPak(pak.archive);
        }
    } else {
        this.vfs = new VirtualFileSystem();
    }

    this.palette = null;

    const sortedPaks = Array.from(this.paks.values()).sort((a, b) => a.priority - b.priority);

    for (const pak of sortedPaks) {
        this.vfs.mountPak(pak.archive, pak.priority);
    }
    this.tryLoadPalette();
  }

  updatePakPriority(id: string, priority: number): void {
      const pak = this.paks.get(id);
      if (pak) {
          pak.priority = priority;
          if ('setPriority' in this.vfs) {
              (this.vfs as any).setPriority(pak.archive, priority);
          } else {
              this.rebuildVfs();
          }
      }
  }

  reorderPaks(pakIds: string[]): void {
      pakIds.forEach((id, index) => {
          const pak = this.paks.get(id);
          if (pak) {
             const newPriority = MOD_PRIORITY.USER_OVERRIDE + (index * 10);
             pak.priority = newPriority;
             if ('setPriority' in this.vfs) {
                 (this.vfs as any).setPriority(pak.archive, newPriority);
             }
          }
      });

      if (!('setPriority' in this.vfs)) {
          this.rebuildVfs();
      }
  }

  private async tryLoadPalette(): Promise<void> {
    if (this.palette) return;

    const palettePaths = ['pics/colormap.pcx', 'colormap.pcx'];
    for (const path of palettePaths) {
      if (this.vfs.hasFile(path)) {
        try {
          const data = await this.vfs.readFile(path);
          const pcx = parsePcx(toArrayBuffer(data));
          this.palette = pcx.palette;
          return;
        } catch {
          // Continue to next path
        }
      }
    }
  }

  getPalette(): Uint8Array | null {
    return this.palette;
  }

  getVfs(): VirtualFileSystem {
    return this.vfs;
  }

  getMountedPaks(): MountedPak[] {
    return Array.from(this.paks.values());
  }

  listDirectory(path?: string): DirectoryListing {
    return this.vfs.list(path) as DirectoryListing;
  }

  hasFile(path: string): boolean {
    return this.vfs.hasFile(path);
  }

  getFileMetadata(path: string): FileMetadata | undefined {
    const handle = this.vfs.stat(path);
    if (!handle) return undefined;

    const pakInfo = this.paks.get(handle.sourcePak);
    const sourcePakName = pakInfo ? pakInfo.name : handle.sourcePak;

    return {
      path: handle.path,
      name: getFileName(handle.path),
      size: handle.size,
      sourcePak: sourcePakName,
      extension: getExtension(handle.path),
      fileType: getFileType(handle.path),
    };
  }

  async readFile(path: string): Promise<Uint8Array> {
    return this.vfs.readFile(path);
  }

  async parseFile(path: string): Promise<ParsedFile> {
    const fileType = getFileType(path);

    // Check cache for expensive assets
    let cacheKey: string | null = null;
    if (['md2', 'md3', 'bsp'].includes(fileType)) {
      const stat = this.vfs.stat(path);
      if (stat) {
        const pak = this.paks.get(stat.sourcePak);
        if (pak && pak.hash) {
          cacheKey = `${pak.hash}:${path}`;
          try {
            const cached = await cacheService.get<ParsedFile>(CACHE_STORES.ASSET_METADATA, cacheKey);
            if (cached) return cached;
          } catch (e) { /* ignore */ }
        }
      }
    }

    const data = await this.readFile(path);
    const buffer = toArrayBuffer(data);

    if (fileType === 'txt' || fileType === 'dm2' || fileType === 'unknown') {
         return this.parseFileFallback(path, buffer, fileType, data);
    }

    try {
      let result: any;

      switch (fileType) {
        case 'pcx':
          result = await workerService.executeAssetProcessorTask(api => api.processPcx(buffer));
          break;
        case 'wal':
          result = await workerService.executeAssetProcessorTask(api => api.processWal(buffer, this.palette));
          break;
        case 'tga':
          result = await workerService.executeAssetProcessorTask(api => api.processTga(buffer));
          break;
        case 'md2':
          result = await workerService.executeAssetProcessorTask(api => api.processMd2(buffer));
          break;
        case 'md3':
          result = await workerService.executeAssetProcessorTask(api => api.processMd3(buffer));
          break;
        case 'sp2':
          result = await workerService.executeAssetProcessorTask(api => api.processSp2(buffer));
          break;
        case 'wav':
          result = await workerService.executeAssetProcessorTask(api => api.processWav(buffer));
          break;
        case 'bsp':
          result = await workerService.executeAssetProcessorTask(api => api.processBsp(buffer));
          break;
        default:
           return this.parseFileFallback(path, buffer, fileType, data);
      }
      if (cacheKey && result) {
        cacheService.set(CACHE_STORES.ASSET_METADATA, cacheKey, result).catch(e => console.warn(e));
      }
      return result as ParsedFile;
    } catch (e) {
      console.warn(`Worker processing failed for ${path}, falling back to main thread`, e);
      return this.parseFileFallback(path, buffer, fileType, data);
    }
  }

  private parseFileFallback(path: string, buffer: ArrayBuffer, fileType: FileType, data: Uint8Array): ParsedFile {
    switch (fileType) {
      case 'pcx': {
        const image = parsePcx(buffer);
        const rgba = pcxToRgba(image);
        return { type: 'pcx', image, rgba, width: image.width, height: image.height };
      }
      case 'wal': {
        const texture = parseWal(buffer);
        let rgba: Uint8Array | null = null;
        let mipmaps: { width: number; height: number; rgba: Uint8Array }[] = [];
        if (this.palette) {
          const prepared = walToRgba(texture, this.palette);
          rgba = prepared.levels[0]?.rgba ?? null;
          // @ts-ignore
          mipmaps = prepared.levels;
        }
        return { type: 'wal', texture, rgba, width: texture.width, height: texture.height, mipmaps };
      }
      case 'tga': {
        const image = parseTga(buffer);
        return { type: 'tga', image, rgba: image.pixels, width: image.width, height: image.height };
      }
      case 'md2': {
        try {
          const model = parseMd2(buffer);
          const animations = groupMd2Animations(model.frames);
          return { type: 'md2', model, animations };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          console.warn(`Failed to parse MD2 file ${path}:`, e);
          return { type: 'unknown', data, error };
        }
      }
      case 'md3': {
        try {
          const model = parseMd3(buffer);
          return { type: 'md3', model };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          console.warn(`Failed to parse MD3 file ${path}:`, e);
          return { type: 'unknown', data, error };
        }
      }
      case 'bsp': {
        try {
          const map = parseBsp(buffer);
          return { type: 'bsp', map };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          console.warn(`Failed to parse BSP file ${path}:`, e);
          return { type: 'unknown', data, error };
        }
      }
      case 'dm2': {
        return { type: 'dm2', data };
      }
      case 'sp2': {
        try {
          const model = parseSprite(buffer);
          return { type: 'sp2', model };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          console.warn(`Failed to parse SP2 file ${path}:`, e);
          return { type: 'unknown', data, error };
        }
      }
      case 'wav': {
        const audio = parseWav(buffer);
        return { type: 'wav', audio };
      }
      case 'txt': {
        const content = new TextDecoder().decode(data);
        return { type: 'txt', content };
      }
      default:
        return { type: 'unknown', data };
    }
  }

  buildFileTree(mode: ViewMode = 'merged'): TreeNode {
    const root: TreeNode = {
      name: 'root',
      path: '',
      isDirectory: true,
      children: [],
    };

    if (mode === 'by-pak') {
        for (const pak of this.paks.values()) {
            const pakRoot: TreeNode = {
                name: pak.name,
                path: pak.id,
                isDirectory: true,
                isPakRoot: true,
                pakId: pak.id,
                isUserPak: pak.isUser,
                children: []
            };

            const pakFiles: VirtualFileHandle[] = [];
            const gatherFiles = (dirPath?: string) => {
                const listing = this.vfs.list(dirPath);
                for (const file of listing.files) {
                    if (file.sourcePak === pak.id) {
                        pakFiles.push(file);
                    }
                }
                for (const subDir of listing.directories) {
                    const fullPath = dirPath ? `${dirPath}/${subDir}` : subDir;
                    gatherFiles(fullPath);
                }
            };
            gatherFiles();

            this.buildSubTree(pakRoot, pakFiles);
            root.children!.push(pakRoot);
        }

    } else {
        const allFiles: VirtualFileHandle[] = [];
        const gatherFiles = (dirPath?: string) => {
            const listing = this.listDirectory(dirPath);
            allFiles.push(...listing.files);
            for (const subDir of listing.directories) {
                const fullPath = dirPath ? `${dirPath}/${subDir}` : subDir;
                gatherFiles(fullPath);
            }
        };
        gatherFiles();

        this.buildSubTree(root, allFiles);
    }

    this.sortTree(root);
    return root;
  }

  private buildSubTree(root: TreeNode, files: VirtualFileHandle[]) {
     const nodeMap = new Map<string, TreeNode>();
     nodeMap.set('', root);

     const allDirs = new Set<string>();
     for (const file of files) {
       const parts = file.path.split('/');
       let currentPath = '';
       for (let i = 0; i < parts.length - 1; i++) {
         currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
         allDirs.add(currentPath);
       }
     }

     const sortedDirs = Array.from(allDirs).sort();
     for (const dirPath of sortedDirs) {
       const parts = dirPath.split('/');
       const name = parts.pop()!;
       const parentPath = parts.join('/');
       const parent = nodeMap.get(parentPath) || root;

       const dirNode: TreeNode = {
         name,
         path: dirPath,
         isDirectory: true,
         children: [],
       };

       const nodePath = root.pakId ? `${root.pakId}:${dirPath}` : dirPath;

       const displayNode: TreeNode = {
           ...dirNode,
           path: nodePath
       };

       nodeMap.set(dirPath, displayNode);
       parent.children!.push(displayNode);
     }

     for (const file of files) {
       const parts = file.path.split('/');
       const name = parts.pop()!;
       const parentPath = parts.join('/');
       const parent = nodeMap.get(parentPath) || root;

       const nodePath = root.pakId ? `${root.pakId}:${file.path}` : file.path;

       const fileNode: TreeNode = {
         name,
         path: nodePath,
         isDirectory: false,
         file,
       };
       parent.children!.push(fileNode);
     }
  }

  private sortTree(node: TreeNode) {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(child => this.sortTree(child));
      }
  }

  static getVfsPath(treePath: string): string {
      if (treePath.includes(':')) {
          const parts = treePath.split(':');
          return parts.slice(1).join(':');
      }
      return treePath;
  }

  findByExtension(extension: string): VirtualFileHandle[] {
    return this.vfs.findByExtension(extension) as VirtualFileHandle[];
  }

  clear(): void {
    this.paks.clear();
    this.palette = null;
    this.vfs = new VirtualFileSystem();
  }
}

let pakServiceInstance: PakService | null = null;

export function getPakService(): PakService {
  if (!pakServiceInstance) {
    pakServiceInstance = new PakService();
  }
  return pakServiceInstance;
}

export const pakService = getPakService();

export function resetPakService(): void {
  pakServiceInstance = null;
}
