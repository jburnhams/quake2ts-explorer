import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock quake2ts/engine with configurable file lists
let mockFileList: Array<{ path: string; size: number; sourcePak: string }> = [];

jest.mock('quake2ts/engine', () => ({
  PakArchive: {
    fromArrayBuffer: jest.fn((name: string) => ({
      name,
      entries: new Map(),
      checksum: 12345,
      size: 1024,
      listEntries: () => mockFileList.map(f => ({ name: f.path, offset: 0, length: f.size })),
    })),
  },
  VirtualFileSystem: jest.fn().mockImplementation(() => {
    const files = new Map<string, { path: string; size: number; sourcePak: string }>();
    return {
      mountPak: jest.fn((archive: { name: string; listEntries: () => Array<{ name: string; length: number }> }) => {
        for (const entry of archive.listEntries()) {
          files.set(entry.name, {
            path: entry.name,
            size: entry.length,
            sourcePak: archive.name,
          });
        }
      }),
      hasFile: jest.fn((path: string) => files.has(path)),
      stat: jest.fn((path: string) => files.get(path)),
      readFile: jest.fn(async (path: string) => {
        if (!files.has(path)) throw new Error(`File not found: ${path}`);
        return new Uint8Array(files.get(path)!.size);
      }),
      list: jest.fn((dirPath?: string) => {
        const prefix = dirPath ? `${dirPath}/` : '';
        const filesInDir: Array<{ path: string; size: number; sourcePak: string }> = [];
        const directories = new Set<string>();

        for (const file of files.values()) {
          if (dirPath) {
            if (!file.path.startsWith(prefix)) continue;
          }

          const relativePath = dirPath ? file.path.slice(prefix.length) : file.path;
          const slashIndex = relativePath.indexOf('/');

          if (slashIndex === -1) {
            filesInDir.push(file);
          } else {
            directories.add(relativePath.slice(0, slashIndex));
          }
        }

        return {
          files: filesInDir,
          directories: Array.from(directories),
        };
      }),
      findByExtension: jest.fn((ext: string) =>
        Array.from(files.values()).filter(f => f.path.endsWith(ext))
      ),
    };
  }),
  parsePcx: jest.fn(() => ({ width: 64, height: 64, bitsPerPixel: 8, palette: new Uint8Array(768) })),
  pcxToRgba: jest.fn(() => new Uint8Array(64 * 64 * 4)),
  parseWal: jest.fn(() => ({ name: 'test', width: 64, height: 64, mipmaps: [] })),
  walToRgba: jest.fn(() => ({ levels: [{ level: 0, width: 64, height: 64, rgba: new Uint8Array(64 * 64 * 4) }] })),
  parseMd2: jest.fn(() => ({ header: { numFrames: 10 } })),
  parseMd3: jest.fn(() => ({ header: { numFrames: 5 } })),
  parseWav: jest.fn(() => ({ channels: 1, sampleRate: 22050, bitsPerSample: 16, samples: new Int16Array(22050) })),
}));

import { PakService } from '@/src/services/pakService';

