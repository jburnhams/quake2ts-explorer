import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { PakArchive, VirtualFileSystem } from 'quake2ts/engine';

describe('PAK File Integration Tests', () => {
  const pakPath = path.join(__dirname, '..', '..', 'pak.pak');
  let pakBuffer: ArrayBuffer;
  let pakArchive: PakArchive;
  let vfs: VirtualFileSystem;

  beforeAll(() => {
    const fileBuffer = fs.readFileSync(pakPath);
    pakBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    pakArchive = PakArchive.fromArrayBuffer('pak.pak', pakBuffer);
    vfs = new VirtualFileSystem();
    vfs.mountPak(pakArchive);
  });

  describe('PAK file header validation', () => {
    it('should have PACK magic number', () => {
      const bytes = new Uint8Array(pakBuffer);
      const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
      expect(magic).toBe('PACK');
    });

    it('should have valid directory offset and size', () => {
      const view = new DataView(pakBuffer);
      const dirOffset = view.getInt32(4, true);
      const dirSize = view.getInt32(8, true);

      expect(dirOffset).toBeGreaterThan(0);
      expect(dirSize).toBeGreaterThan(0);
      expect(dirSize % 64).toBe(0); // Each entry is 64 bytes
    });
  });

  describe('PAK archive loading', () => {
    it('should load the PAK archive without errors', () => {
      expect(pakArchive).toBeDefined();
      expect(pakArchive.name).toBe('pak.pak');
    });

    it('should have multiple entries', () => {
      const entries = pakArchive.listEntries();
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('VFS file listing', () => {
    it('should list root files from the PAK', () => {
      const listing = vfs.list();
      expect(listing.files.length).toBeGreaterThan(0);
    });

    it('should contain default.cfg at root', () => {
      expect(vfs.hasFile('default.cfg')).toBe(true);
    });

    it('should list subdirectories at root', () => {
      const listing = vfs.list();
      expect(listing.directories.length).toBeGreaterThan(0);
      expect(listing.directories).toContain('demos');
      expect(listing.directories).toContain('env');
    });

    it('should list files in subdirectories', () => {
      const listing = vfs.list('demos');
      expect(listing.files.length).toBe(1);
      expect(listing.files[0].path).toBe('demos/demo1.dm2');
    });
  });

  describe('Expected PAK contents', () => {
    const expectedFiles = [
      'default.cfg',
      'demos/demo1.dm2',
      'env/sky1bk.pcx',
      'env/sky1rt.pcx',
      'env/sky1rt.tga',
      'maps/demo1.bsp',
      'sound/berserk/attack.wav',
      'textures/e1u1/btactmach.wal',
      'textures/e1u1/clip.wal',
    ];

    for (const filePath of expectedFiles) {
      it(`should contain ${filePath}`, () => {
        expect(vfs.hasFile(filePath)).toBe(true);
      });
    }

    it('should have at least 9 files total (recursively)', () => {
      // Recursively gather all files
      const allFiles: Array<{ path: string }> = [];
      const gatherFiles = (dirPath?: string) => {
        const listing = vfs.list(dirPath);
        allFiles.push(...listing.files);
        for (const subDir of listing.directories) {
          const fullPath = dirPath ? `${dirPath}/${subDir}` : subDir;
          gatherFiles(fullPath);
        }
      };
      gatherFiles();
      expect(allFiles.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('File metadata', () => {
    it('should return correct metadata for default.cfg', () => {
      const stat = vfs.stat('default.cfg');
      expect(stat).toBeDefined();
      expect(stat.path).toBe('default.cfg');
      expect(stat.size).toBeGreaterThan(0);
      expect(stat.sourcePak).toBe('pak.pak');
    });

    it('should return correct metadata for nested files', () => {
      const stat = vfs.stat('sound/berserk/attack.wav');
      expect(stat).toBeDefined();
      expect(stat.path).toBe('sound/berserk/attack.wav');
      expect(stat.size).toBeGreaterThan(0);
    });
  });

  describe('File reading', () => {
    it('should read default.cfg content', async () => {
      const data = await vfs.readFile('default.cfg');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // Verify it starts with expected Quake 2 config content
      const text = new TextDecoder().decode(data);
      expect(text).toContain('bind');
    });

    it('should read PCX file with valid header', async () => {
      const data = await vfs.readFile('env/sky1bk.pcx');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // PCX files start with manufacturer byte 0x0A
      expect(data[0]).toBe(0x0A);
    });

    it('should read WAL file with valid header', async () => {
      const data = await vfs.readFile('textures/e1u1/btactmach.wal');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should read BSP file with valid header', async () => {
      const data = await vfs.readFile('maps/demo1.bsp');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // Quake 2 BSP files have magic "IBSP"
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('IBSP');
    });

    it('should read WAV file with valid header', async () => {
      const data = await vfs.readFile('sound/berserk/attack.wav');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // WAV files start with "RIFF"
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('RIFF');
    });

    it('should read DM2 demo file', async () => {
      const data = await vfs.readFile('demos/demo1.dm2');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Directory structure', () => {
    it('should have correct top-level directories', () => {
      const listing = vfs.list();
      expect(listing.directories).toContain('demos');
      expect(listing.directories).toContain('env');
      expect(listing.directories).toContain('maps');
      expect(listing.directories).toContain('sound');
      expect(listing.directories).toContain('textures');
    });

    it('should have nested directories (sound/berserk)', () => {
      const soundListing = vfs.list('sound');
      expect(soundListing.directories).toContain('berserk');

      const berserkListing = vfs.list('sound/berserk');
      expect(berserkListing.files.length).toBe(1);
      expect(berserkListing.files[0].path).toBe('sound/berserk/attack.wav');
    });

    it('should have nested directories (textures/e1u1)', () => {
      const texturesListing = vfs.list('textures');
      expect(texturesListing.directories).toContain('e1u1');

      const e1u1Listing = vfs.list('textures/e1u1');
      expect(e1u1Listing.files.length).toBe(2);
    });
  });

  describe('File extension queries', () => {
    it('should find all PCX files', () => {
      const pcxFiles = vfs.findByExtension('.pcx');
      expect(pcxFiles.length).toBeGreaterThanOrEqual(2);
      expect(pcxFiles.every((f: { path: string }) => f.path.endsWith('.pcx'))).toBe(true);
    });

    it('should find all WAL files', () => {
      const walFiles = vfs.findByExtension('.wal');
      expect(walFiles.length).toBe(2);
    });

    it('should find all WAV files', () => {
      const wavFiles = vfs.findByExtension('.wav');
      expect(wavFiles.length).toBe(1);
      expect(wavFiles[0].path).toBe('sound/berserk/attack.wav');
    });

    it('should find all BSP files', () => {
      const bspFiles = vfs.findByExtension('.bsp');
      expect(bspFiles.length).toBe(1);
      expect(bspFiles[0].path).toBe('maps/demo1.bsp');
    });

    it('should find all CFG files', () => {
      const cfgFiles = vfs.findByExtension('.cfg');
      expect(cfgFiles.length).toBe(1);
      expect(cfgFiles[0].path).toBe('default.cfg');
    });
  });

  describe('Error handling', () => {
    it('should return false for non-existent files', () => {
      expect(vfs.hasFile('nonexistent.txt')).toBe(false);
      expect(vfs.hasFile('fake/path/file.dat')).toBe(false);
    });

    it('should return undefined stat for non-existent files', () => {
      const stat = vfs.stat('nonexistent.txt');
      expect(stat).toBeUndefined();
    });

    it('should throw when reading non-existent files', async () => {
      await expect(vfs.readFile('nonexistent.txt')).rejects.toThrow();
    });
  });
});
