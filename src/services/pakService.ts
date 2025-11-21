import {
  PakArchive,
  VirtualFileSystem,
  parsePcx,
  pcxToRgba,
  parseWal,
  walToRgba,
  parseMd2,
  parseMd3,
  parseWav,
  type PcxImage,
  type WalTexture,
  type Md2Model,
  type Md3Model,
  type WavData,
} from 'quake2ts/engine';

// Re-define interfaces since they're not exported from quake2ts/engine
export interface VirtualFileHandle {
  readonly path: string;
  readonly size: number;
  readonly sourcePak: string;
}

export interface DirectoryListing {
  readonly files: VirtualFileHandle[];
  readonly directories: string[];
}

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
  rgba: Uint8Array | null; // null if no palette loaded
  width: number;
  height: number;
}

export interface ParsedMd2 {
  type: 'md2';
  model: Md2Model;
}

export interface ParsedMd3 {
  type: 'md3';
  model: Md3Model;
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
}

export type ParsedFile = ParsedPcx | ParsedWal | ParsedMd2 | ParsedMd3 | ParsedWav | ParsedText | ParsedUnknown;

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  file?: VirtualFileHandle;
}

// Use helper function
function getFileType(path: string): FileType {
  return getFileTypeHelper(path);
}

export class PakService {
  private vfs: VirtualFileSystem;
  private archives: PakArchive[] = [];
  private palette: Uint8Array | null = null;

  constructor(vfs?: VirtualFileSystem) {
    this.vfs = vfs ?? new VirtualFileSystem();
  }

  async loadPakFile(file: File): Promise<PakArchive> {
    const buffer = await file.arrayBuffer();
    const archive = PakArchive.fromArrayBuffer(file.name, buffer);
    this.archives.push(archive);
    this.vfs.mountPak(archive);
    // Try to load palette from colormap
    await this.tryLoadPalette();
    return archive;
  }

  async loadPakFromBuffer(name: string, buffer: ArrayBuffer): Promise<PakArchive> {
    const archive = PakArchive.fromArrayBuffer(name, buffer);
    this.archives.push(archive);
    this.vfs.mountPak(archive);
    await this.tryLoadPalette();
    return archive;
  }

  private async tryLoadPalette(): Promise<void> {
    if (this.palette) return;

    // Try common palette locations
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

  getMountedPaks(): readonly PakArchive[] {
    return this.archives;
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
    return {
      path: handle.path,
      name: getFileName(handle.path),
      size: handle.size,
      sourcePak: handle.sourcePak,
      extension: getExtension(handle.path),
      fileType: getFileType(handle.path),
    };
  }

  async readFile(path: string): Promise<Uint8Array> {
    return this.vfs.readFile(path);
  }

  async parseFile(path: string): Promise<ParsedFile> {
    const data = await this.readFile(path);
    const buffer = toArrayBuffer(data);
    const fileType = getFileType(path);

    switch (fileType) {
      case 'pcx': {
        const image = parsePcx(buffer);
        const rgba = pcxToRgba(image);
        return { type: 'pcx', image, rgba, width: image.width, height: image.height };
      }
      case 'wal': {
        const texture = parseWal(buffer);
        let rgba: Uint8Array | null = null;
        if (this.palette) {
          const prepared = walToRgba(texture, this.palette);
          rgba = prepared.levels[0]?.rgba ?? null;
        }
        return { type: 'wal', texture, rgba, width: texture.width, height: texture.height };
      }
      case 'md2': {
        const model = parseMd2(buffer);
        return { type: 'md2', model };
      }
      case 'md3': {
        const model = parseMd3(buffer);
        return { type: 'md3', model };
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

  buildFileTree(): TreeNode {
    const root: TreeNode = {
      name: 'root',
      path: '',
      isDirectory: true,
      children: [],
    };

    // Recursively gather all files from VFS
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

    const nodeMap = new Map<string, TreeNode>();
    nodeMap.set('', root);

    // Create directory nodes
    const allDirs = new Set<string>();
    for (const file of allFiles) {
      const parts = file.path.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        allDirs.add(currentPath);
      }
    }

    // Sort directories so parents come first
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
      nodeMap.set(dirPath, dirNode);
      parent.children!.push(dirNode);
    }

    // Add file nodes
    for (const file of allFiles) {
      const parts = file.path.split('/');
      const name = parts.pop()!;
      const parentPath = parts.join('/');
      const parent = nodeMap.get(parentPath) || root;

      const fileNode: TreeNode = {
        name,
        path: file.path,
        isDirectory: false,
        file,
      };
      parent.children!.push(fileNode);
    }

    // Sort children: directories first, then files, alphabetically
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortChildren);
      }
    };
    sortChildren(root);

    return root;
  }

  findByExtension(extension: string): VirtualFileHandle[] {
    return this.vfs.findByExtension(extension) as VirtualFileHandle[];
  }

  clear(): void {
    this.archives = [];
    this.palette = null;
    this.vfs = new VirtualFileSystem();
  }
}

// Singleton instance for app-wide use
let pakServiceInstance: PakService | null = null;

export function getPakService(): PakService {
  if (!pakServiceInstance) {
    pakServiceInstance = new PakService();
  }
  return pakServiceInstance;
}

export function resetPakService(): void {
  pakServiceInstance = null;
}
