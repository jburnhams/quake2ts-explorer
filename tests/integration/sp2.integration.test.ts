
import * as fs from 'fs';
import * as path from 'path';
import { PakArchive, VirtualFileSystem } from '@quake2ts/engine';
import { parseSprite } from '../../src/utils/sp2Parser';

describe('SP2 File Integration Tests', () => {
  const pakPath = path.join(__dirname, '..', '..', 'public', 'pak.pak');
  let pakBuffer: ArrayBuffer;
  let pakArchive: PakArchive;
  let vfs: VirtualFileSystem;
  const sp2Path = 'sprites/s_explod.sp2';

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

  describe('SP2 Sprite Parsing', () => {
    it('should find the sp2 file in the PAK', () => {
      expect(vfs.hasFile(sp2Path)).toBe(true);
    });

    it('should read SP2 file with valid header magic', async () => {
      const data = await vfs.readFile(sp2Path);
      expect(data).toBeInstanceOf(Uint8Array);

      // SP2 header starts with "IDS2" (0x49 0x44 0x53 0x32)
      const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
      expect(magic).toBe('IDS2');
    });

    it('should parse SP2 sprite model correctly', async () => {
        const data = await vfs.readFile(sp2Path);
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const model = parseSprite(buffer);

        expect(model.ident).toBe(0x32534449); // 'IDS2' little endian
        expect(model.version).toBe(2);
        expect(model.numFrames).toBeGreaterThan(0);
        expect(model.frames.length).toBe(model.numFrames);
    });

    it('should have valid frames', async () => {
        const data = await vfs.readFile(sp2Path);
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const model = parseSprite(buffer);

        for (const frame of model.frames) {
            expect(frame.width).toBeGreaterThan(0);
            expect(frame.height).toBeGreaterThan(0);
            expect(frame.name).toBeDefined();
            expect(frame.name.length).toBeGreaterThan(0);
        }
    });
  });
});
