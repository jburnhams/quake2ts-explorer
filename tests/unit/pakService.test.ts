

// Mock worker service first to avoid import issues
vi.mock('@/src/services/workerService', () => ({
    workerService: {
        getPakParser: vi.fn(() => ({
            parsePak: vi.fn(async (name: string, buffer: ArrayBuffer) => ({
                entries: new Map([
                    ['test.txt', { name: 'test.txt', offset: 0, length: 100 }],
                    ['pics/test.pcx', { name: 'pics/test.pcx', offset: 100, length: 200 }],
                    ['models/test.md2', { name: 'models/test.md2', offset: 300, length: 500 }],
                    ['sprites/test.sp2', { name: 'sprites/test.sp2', offset: 800, length: 100 }],
                    ['maps/test.bsp', { name: 'maps/test.bsp', offset: 1200, length: 2000 }],
                ]),
                buffer,
                name
            }))
        })),
        executePakParserTask: vi.fn(async (task) => {
            const api = {
                parsePak: vi.fn(async (name: string, buffer: ArrayBuffer) => ({
                    entries: new Map([
                        ['test.txt', { name: 'test.txt', offset: 0, length: 100 }],
                        ['pics/test.pcx', { name: 'pics/test.pcx', offset: 100, length: 200 }],
                        ['models/test.md2', { name: 'models/test.md2', offset: 300, length: 500 }],
                        ['sprites/test.sp2', { name: 'sprites/test.sp2', offset: 800, length: 100 }],
                        ['maps/test.bsp', { name: 'maps/test.bsp', offset: 1200, length: 2000 }],
                    ]),
                    buffer,
                    name
                }))
            };
            return task(api);
        }),
        executeAssetProcessorTask: vi.fn(async (task) => {
             const api = {
                 processPcx: vi.fn(() => ({ type: 'pcx', image: { width: 64, height: 64 } })),
                 processWal: vi.fn(() => ({ type: 'wal', texture: { width: 64, height: 64 } })),
                 processTga: vi.fn(() => ({ type: 'tga', image: { width: 64, height: 64 } })),
                 processMd2: vi.fn(() => ({ type: 'md2', model: {} })),
                 processMd3: vi.fn(() => ({ type: 'md3', model: {} })),
                 processSp2: vi.fn(() => ({ type: 'sp2', model: {} })),
                 processWav: vi.fn(() => ({ type: 'wav', audio: {} })),
                 processBsp: vi.fn(() => ({ type: 'bsp', map: {} }))
             };
             return task(api);
        })
    }
}));

// Mock quake2ts/engine before importing pakService
vi.mock('@quake2ts/engine', () => ({
  PakArchive: {
    fromArrayBuffer: vi.fn((name: string, _buffer: ArrayBuffer) => ({
      name,
      entries: new Map([
        ['test.txt', { name: 'test.txt', offset: 0, length: 100 }],
        ['pics/test.pcx', { name: 'pics/test.pcx', offset: 100, length: 200 }],
        ['models/test.md2', { name: 'models/test.md2', offset: 300, length: 500 }],
        ['sprites/test.sp2', { name: 'sprites/test.sp2', offset: 800, length: 100 }],
        ['maps/test.bsp', { name: 'maps/test.bsp', offset: 1200, length: 2000 }],
      ]),
      checksum: 12345,
      size: 1024,
      listEntries: () => [
        { name: 'test.txt', offset: 0, length: 100 },
        { name: 'pics/test.pcx', offset: 100, length: 200 },
        { name: 'models/test.md2', offset: 300, length: 500 },
        { name: 'sprites/test.sp2', offset: 800, length: 100 },
        { name: 'maps/test.bsp', offset: 1200, length: 2000 },
      ],
    })),
  },
  VirtualFileSystem: vi.fn().mockImplementation(() => {
    const files = new Map<string, { path: string; size: number; sourcePak: string }>();
    return {
      mountPak: vi.fn((archive: { name: string; listEntries: () => Array<{ name: string; length: number }> }) => {
        // Handle both standard PakArchive (mocked above) and WorkerPakArchive
        const entries = typeof archive.listEntries === 'function' ? archive.listEntries() : [];
        for (const entry of entries) {
          files.set(entry.name, {
            path: entry.name,
            size: entry.length || 0,
            sourcePak: archive.name,
          });
        }
      }),
      hasFile: vi.fn((path: string) => files.has(path)),
      stat: vi.fn((path: string) => files.get(path)),
      readFile: vi.fn(async (path: string) => {
        if (!files.has(path)) throw new Error(`File not found: ${path}`);
        return new Uint8Array(files.get(path)!.size);
      }),
      list: vi.fn((dirPath?: string) => {
        const prefix = dirPath ? `${dirPath}/` : '';
        const filesInDir: Array<{ path: string; size: number; sourcePak: string }> = [];
        const directories = new Set<string>();

        for (const file of files.values()) {
          if (dirPath) {
            // Files must start with dirPath/
            if (!file.path.startsWith(prefix)) continue;
          }

          const relativePath = dirPath ? file.path.slice(prefix.length) : file.path;
          const slashIndex = relativePath.indexOf('/');

          if (slashIndex === -1) {
            // File is directly in this directory
            filesInDir.push(file);
          } else {
            // File is in a subdirectory
            directories.add(relativePath.slice(0, slashIndex));
          }
        }

        return {
          files: filesInDir,
          directories: Array.from(directories),
        };
      }),
      findByExtension: vi.fn((ext: string) =>
        Array.from(files.values()).filter(f => f.path.endsWith(ext))
      ),
    };
  }),
  parsePcx: vi.fn(() => ({
    width: 64,
    height: 64,
    bitsPerPixel: 8,
    palette: new Uint8Array(768),
  })),
  pcxToRgba: vi.fn(() => new Uint8Array(64 * 64 * 4)),
  parseWal: vi.fn(() => ({
    name: 'test',
    width: 64,
    height: 64,
    mipmaps: [{ level: 0, width: 64, height: 64, data: new Uint8Array(64 * 64) }],
  })),
  walToRgba: vi.fn(() => ({
    levels: [{ level: 0, width: 64, height: 64, rgba: new Uint8Array(64 * 64 * 4) }],
  })),
  parseMd2: vi.fn(() => ({
    header: { numFrames: 10, numVertices: 100, numTriangles: 50, numSkins: 1, numGlCommands: 200, skinWidth: 256, skinHeight: 256 },
    skins: [{ name: 'models/test/skin.pcx' }],
    frames: [{ name: 'stand01', vertices: [] }, { name: 'stand02', vertices: [] }],
  })),
  groupMd2Animations: vi.fn(() => [
    { name: 'stand', firstFrame: 0, lastFrame: 1 },
  ]),
  parseMd3: vi.fn(() => ({
    header: { numFrames: 5, numSurfaces: 2, numTags: 1 },
  })),
  parseWav: vi.fn(() => ({
    channels: 1,
    sampleRate: 22050,
    bitsPerSample: 16,
    samples: new Int16Array(22050),
  })),
  parseBsp: vi.fn(() => ({
    header: { version: 38, lumps: new Map() },
    entities: { raw: '', entities: [], worldspawn: undefined },
    models: [],
    faces: [],
    vertices: [],
    texInfo: [],
    leafs: [],
  })),
}));

