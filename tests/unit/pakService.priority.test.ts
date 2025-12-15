import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PakService } from '../../src/services/pakService';
import { PakArchive } from 'quake2ts/engine';

// Mock PakArchive and VirtualFileSystem logic
jest.mock('quake2ts/engine', () => {
  return {
    PakArchive: {
      fromArrayBuffer: jest.fn((id: string, buffer: ArrayBuffer) => {
        return {
          readFile: jest.fn((path: string) => {
            return new TextEncoder().encode(`content-from-${id}`);
          }),
          has: jest.fn(() => true),
          list: jest.fn(() => []),
          getEntries: jest.fn(() => [])
        };
      })
    },
    VirtualFileSystem: class {
      paks: any[] = [];
      mountPak(pak: any) { this.paks.push(pak); }
      unmountPak(pak: any) {
         const idx = this.paks.indexOf(pak);
         if (idx !== -1) this.paks.splice(idx, 1);
      }
      readFile(path: string) {
        if (this.paks.length > 0) {
          // Return content from last mounted pak (override behavior)
          return this.paks[this.paks.length - 1].readFile(path);
        }
        return null;
      }
      hasFile() { return true; }
      list() { return { files: [], directories: [] }; }
      stat() { return null; }
      findByExtension() { return []; }
    },
    parsePcx: jest.fn(() => ({ palette: new Uint8Array(768) })),
    pcxToRgba: jest.fn(),
    // Add other exports used by PakService imports
    parseWal: jest.fn(),
    walToRgba: jest.fn(),
    parseMd2: jest.fn(),
    groupMd2Animations: jest.fn(),
    parseMd3: jest.fn(),
    parseWav: jest.fn(),
    parseBsp: jest.fn(),
    parseTga: jest.fn(),
  };
});

// We need to import PakService AFTER the mock because it imports from quake2ts/engine at top level
// But Jest hoisting handles this usually. However, let's just rely on standard behavior.

describe('PakService Priority', () => {
    let service: PakService;

    beforeEach(() => {
        service = new PakService();
    });

    it('should mount PAKs in priority order', async () => {
        // Load High Priority first (should be mounted last)
        await service.loadPakFromBuffer('mod.pak', new ArrayBuffer(0), 'mod', true, 100);
        // Load Low Priority second (should be mounted first)
        await service.loadPakFromBuffer('base.pak', new ArrayBuffer(0), 'base', false, 0);

        // Verify content comes from 'mod' (id 'mod') because it has higher priority
        const content = await service.readFile('test.txt');
        const text = new TextDecoder().decode(content);
        expect(text).toBe('content-from-mod');
    });

    it('should update VFS when priority changes', async () => {
        await service.loadPakFromBuffer('mod.pak', new ArrayBuffer(0), 'mod', true, 0); // Initially Low
        await service.loadPakFromBuffer('base.pak', new ArrayBuffer(0), 'base', false, 10); // Initially High

        // Current order: Mod (0), Base (10). VFS: Mod, Base. Content: Base.
        let content = await service.readFile('test.txt');
        expect(new TextDecoder().decode(content)).toBe('content-from-base');

        // Update Mod to High
        service.updatePakPriority('mod', 100);

        // New order: Base (10), Mod (100). VFS: Base, Mod. Content: Mod.
        content = await service.readFile('test.txt');
        expect(new TextDecoder().decode(content)).toBe('content-from-mod');
    });

    it('should reorder PAKs manually', async () => {
        await service.loadPakFromBuffer('A', new ArrayBuffer(0), 'a', true, 50);
        await service.loadPakFromBuffer('B', new ArrayBuffer(0), 'b', true, 50);

        // Let's force explicit reorder: A first (low), B second (high).
        service.reorderPaks(['a', 'b']);

        let content = await service.readFile('test.txt');
        expect(new TextDecoder().decode(content)).toBe('content-from-b');

        // Reorder: B first (low), A second (high).
        service.reorderPaks(['b', 'a']);
        content = await service.readFile('test.txt');
        expect(new TextDecoder().decode(content)).toBe('content-from-a');
    });
});
