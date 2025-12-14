import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { PakService } from '@/src/services/pakService';

describe('PakService with real PAK file', () => {
  let service: PakService;
  let pakBuffer: ArrayBuffer;

  beforeAll(() => {
    const pakPath = path.join(__dirname, '..', '..', 'public', 'pak.pak');
    const fileBuffer = fs.readFileSync(pakPath);
    pakBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
  });

  beforeEach(() => {
    service = new PakService();
  });

  describe('loadPakFromBuffer', () => {
    it('loads a real PAK file successfully', async () => {
      const archive = await service.loadPakFromBuffer('pak.pak', pakBuffer);
      expect(archive).toBeDefined();
      // Name is now a UUID, but we can verify it's a string
      expect(typeof archive.name).toBe('string');
      // We can verify metadata
      const pakInfo = service.getMountedPaks()[0];
      expect(pakInfo.name).toBe('pak.pak');
    });

    it('mounts the PAK to VFS', async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
      expect(service.getMountedPaks().length).toBe(1);
    });

    it('can load multiple PAK files', async () => {
      await service.loadPakFromBuffer('pak1.pak', pakBuffer);
      await service.loadPakFromBuffer('pak2.pak', pakBuffer);
      expect(service.getMountedPaks().length).toBe(2);
    });
  });

  describe('listDirectory', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('lists root directory files', () => {
      const listing = service.listDirectory();
      const rootFiles = listing.files.map(f => f.path);
      expect(rootFiles).toContain('default.cfg');
    });

    it('lists root directory subdirectories', () => {
      const listing = service.listDirectory();
      expect(listing.directories).toContain('demos');
      expect(listing.directories).toContain('env');
      expect(listing.directories).toContain('maps');
      expect(listing.directories).toContain('sound');
      expect(listing.directories).toContain('textures');
    });

    it('lists files in demos directory', () => {
      const listing = service.listDirectory('demos');
      expect(listing.files.length).toBe(1);
      expect(listing.files[0].path).toBe('demos/demo1.dm2');
    });

    it('lists files in env directory', () => {
      const listing = service.listDirectory('env');
      expect(listing.files.length).toBe(3);
    });

    it('lists nested directory contents', () => {
      const soundListing = service.listDirectory('sound');
      expect(soundListing.directories).toContain('berserk');

      const berserkListing = service.listDirectory('sound/berserk');
      expect(berserkListing.files.length).toBe(1);
      expect(berserkListing.files[0].path).toBe('sound/berserk/attack.wav');
    });
  });

  describe('hasFile', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('returns true for files at root', () => {
      expect(service.hasFile('default.cfg')).toBe(true);
    });

    it('returns true for files in subdirectories', () => {
      expect(service.hasFile('demos/demo1.dm2')).toBe(true);
      expect(service.hasFile('env/sky1bk.pcx')).toBe(true);
      expect(service.hasFile('maps/demo1.bsp')).toBe(true);
    });

    it('returns true for deeply nested files', () => {
      expect(service.hasFile('sound/berserk/attack.wav')).toBe(true);
      expect(service.hasFile('textures/e1u1/btactmach.wal')).toBe(true);
    });

    it('returns false for non-existent files', () => {
      expect(service.hasFile('nonexistent.txt')).toBe(false);
      expect(service.hasFile('fake/path/file.dat')).toBe(false);
    });

    it('returns false for directories', () => {
      expect(service.hasFile('demos')).toBe(false);
      expect(service.hasFile('sound/berserk')).toBe(false);
    });
  });

  describe('getFileMetadata', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('returns metadata for CFG files', () => {
      const meta = service.getFileMetadata('default.cfg');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('default.cfg');
      expect(meta?.extension).toBe('cfg');
      expect(meta?.fileType).toBe('txt');
      expect(meta?.size).toBeGreaterThan(0);
      expect(meta?.sourcePak).toBe('pak.pak');
    });

    it('returns metadata for PCX files', () => {
      const meta = service.getFileMetadata('env/sky1bk.pcx');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('sky1bk.pcx');
      expect(meta?.extension).toBe('pcx');
      expect(meta?.fileType).toBe('pcx');
    });

    it('returns metadata for WAL files', () => {
      const meta = service.getFileMetadata('textures/e1u1/btactmach.wal');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('btactmach.wal');
      expect(meta?.extension).toBe('wal');
      expect(meta?.fileType).toBe('wal');
    });

    it('returns metadata for BSP files', () => {
      const meta = service.getFileMetadata('maps/demo1.bsp');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('demo1.bsp');
      expect(meta?.extension).toBe('bsp');
      expect(meta?.fileType).toBe('bsp');
    });

    it('returns metadata for WAV files', () => {
      const meta = service.getFileMetadata('sound/berserk/attack.wav');
      expect(meta).toBeDefined();
      expect(meta?.name).toBe('attack.wav');
      expect(meta?.extension).toBe('wav');
      expect(meta?.fileType).toBe('wav');
    });

    it('returns undefined for non-existent files', () => {
      expect(service.getFileMetadata('nonexistent.txt')).toBeUndefined();
    });
  });

  describe('readFile', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('reads default.cfg content', async () => {
      const data = await service.readFile('default.cfg');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      const text = new TextDecoder().decode(data);
      expect(text).toContain('bind');
    });

    it('reads PCX file', async () => {
      const data = await service.readFile('env/sky1bk.pcx');
      expect(data).toBeInstanceOf(Uint8Array);
      // PCX magic byte
      expect(data[0]).toBe(0x0A);
    });

    it('reads BSP file', async () => {
      const data = await service.readFile('maps/demo1.bsp');
      expect(data).toBeInstanceOf(Uint8Array);
      // Quake 2 BSP magic "IBSP"
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('IBSP');
    });

    it('reads WAV file', async () => {
      const data = await service.readFile('sound/berserk/attack.wav');
      expect(data).toBeInstanceOf(Uint8Array);
      // WAV magic "RIFF"
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('RIFF');
    });

    it('throws for non-existent files', async () => {
      await expect(service.readFile('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('parseFile', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('parses TXT/CFG files', async () => {
      const parsed = await service.parseFile('default.cfg');
      expect(parsed.type).toBe('txt');
      if (parsed.type === 'txt') {
        expect(parsed.content).toContain('bind');
      }
    });

    it('parses PCX files', async () => {
      const parsed = await service.parseFile('env/sky1bk.pcx');
      expect(parsed.type).toBe('pcx');
      if (parsed.type === 'pcx') {
        expect(parsed.width).toBeGreaterThan(0);
        expect(parsed.height).toBeGreaterThan(0);
        expect(parsed.rgba).toBeInstanceOf(Uint8Array);
      }
    });

    it('parses WAL files', async () => {
      const parsed = await service.parseFile('textures/e1u1/btactmach.wal');
      expect(parsed.type).toBe('wal');
      if (parsed.type === 'wal') {
        expect(parsed.width).toBeGreaterThan(0);
        expect(parsed.height).toBeGreaterThan(0);
      }
    });

    it('parses TGA files', async () => {
      const parsed = await service.parseFile('env/sky1rt.tga');
      expect(parsed.type).toBe('tga');
      if (parsed.type === 'tga') {
        expect(parsed.width).toBeGreaterThan(0);
        expect(parsed.height).toBeGreaterThan(0);
        expect(parsed.rgba).toBeInstanceOf(Uint8Array);
      }
    });

    it('parses WAV files', async () => {
      const parsed = await service.parseFile('sound/berserk/attack.wav');
      expect(parsed.type).toBe('wav');
      if (parsed.type === 'wav') {
        expect(parsed.audio).toBeDefined();
        expect(parsed.audio.sampleRate).toBeGreaterThan(0);
      }
    });

    it('parses BSP files', async () => {
      const parsed = await service.parseFile('maps/demo1.bsp');
      expect(parsed.type).toBe('bsp');
      if (parsed.type === 'bsp') {
        expect(parsed.map).toBeDefined();
      }
    });

    it('parses DM2 files as dm2 type', async () => {
      const parsed = await service.parseFile('demos/demo1.dm2');
      expect(parsed.type).toBe('dm2');
    });
  });

  describe('buildFileTree', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('builds root node correctly', () => {
      const tree = service.buildFileTree();
      expect(tree.name).toBe('root');
      expect(tree.path).toBe('');
      expect(tree.isDirectory).toBe(true);
      expect(tree.children).toBeDefined();
    });

    it('includes all top-level directories and files', () => {
      const tree = service.buildFileTree();
      const names = tree.children!.map(c => c.name);

      // Directories
      expect(names).toContain('demos');
      expect(names).toContain('env');
      expect(names).toContain('maps');
      expect(names).toContain('sound');
      expect(names).toContain('textures');

      // Root file
      expect(names).toContain('default.cfg');
    });

    it('sorts directories before files', () => {
      const tree = service.buildFileTree();
      const lastDir = tree.children!.findIndex(c => !c.isDirectory);
      // const firstFile = tree.children!.findIndex(c => !c.isDirectory); // Unused

      // All directories should come before files
      for (let i = 0; i < lastDir; i++) {
        expect(tree.children![i].isDirectory).toBe(true);
      }
    });

    it('creates correct nested structure for sound', () => {
      const tree = service.buildFileTree();
      const sound = tree.children!.find(c => c.name === 'sound');

      expect(sound).toBeDefined();
      expect(sound!.isDirectory).toBe(true);
      expect(sound!.children).toHaveLength(1);

      const berserk = sound!.children![0];
      expect(berserk.name).toBe('berserk');
      expect(berserk.isDirectory).toBe(true);
      expect(berserk.children).toHaveLength(1);

      const wav = berserk.children![0];
      expect(wav.name).toBe('attack.wav');
      expect(wav.isDirectory).toBe(false);
      expect(wav.path).toBe('sound/berserk/attack.wav');
    });

    it('creates correct nested structure for textures', () => {
      const tree = service.buildFileTree();
      const textures = tree.children!.find(c => c.name === 'textures');

      expect(textures).toBeDefined();
      expect(textures!.children).toHaveLength(1);

      const e1u1 = textures!.children![0];
      expect(e1u1.name).toBe('e1u1');
      expect(e1u1.isDirectory).toBe(true);
      expect(e1u1.children).toHaveLength(2);
    });

    it('includes file handles in leaf nodes', () => {
      const tree = service.buildFileTree();
      const demos = tree.children!.find(c => c.name === 'demos');
      const demo1 = demos!.children![0];

      expect(demo1.file).toBeDefined();
      expect(demo1.file!.path).toBe('demos/demo1.dm2');
      expect(demo1.file!.size).toBeGreaterThan(0);

      // `file.sourcePak` is the UUID.
      // This test verified that the file came from the loaded pak.
      // We can verify it exists as a key in mounted paks if we could access it, or just ignore exact string match
      expect(demo1.file!.sourcePak).toBeDefined();
      expect(demo1.file!.sourcePak.length).toBeGreaterThan(10); // Assume UUID length
    });

    it('counts all files recursively', () => {
      const tree = service.buildFileTree();

      let fileCount = 0;
      const countFiles = (node: typeof tree) => {
        if (!node.isDirectory) {
          fileCount++;
        }
        if (node.children) {
          node.children.forEach(countFiles);
        }
      };
      countFiles(tree);

      expect(fileCount).toBeGreaterThanOrEqual(9);
    });

    it('env directory has 3 files', () => {
      const tree = service.buildFileTree();
      const env = tree.children!.find(c => c.name === 'env');

      expect(env!.children).toHaveLength(3);
      const names = env!.children!.map(c => c.name);
      expect(names).toContain('sky1bk.pcx');
      expect(names).toContain('sky1rt.pcx');
      expect(names).toContain('sky1rt.tga');
    });
  });

  describe('findByExtension', () => {
    beforeEach(async () => {
      await service.loadPakFromBuffer('pak.pak', pakBuffer);
    });

    it('finds PCX files', () => {
      const files = service.findByExtension('.pcx');
      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.every(f => f.path.endsWith('.pcx'))).toBe(true);
    });

    it('finds WAL files', () => {
      const files = service.findByExtension('.wal');
      expect(files.length).toBe(2);
    });

    it('finds WAV files', () => {
      const files = service.findByExtension('.wav');
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('sound/berserk/attack.wav');
    });

    it('finds CFG files', () => {
      const files = service.findByExtension('.cfg');
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('default.cfg');
    });

    it('finds BSP files', () => {
      const files = service.findByExtension('.bsp');
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('maps/demo1.bsp');
    });

    it('returns empty array for non-existent extensions', () => {
      const files = service.findByExtension('.xyz');
      expect(files).toEqual([]);
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
      expect(tree.children).toEqual([]);
    });
  });
});