describe('PakService.buildFileTree - Comprehensive Tests', () => {
  let service: PakService;

  beforeEach(() => {
    mockFileList = [];
    service = new PakService();
  });

  describe('empty PAK handling', () => {
    it('returns root with empty children for empty PAK', async () => {
      mockFileList = [];
      await service.loadPakFromBuffer('empty.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.name).toBe('root');
      expect(tree.isDirectory).toBe(true);
      expect(tree.children).toEqual([]);
    });
  });

  describe('single file handling', () => {
    it('handles single file at root level', async () => {
      mockFileList = [{ path: 'readme.txt', size: 100, sourcePak: 'test.pak' }];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children).toHaveLength(1);
      expect(tree.children![0].name).toBe('readme.txt');
      expect(tree.children![0].isDirectory).toBe(false);
    });

    it('handles single file in subdirectory', async () => {
      mockFileList = [{ path: 'pics/logo.pcx', size: 200, sourcePak: 'test.pak' }];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children).toHaveLength(1);
      expect(tree.children![0].name).toBe('pics');
      expect(tree.children![0].isDirectory).toBe(true);
      expect(tree.children![0].children).toHaveLength(1);
      expect(tree.children![0].children![0].name).toBe('logo.pcx');
    });
  });

  describe('deep directory nesting', () => {
    it('handles deeply nested file paths (3 levels)', async () => {
      mockFileList = [{ path: 'textures/e1u1/wall.wal', size: 4096, sourcePak: 'test.pak' }];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children).toHaveLength(1);

      const textures = tree.children![0];
      expect(textures.name).toBe('textures');
      expect(textures.isDirectory).toBe(true);

      const e1u1 = textures.children![0];
      expect(e1u1.name).toBe('e1u1');
      expect(e1u1.isDirectory).toBe(true);

      const wall = e1u1.children![0];
      expect(wall.name).toBe('wall.wal');
      expect(wall.isDirectory).toBe(false);
    });

    it('handles deeply nested file paths (5 levels)', async () => {
      mockFileList = [{ path: 'a/b/c/d/e/file.txt', size: 10, sourcePak: 'test.pak' }];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      let current = tree;
      const expectedDirs = ['a', 'b', 'c', 'd', 'e'];

      for (const dir of expectedDirs) {
        expect(current.children).toHaveLength(1);
        current = current.children![0];
        expect(current.name).toBe(dir);
        expect(current.isDirectory).toBe(true);
      }

      expect(current.children).toHaveLength(1);
      expect(current.children![0].name).toBe('file.txt');
      expect(current.children![0].isDirectory).toBe(false);
    });
  });

  describe('multiple files in same directory', () => {
    it('groups multiple files in same directory', async () => {
      mockFileList = [
        { path: 'pics/logo.pcx', size: 200, sourcePak: 'test.pak' },
        { path: 'pics/menu.pcx', size: 300, sourcePak: 'test.pak' },
        { path: 'pics/help.pcx', size: 250, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children).toHaveLength(1);

      const pics = tree.children![0];
      expect(pics.name).toBe('pics');
      expect(pics.children).toHaveLength(3);
      expect(pics.children!.map(c => c.name).sort()).toEqual(['help.pcx', 'logo.pcx', 'menu.pcx']);
    });
  });

  describe('mixed directory and file levels', () => {
    it('handles files at root and in subdirectories', async () => {
      mockFileList = [
        { path: 'readme.txt', size: 100, sourcePak: 'test.pak' },
        { path: 'config.cfg', size: 50, sourcePak: 'test.pak' },
        { path: 'pics/logo.pcx', size: 200, sourcePak: 'test.pak' },
        { path: 'models/player.md2', size: 1000, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      // Should have: models/, pics/, config.cfg, readme.txt (dirs first, then files, alphabetically)
      expect(tree.children).toHaveLength(4);
      expect(tree.children![0].name).toBe('models');
      expect(tree.children![0].isDirectory).toBe(true);
      expect(tree.children![1].name).toBe('pics');
      expect(tree.children![1].isDirectory).toBe(true);
      expect(tree.children![2].name).toBe('config.cfg');
      expect(tree.children![2].isDirectory).toBe(false);
      expect(tree.children![3].name).toBe('readme.txt');
      expect(tree.children![3].isDirectory).toBe(false);
    });
  });

  describe('sibling directories', () => {
    it('creates separate sibling directory branches', async () => {
      mockFileList = [
        { path: 'env/sky1.pcx', size: 10000, sourcePak: 'test.pak' },
        { path: 'maps/demo1.bsp', size: 50000, sourcePak: 'test.pak' },
        { path: 'sound/berserk/attack.wav', size: 20000, sourcePak: 'test.pak' },
        { path: 'textures/e1u1/wall.wal', size: 4096, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children).toHaveLength(4);

      const dirNames = tree.children!.map(c => c.name);
      expect(dirNames).toEqual(['env', 'maps', 'sound', 'textures']);

      // Verify nested structure
      const sound = tree.children!.find(c => c.name === 'sound');
      expect(sound?.children).toHaveLength(1);
      expect(sound?.children![0].name).toBe('berserk');
      expect(sound?.children![0].children).toHaveLength(1);
      expect(sound?.children![0].children![0].name).toBe('attack.wav');
    });
  });

  describe('sorting behavior', () => {
    it('sorts directories before files', async () => {
      mockFileList = [
        { path: 'zzz.txt', size: 10, sourcePak: 'test.pak' },
        { path: 'aaa/file.txt', size: 10, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children![0].name).toBe('aaa');
      expect(tree.children![0].isDirectory).toBe(true);
      expect(tree.children![1].name).toBe('zzz.txt');
      expect(tree.children![1].isDirectory).toBe(false);
    });

    it('sorts alphabetically within directories and files', async () => {
      mockFileList = [
        { path: 'zebra/file.txt', size: 10, sourcePak: 'test.pak' },
        { path: 'alpha/file.txt', size: 10, sourcePak: 'test.pak' },
        { path: 'zzz.txt', size: 10, sourcePak: 'test.pak' },
        { path: 'aaa.txt', size: 10, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children![0].name).toBe('alpha');
      expect(tree.children![1].name).toBe('zebra');
      expect(tree.children![2].name).toBe('aaa.txt');
      expect(tree.children![3].name).toBe('zzz.txt');
    });

    it('sorts recursively in nested directories', async () => {
      mockFileList = [
        { path: 'pics/z.pcx', size: 10, sourcePak: 'test.pak' },
        { path: 'pics/a.pcx', size: 10, sourcePak: 'test.pak' },
        { path: 'pics/icons/z.pcx', size: 10, sourcePak: 'test.pak' },
        { path: 'pics/icons/a.pcx', size: 10, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      const pics = tree.children![0];
      // icons dir comes first
      expect(pics.children![0].name).toBe('icons');
      expect(pics.children![1].name).toBe('a.pcx');
      expect(pics.children![2].name).toBe('z.pcx');

      // Inside icons
      const icons = pics.children![0];
      expect(icons.children![0].name).toBe('a.pcx');
      expect(icons.children![1].name).toBe('z.pcx');
    });
  });

  describe('real-world PAK structure simulation', () => {
    it('handles typical Quake 2 PAK structure', async () => {
      mockFileList = [
        { path: 'default.cfg', size: 2260, sourcePak: 'pak.pak' },
        { path: 'demos/demo1.dm2', size: 354093, sourcePak: 'pak.pak' },
        { path: 'env/sky1bk.pcx', size: 354093, sourcePak: 'pak.pak' },
        { path: 'env/sky1rt.pcx', size: 85508, sourcePak: 'pak.pak' },
        { path: 'env/sky1rt.tga', size: 89088, sourcePak: 'pak.pak' },
        { path: 'maps/demo1.bsp', size: 201040, sourcePak: 'pak.pak' },
        { path: 'sound/berserk/attack.wav', size: 1983276, sourcePak: 'pak.pak' },
        { path: 'textures/e1u1/btactmach.wal', size: 9707, sourcePak: 'pak.pak' },
        { path: 'textures/e1u1/clip.wal', size: 1460, sourcePak: 'pak.pak' },
      ];
      await service.loadPakFromBuffer('pak.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();

      // Verify top-level structure: 5 directories + 1 file
      expect(tree.children).toHaveLength(6);

      const names = tree.children!.map(c => c.name);
      expect(names).toEqual(['demos', 'env', 'maps', 'sound', 'textures', 'default.cfg']);

      // Verify demos has 1 file
      const demos = tree.children!.find(c => c.name === 'demos');
      expect(demos?.children).toHaveLength(1);
      expect(demos?.children![0].name).toBe('demo1.dm2');

      // Verify env has 3 files
      const env = tree.children!.find(c => c.name === 'env');
      expect(env?.children).toHaveLength(3);

      // Verify sound/berserk has 1 file (nested)
      const sound = tree.children!.find(c => c.name === 'sound');
      expect(sound?.children).toHaveLength(1);
      expect(sound?.children![0].name).toBe('berserk');
      expect(sound?.children![0].children).toHaveLength(1);

      // Verify textures/e1u1 has 2 files (nested)
      const textures = tree.children!.find(c => c.name === 'textures');
      expect(textures?.children).toHaveLength(1);
      expect(textures?.children![0].name).toBe('e1u1');
      expect(textures?.children![0].children).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('handles files with same name in different directories', async () => {
      mockFileList = [
        { path: 'models/player/skin.pcx', size: 100, sourcePak: 'test.pak' },
        { path: 'models/enemy/skin.pcx', size: 100, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      const models = tree.children![0];
      expect(models.children).toHaveLength(2);

      const enemy = models.children!.find(c => c.name === 'enemy');
      const player = models.children!.find(c => c.name === 'player');

      expect(enemy?.children![0].name).toBe('skin.pcx');
      expect(enemy?.children![0].path).toBe('models/enemy/skin.pcx');
      expect(player?.children![0].name).toBe('skin.pcx');
      expect(player?.children![0].path).toBe('models/player/skin.pcx');
    });

    it('handles files with dots in directory names', async () => {
      mockFileList = [
        { path: 'v1.0/readme.txt', size: 100, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children![0].name).toBe('v1.0');
      expect(tree.children![0].isDirectory).toBe(true);
    });

    it('handles files with spaces in names', async () => {
      mockFileList = [
        { path: 'my folder/my file.txt', size: 100, sourcePak: 'test.pak' },
      ];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      expect(tree.children![0].name).toBe('my folder');
      expect(tree.children![0].children![0].name).toBe('my file.txt');
    });

    it('handles very long file paths', async () => {
      const longPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/file.txt';
      mockFileList = [{ path: longPath, size: 100, sourcePak: 'test.pak' }];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      let current = tree;
      const parts = longPath.split('/');

      for (let i = 0; i < parts.length - 1; i++) {
        expect(current.children).toHaveLength(1);
        current = current.children![0];
        expect(current.name).toBe(parts[i]);
        expect(current.isDirectory).toBe(true);
      }

      expect(current.children![0].name).toBe('file.txt');
    });
  });

  describe('file handle preservation', () => {
    it('preserves file handle reference in tree nodes', async () => {
      mockFileList = [{ path: 'test.txt', size: 100, sourcePak: 'my.pak' }];
      await service.loadPakFromBuffer('my.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      const fileNode = tree.children![0];

      expect(fileNode.file).toBeDefined();
      expect(fileNode.file?.path).toBe('test.txt');
      expect(fileNode.file?.size).toBe(100);
      expect(fileNode.file?.sourcePak).toBe('my.pak');
    });

    it('directories do not have file handles', async () => {
      mockFileList = [{ path: 'dir/test.txt', size: 100, sourcePak: 'test.pak' }];
      await service.loadPakFromBuffer('test.pak', new ArrayBuffer(1024));

      const tree = service.buildFileTree();
      const dirNode = tree.children![0];

      expect(dirNode.isDirectory).toBe(true);
      expect(dirNode.file).toBeUndefined();
    });
  });
});