vi.mock('../../src/utils/sp2Parser', () => ({
  parseSprite: vi.fn(() => ({
    ident: 0x32534449,
    version: 2,
    numFrames: 1,
    frames: [{ name: 'test.pcx' }]
  }))
}));

import { PakService, getPakService, resetPakService } from '@/src/services/pakService';

describe('PakService', () => {
  let service: PakService;

  beforeEach(() => {
    service = new PakService();
    resetPakService();
  });

  describe('loadPakFromBuffer', () => {
    it('loads a PAK file from ArrayBuffer', async () => {
      const buffer = new ArrayBuffer(1024);
      const archive = await service.loadPakFromBuffer('test.pak', buffer);

      expect(archive).toBeDefined();
      // archive.name is now a UUID, but we verify it loaded by checking metadata map
      const pakInfo = service.getMountedPaks()[0];
      expect(pakInfo.name).toBe('test.pak');
    });

    it('mounts the PAK to the VFS', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      expect(service.getMountedPaks().length).toBe(1);
    });
  });

  describe('listDirectory', () => {
    it('returns files from root directory', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const listing = service.listDirectory();
      // Only test.txt is at root level
      expect(listing.files.length).toBe(1);
      expect(listing.files[0].path).toBe('test.txt');
    });

    it('returns subdirectories from root', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const listing = service.listDirectory();
      expect(listing.directories).toContain('pics');
      expect(listing.directories).toContain('models');
    });

    it('returns files from subdirectory', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const listing = service.listDirectory('pics');
      expect(listing.files.length).toBe(1);
      expect(listing.files[0].path).toBe('pics/test.pcx');
    });
  });

  describe('hasFile', () => {
    it('returns true for existing files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      expect(service.hasFile('test.txt')).toBe(true);
    });

    it('returns false for non-existing files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      expect(service.hasFile('nonexistent.txt')).toBe(false);
    });
  });

  describe('getFileMetadata', () => {
    it('returns metadata for existing files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const meta = service.getFileMetadata('test.txt');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('test.txt');
      expect(meta?.fileType).toBe('txt');
      expect(meta?.sourcePak).toBe('test.pak');
    });

    it('returns undefined for non-existing files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      expect(service.getFileMetadata('nonexistent.txt')).toBeUndefined();
    });
  });

  describe('parseFile', () => {
    it('parses PCX files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const parsed = await service.parseFile('pics/test.pcx');
      expect(parsed.type).toBe('pcx');
    });

    it('parses MD2 files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const parsed = await service.parseFile('models/test.md2');
      expect(parsed.type).toBe('md2');
    });

    it('parses SP2 files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const parsed = await service.parseFile('sprites/test.sp2');
      expect(parsed.type).toBe('sp2');
    });

    it('parses BSP files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const parsed = await service.parseFile('maps/test.bsp');
      expect(parsed.type).toBe('bsp');
    });

    it('parses TXT files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const parsed = await service.parseFile('test.txt');
      expect(parsed.type).toBe('txt');
    });
  });

  describe('buildFileTree', () => {
    it('builds a tree structure from files', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const tree = service.buildFileTree();
      expect(tree.name).toBe('root');
      expect(tree.isDirectory).toBe(true);
      expect(tree.children).toBeDefined();
      expect(tree.children!.length).toBeGreaterThan(0);
    });

    it('creates directory nodes for paths', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      const tree = service.buildFileTree();
      const picsDir = tree.children?.find(c => c.name === 'pics');
      expect(picsDir).toBeDefined();
      expect(picsDir?.isDirectory).toBe(true);
    });
  });

  describe('clear', () => {
    it('clears all mounted PAKs', async () => {
      const buffer = new ArrayBuffer(1024);
      await service.loadPakFromBuffer('test.pak', buffer);

      service.clear();
      expect(service.getMountedPaks().length).toBe(0);
    });
  });

  describe('singleton', () => {
    it('getPakService returns the same instance', () => {
      const s1 = getPakService();
      const s2 = getPakService();
      expect(s1).toBe(s2);
    });

    it('resetPakService clears the singleton', () => {
      const s1 = getPakService();
      resetPakService();
      const s2 = getPakService();
      expect(s1).not.toBe(s2);
    });
  });
});
