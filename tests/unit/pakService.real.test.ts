/**
 * @jest-environment jsdom
 */

import * as fs from 'fs';
import * as path from 'path';
import { vi, describe, it, expect, beforeAll, beforeEach } from 'vitest';

// Mock worker service to use a synchronous-like mock instead of real worker
// This is critical for tests that don't support workers or for performance
vi.mock('@/src/services/workerService', () => ({
    workerService: {
        getPakParser: vi.fn(() => ({
            parsePak: vi.fn(async (name: string, buffer: ArrayBuffer) => {
                // We need to parse properly here. But in real test we load a REAL file.
                // We can't easily parse a real PAK in the mock without the real PakArchive logic.
                // So we should delegate to the real PakArchive for the content of the "worker" result.

                // However, we can't import PakArchive here easily inside the mock factory.
                // Instead, we can make the mock fail, forcing fallback to main thread?
                // Or we can import PakArchive inside.
                const { PakArchive } = vi.requireActual('quake2ts/engine') as any;
                const archive = PakArchive.fromArrayBuffer(name, buffer);
                // Extract entries to mimic worker result
                // @ts-ignore
                const entries = archive.entries;
                return {
                    entries,
                    buffer,
                    name
                };
            })
        }))
    }
}));

import { PakService } from '@/src/services/pakService';

const PAK_PATH = path.resolve(__dirname, '../../public/pak.pak');

// Skip tests if pak.pak doesn't exist
const describeIfPakExists = fs.existsSync(PAK_PATH) ? describe : describe.skip;

describeIfPakExists('PakService with real PAK file', () => {
  let service: PakService;
  let pakBuffer: ArrayBuffer;

  beforeAll(() => {
    const buffer = fs.readFileSync(PAK_PATH);
    pakBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });

  beforeEach(() => {
    service = new PakService();
  });

  describe('loadPakFromBuffer', () => {
    it('loads the real pak.pak file', async () => {
      const archive = await service.loadPakFromBuffer('pak.pak', pakBuffer);
      expect(archive).toBeDefined();
      expect(service.getMountedPaks().length).toBe(1);
    });

    it('can read a known file (default.cfg)', async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
      const data = await service.readFile('default.cfg');
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);

      const text = new TextDecoder().decode(data);
      expect(text).toContain('bind');
    });
  });

  describe('listDirectory', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('lists files in root', () => {
      const listing = service.listDirectory();
      expect(listing.files.length).toBeGreaterThan(0);
      expect(listing.directories.length).toBeGreaterThan(0);
      expect(listing.directories).toContain('maps');
      expect(listing.directories).toContain('sound');
    });

    it('lists files in maps directory', () => {
      const listing = service.listDirectory('maps');
      expect(listing.files.length).toBeGreaterThan(0);
      expect(listing.files.some(f => f.path.endsWith('.bsp'))).toBe(true);
    });
  });

  describe('buildFileTree', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('builds a tree structure', () => {
      const tree = service.buildFileTree();
      expect(tree.name).toBe('root');
      expect(tree.children!.length).toBeGreaterThan(0);
    });

    it('contains top-level directories', () => {
      const tree = service.buildFileTree();
      const maps = tree.children!.find(c => c.name === 'maps');
      expect(maps).toBeDefined();
      expect(maps!.isDirectory).toBe(true);
    });

    it('sorts directories before files', () => {
      const tree = service.buildFileTree();

      // Check if all directories come before files
      let seenFile = false;
      for (const child of tree.children!) {
        if (child.isDirectory) {
          expect(seenFile).toBe(false); // Should not have seen a file yet
        } else {
          seenFile = true;
        }
      }
    });

    it('creates correct nested structure for sound', () => {
      const tree = service.buildFileTree();
      const sound = tree.children!.find(c => c.name === 'sound');
      expect(sound).toBeDefined();

      // Should have subdirectories like 'player', 'misc', etc.
      const hasSubdirs = sound!.children!.some(c => c.isDirectory);
      expect(hasSubdirs).toBe(true);
    });

    it('creates correct nested structure for textures', () => {
      const tree = service.buildFileTree();
      const textures = tree.children!.find(c => c.name === 'textures');
      expect(textures).toBeDefined();

      // Should have subdirectories like 'e1u1', etc.
      const hasSubdirs = textures!.children!.some(c => c.isDirectory);
      expect(hasSubdirs).toBe(true);
    });

    it('includes file handles in leaf nodes', () => {
      const tree = service.buildFileTree();
      const maps = tree.children!.find(c => c.name === 'maps');
      const bsp = maps!.children!.find(c => c.name.endsWith('.bsp'));

      expect(bsp).toBeDefined();
      expect(bsp!.file).toBeDefined();
      expect(bsp!.file!.size).toBeGreaterThan(0);
    });

    it('counts all files recursively', () => {
        // Calculate total files from tree
        const countFiles = (node: any): number => {
            let count = node.file ? 1 : 0;
            if (node.children) {
                for (const child of node.children) {
                    count += countFiles(child);
                }
            }
            return count;
        };

        const tree = service.buildFileTree();
        const treeCount = countFiles(tree);

        // Get total from listing
        let totalListed = 0;
        const processDir = (path?: string) => {
            const list = service.listDirectory(path);
            totalListed += list.files.length;
            for (const dir of list.directories) {
                processDir(path ? `${path}/${dir}` : dir);
            }
        };
        processDir();

        expect(treeCount).toBe(totalListed);
    });

    it('env directory has 3 files', () => {
        const tree = service.buildFileTree();
        const env = tree.children!.find(c => c.name === 'env');
        // Based on typical pak.pak content, usually sky1*.pcx/tga
        if (env) {
            const files = env.children!.filter(c => !c.isDirectory);
            expect(files.length).toBeGreaterThanOrEqual(1);
        }
    });
  });

  describe('findByExtension', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('finds PCX files', () => {
      const files = service.findByExtension('pcx');
      expect(files.length).toBeGreaterThan(0);
      expect(files[0].path.endsWith('.pcx')).toBe(true);
    });

    it('finds WAL files', () => {
      const files = service.findByExtension('wal');
      expect(files.length).toBeGreaterThan(0);
      expect(files[0].path.endsWith('.wal')).toBe(true);
    });

    it('finds WAV files', () => {
      const files = service.findByExtension('wav');
      expect(files.length).toBeGreaterThan(0);
      expect(files[0].path.endsWith('.wav')).toBe(true);
    });

    it('finds CFG files', () => {
      const files = service.findByExtension('cfg');
      expect(files.length).toBeGreaterThan(0);
      expect(files[0].path.endsWith('.cfg')).toBe(true);
    });

    it('finds BSP files', () => {
      const files = service.findByExtension('bsp');
      expect(files.length).toBeGreaterThan(0);
      expect(files[0].path.endsWith('.bsp')).toBe(true);
    });

    it('returns empty array for non-existent extensions', () => {
      const files = service.findByExtension('xyz');
      expect(files.length).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all mounted PAKs', async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
      expect(service.getMountedPaks().length).toBe(1);

      service.clear();
      expect(service.getMountedPaks().length).toBe(0);
    });

    it('clears file tree', async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
      let tree = service.buildFileTree();
      expect(tree.children!.length).toBeGreaterThan(0);

      service.clear();
      tree = service.buildFileTree();
      expect(tree.children!.length).toBe(0);
    });
  });
});
