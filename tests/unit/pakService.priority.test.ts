
import { PakService } from '../../src/services/pakService';
import { PakArchive } from '@quake2ts/engine';
import { workerService } from '../../src/services/workerService';

// Mock worker service to return immediate result
vi.mock('../../src/services/workerService', () => ({
    workerService: {
        getPakParser: vi.fn(),
        executePakParserTask: vi.fn(async (cb: any) => {
            const api = {
                parsePak: async (id: string, buffer: ArrayBuffer) => ({
                    entries: new Map(),
                    buffer: new ArrayBuffer(0),
                    name: id
                })
            };
            return cb(api);
        })
    }
}));

// Mock PakArchive and VirtualFileSystem logic
vi.mock('@quake2ts/engine', () => {
  return {
    PakArchive: {
      fromArrayBuffer: vi.fn((id: string, buffer: ArrayBuffer) => {
        return {
            // ... mocked instance for fallback path if needed
        };
      })
    },
    VirtualFileSystem: class {
      paks: {pak: any, priority: number}[] = [];
      mountPak(pak: any, priority: number = 0) {
          this.paks.push({pak, priority});
          this.paks.sort((a, b) => a.priority - b.priority);
      }
      setPriority(pak: any, priority: number) {
          const entry = this.paks.find(p => p.pak === pak);
          if (entry) {
              entry.priority = priority;
              this.paks.sort((a, b) => a.priority - b.priority);
          }
      }
      unmountPak(pak: any) {
         const idx = this.paks.findIndex(p => p.pak === pak);
         if (idx !== -1) this.paks.splice(idx, 1);
      }
      readFile(path: string) {
        if (this.paks.length > 0) {
          // Check the name of the last pak
          const lastPak = this.paks[this.paks.length - 1].pak;
          return new TextEncoder().encode(`content-from-${lastPak.name}`);
        }
        return null;
      }
      hasFile() { return true; }
      list() { return { files: [], directories: [] }; }
      stat() { return null; }
      findByExtension() { return []; }
    },
    parsePcx: vi.fn(() => ({ palette: new Uint8Array(768) })),
    pcxToRgba: vi.fn(),
    parseWal: vi.fn(),
    walToRgba: vi.fn(),
    parseMd2: vi.fn(),
    groupMd2Animations: vi.fn(),
    parseMd3: vi.fn(),
    parseWav: vi.fn(),
    parseBsp: vi.fn(),
    parseTga: vi.fn(),
  };
});

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
