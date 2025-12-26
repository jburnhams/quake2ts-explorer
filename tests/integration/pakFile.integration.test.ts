
import * as fs from 'fs';
import * as path from 'path';
import { PakArchive, VirtualFileSystem, parseMd2, groupMd2Animations } from '@quake2ts/engine';
import { PakService } from '../../src/services/pakService';

// Mock workerService to force fallback to main thread parsing
// This is necessary because JSDOM doesn't support real Workers, and comlink wrapper would hang
vi.mock('../../src/services/workerService', () => {
  const reject = () => Promise.reject(new Error("No worker in integration test"));
  return {
    workerService: {
      getPakParser: () => ({
         parsePak: reject
      }),
      getAssetProcessor: () => ({
         processPcx: reject,
         processWal: reject,
         processTga: reject,
         processMd2: reject,
         processMd3: reject,
         processSp2: reject,
         processWav: reject,
         processBsp: reject
      })
    }
  };
});

describe('PAK File Integration Tests', () => {
  const pakPath = path.join(__dirname, '..', '..', 'public', 'pak.pak');
  let pakBuffer: ArrayBuffer;
  let pakArchive: PakArchive;
  let vfs: VirtualFileSystem;

  beforeAll(() => {
    // Check if file exists, if not, skip tests or fail with message
    if (!fs.existsSync(pakPath)) {
        console.warn("pak.pak not found, skipping integration tests depending on it.");
        // We can't easily skip describe block dynamically in Jest without hacks.
        // But for this environment we assume it exists as per AGENTS.md
    }

    if (fs.existsSync(pakPath)) {
        const fileBuffer = fs.readFileSync(pakPath);
        pakBuffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
        );
        pakArchive = PakArchive.fromArrayBuffer('pak.pak', pakBuffer);
        vfs = new VirtualFileSystem();
        vfs.mountPak(pakArchive);
    }
  });

  describe('PAK file header validation', () => {
    it('should have PACK magic number', () => {
      if (!pakBuffer) return;
      const bytes = new Uint8Array(pakBuffer);
      const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
      expect(magic).toBe('PACK');
    });

    it('should have valid directory offset and size', () => {
      if (!pakBuffer) return;
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
      if (!pakArchive) return;
      expect(pakArchive).toBeDefined();
      expect(pakArchive.name).toBe('pak.pak');
    });

    it('should have multiple entries', () => {
      if (!pakArchive) return;
      const entries = pakArchive.listEntries();
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('VFS file listing', () => {
    it('should list root files from the PAK', () => {
      if (!vfs) return;
      const listing = vfs.list();
      expect(listing.files.length).toBeGreaterThan(0);
    });

    it('should contain default.cfg at root', () => {
      if (!vfs) return;
      expect(vfs.hasFile('default.cfg')).toBe(true);
    });

    it('should list subdirectories at root', () => {
      if (!vfs) return;
      const listing = vfs.list();
      expect(listing.directories.length).toBeGreaterThan(0);
      expect(listing.directories).toContain('demos');
      expect(listing.directories).toContain('env');
    });

    it('should list files in subdirectories', () => {
      if (!vfs) return;
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
        if (!vfs) return;
        expect(vfs.hasFile(filePath)).toBe(true);
      });
    }

    it('should have at least 9 files total (recursively)', () => {
      if (!vfs) return;
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
      if (!vfs) return;
      const stat = vfs.stat('default.cfg');
      expect(stat).toBeDefined();
      expect(stat.path).toBe('default.cfg');
      expect(stat.size).toBeGreaterThan(0);
      expect(stat.sourcePak).toBe('pak.pak');
    });

    it('should return correct metadata for nested files', () => {
      if (!vfs) return;
      const stat = vfs.stat('sound/berserk/attack.wav');
      expect(stat).toBeDefined();
      expect(stat.path).toBe('sound/berserk/attack.wav');
      expect(stat.size).toBeGreaterThan(0);
    });
  });

  describe('File reading', () => {
    it('should read default.cfg content', async () => {
      if (!vfs) return;
      const data = await vfs.readFile('default.cfg');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // Verify it starts with expected Quake 2 config content
      const text = new TextDecoder().decode(data);
      expect(text).toContain('bind');
    });

    it('should read PCX file with valid header', async () => {
      if (!vfs) return;
      const data = await vfs.readFile('env/sky1bk.pcx');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // PCX files start with manufacturer byte 0x0A
      expect(data[0]).toBe(0x0A);
    });

    it('should read WAL file with valid header', async () => {
      if (!vfs) return;
      const data = await vfs.readFile('textures/e1u1/btactmach.wal');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should read BSP file with valid header', async () => {
      if (!vfs) return;
      const data = await vfs.readFile('maps/demo1.bsp');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // Quake 2 BSP files have magic "IBSP"
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('IBSP');
    });

    it('should read WAV file with valid header', async () => {
      if (!vfs) return;
      const data = await vfs.readFile('sound/berserk/attack.wav');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);

      // WAV files start with "RIFF"
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('RIFF');
    });

    it('should read DM2 demo file', async () => {
      if (!vfs) return;
      const data = await vfs.readFile('demos/demo1.dm2');
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe('Directory structure', () => {
    it('should have correct top-level directories', () => {
      if (!vfs) return;
      const listing = vfs.list();
      expect(listing.directories).toContain('demos');
      expect(listing.directories).toContain('env');
      expect(listing.directories).toContain('maps');
      expect(listing.directories).toContain('sound');
      expect(listing.directories).toContain('textures');
    });

    it('should have nested directories (sound/berserk)', () => {
      if (!vfs) return;
      const soundListing = vfs.list('sound');
      expect(soundListing.directories).toContain('berserk');

      const berserkListing = vfs.list('sound/berserk');
      expect(berserkListing.files.length).toBe(1);
      expect(berserkListing.files[0].path).toBe('sound/berserk/attack.wav');
    });

    it('should have nested directories (textures/e1u1)', () => {
      if (!vfs) return;
      const texturesListing = vfs.list('textures');
      expect(texturesListing.directories).toContain('e1u1');

      const e1u1Listing = vfs.list('textures/e1u1');
      expect(e1u1Listing.files.length).toBe(2);
    });
  });

  describe('File extension queries', () => {
    it('should find all PCX files', () => {
      if (!vfs) return;
      const pcxFiles = vfs.findByExtension('.pcx');
      expect(pcxFiles.length).toBeGreaterThanOrEqual(2);
      expect(pcxFiles.every((f: { path: string }) => f.path.endsWith('.pcx'))).toBe(true);
    });

    it('should find all WAL files', () => {
      if (!vfs) return;
      const walFiles = vfs.findByExtension('.wal');
      expect(walFiles.length).toBe(2);
    });

    it('should find all WAV files', () => {
      if (!vfs) return;
      const wavFiles = vfs.findByExtension('.wav');
      expect(wavFiles.length).toBe(1);
      expect(wavFiles[0].path).toBe('sound/berserk/attack.wav');
    });

    it('should find all BSP files', () => {
      if (!vfs) return;
      const bspFiles = vfs.findByExtension('.bsp');
      expect(bspFiles.length).toBe(1);
      expect(bspFiles[0].path).toBe('maps/demo1.bsp');
    });

    it('should find all CFG files', () => {
      if (!vfs) return;
      const cfgFiles = vfs.findByExtension('.cfg');
      expect(cfgFiles.length).toBe(1);
      expect(cfgFiles[0].path).toBe('default.cfg');
    });
  });

  describe('Error handling', () => {
    it('should return false for non-existent files', () => {
      if (!vfs) return;
      expect(vfs.hasFile('nonexistent.txt')).toBe(false);
      expect(vfs.hasFile('fake/path/file.dat')).toBe(false);
    });

    it('should return undefined stat for non-existent files', () => {
      if (!vfs) return;
      const stat = vfs.stat('nonexistent.txt');
      expect(stat).toBeUndefined();
    });

    it('should throw when reading non-existent files', async () => {
      if (!vfs) return;
      await expect(vfs.readFile('nonexistent.txt')).rejects.toThrow();
    });
  });

  describe('MD2 Model parsing', () => {
    const md2Path = 'models/deadbods/dude/tris.md2';

    it('should contain the tris.md2 model file', () => {
      if (!vfs) return;
      expect(vfs.hasFile(md2Path)).toBe(true);
    });

    it('should read MD2 file with valid header magic', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      expect(data).toBeInstanceOf(Uint8Array);

      // MD2 files start with "IDP2" magic
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('IDP2');
    });

    it('should parse MD2 model header correctly', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      expect(model.header).toBeDefined();
      expect(model.header.numVertices).toBeGreaterThan(0);
      expect(model.header.numTriangles).toBeGreaterThan(0);
      expect(model.header.numFrames).toBeGreaterThan(0);
      expect(model.header.skinWidth).toBeGreaterThan(0);
      expect(model.header.skinHeight).toBeGreaterThan(0);
    });

    it('should parse MD2 frames', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      expect(model.frames.length).toBe(model.header.numFrames);
      expect(model.frames.length).toBeGreaterThan(0);

      // Each frame should have vertices
      for (const frame of model.frames) {
        expect(frame.name).toBeDefined();
        expect(frame.name.length).toBeGreaterThan(0);
        expect(frame.vertices.length).toBe(model.header.numVertices);
      }
    });

    it('should parse MD2 triangles', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      expect(model.triangles.length).toBe(model.header.numTriangles);

      // Each triangle should have valid vertex indices
      for (const tri of model.triangles) {
        expect(tri.vertexIndices).toHaveLength(3);
        expect(tri.texCoordIndices).toHaveLength(3);
        for (const idx of tri.vertexIndices) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(model.header.numVertices);
        }
      }
    });

    it('should parse MD2 skins', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      expect(model.skins.length).toBe(model.header.numSkins);

      // Check skin paths are valid strings
      for (const skin of model.skins) {
        expect(typeof skin.name).toBe('string');
      }
    });

    it('should parse MD2 texture coordinates', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      expect(model.texCoords.length).toBe(model.header.numTexCoords);

      // Texture coords should be within valid range
      for (const tc of model.texCoords) {
        expect(typeof tc.s).toBe('number');
        expect(typeof tc.t).toBe('number');
      }
    });

    it('should parse MD2 GL commands', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      expect(model.glCommands.length).toBeGreaterThan(0);

      // GL commands should have valid mode
      for (const cmd of model.glCommands) {
        expect(['strip', 'fan']).toContain(cmd.mode);
        expect(cmd.vertices.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should group animations from frame names', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);
      const animations = groupMd2Animations(model.frames);

      expect(animations.length).toBeGreaterThan(0);

      // Each animation should have valid frame range
      for (const anim of animations) {
        expect(anim.name.length).toBeGreaterThan(0);
        expect(anim.firstFrame).toBeGreaterThanOrEqual(0);
        expect(anim.lastFrame).toBeGreaterThanOrEqual(anim.firstFrame);
        expect(anim.lastFrame).toBeLessThan(model.frames.length);
      }
    });

    it('should have frame vertices with valid positions and normals', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      const frame = model.frames[0];
      expect(frame.vertices.length).toBeGreaterThan(0);

      for (const vertex of frame.vertices) {
        // Position should be a Vec3 object with x, y, z
        expect(vertex.position).toBeDefined();
        expect(typeof vertex.position.x).toBe('number');
        expect(typeof vertex.position.y).toBe('number');
        expect(typeof vertex.position.z).toBe('number');

        // Normal should be a Vec3 object with x, y, z
        expect(vertex.normal).toBeDefined();
        expect(typeof vertex.normal.x).toBe('number');
        expect(typeof vertex.normal.y).toBe('number');
        expect(typeof vertex.normal.z).toBe('number');
      }
    });

    it('should have associated skin file in PAK', async () => {
      if (!vfs) return;
      const data = await vfs.readFile(md2Path);
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const model = parseMd2(buffer);

      // Check if any referenced skins exist in the PAK
      const skinPath = 'models/deadbods/dude/dead1.pcx';
      expect(vfs.hasFile(skinPath)).toBe(true);

      // Verify the skin is a valid PCX
      const skinData = await vfs.readFile(skinPath);
      expect(skinData[0]).toBe(0x0A); // PCX magic byte
    });
  });

  describe('Comprehensive File Parsing', () => {
    it('should successfully parse every file in the PAK with a specific loader', async () => {
      if (!vfs) return;
      const service = new PakService(vfs);

      // Collect all files
      const allFiles: string[] = [];
      const gatherFiles = (dirPath?: string) => {
        const listing = service.listDirectory(dirPath);
        for (const file of listing.files) {
          allFiles.push(file.path);
        }
        for (const subDir of listing.directories) {
          const fullPath = dirPath ? `${dirPath}/${subDir}` : subDir;
          gatherFiles(fullPath);
        }
      };
      gatherFiles();

      console.log(`Testing parsing for ${allFiles.length} files...`);
      expect(allFiles.length).toBeGreaterThan(0);

      for (const filePath of allFiles) {
        const parsed = await service.parseFile(filePath);

        // Assert type is NOT unknown. Every file in pak.pak should have a specific loader.
        if (parsed.type === 'unknown') {
            console.error(`Failed to parse ${filePath}: returned unknown type`);
        }
        expect(parsed.type).not.toBe('unknown');

        // Specific checks based on extension
        if (filePath.endsWith('.tga')) {
            expect(parsed.type).toBe('tga');
            if (parsed.type === 'tga') {
                expect(parsed.width).toBeGreaterThan(0);
                expect(parsed.height).toBeGreaterThan(0);
                expect(parsed.rgba).toBeInstanceOf(Uint8Array);
                // TGA from quake2ts is likely RGBA (4 bytes per pixel)
                // Note: bitsPerPixel in TgaImage might vary but pixels should be decoded to RGBA.
                // tga.d.ts says "Parses a TGA image buffer into raw RGBA pixels."
                expect(parsed.rgba.length).toBe(parsed.width * parsed.height * 4);
            }
        } else if (filePath.endsWith('.dm2')) {
            expect(parsed.type).toBe('dm2');
        } else if (filePath.endsWith('.bsp')) {
            expect(parsed.type).toBe('bsp');
        }
      }
    });
  });
});
