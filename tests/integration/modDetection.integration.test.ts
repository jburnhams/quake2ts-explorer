
import { ModDetectionServiceImpl } from '../../src/services/modDetectionService';
import { PakService, MountedPak } from '../../src/services/pakService';
import { PakArchive } from '@quake2ts/engine';
import { MOD_PRIORITY } from '../../src/types/modInfo';
import { VirtualFileSystem } from '@quake2ts/engine';

// Mock everything needed for integration-like test (running in Node with mocks)
// Ideally we use a real VFS if possible, but VFS in quake2ts is just a class.
// Let's mock PakService heavily but use real logic where possible.

describe('ModDetection Integration', () => {
  let modService: ModDetectionServiceImpl;
  let pakService: PakService;

  beforeEach(() => {
    modService = new ModDetectionServiceImpl();
    // We mock PakService entirely
    pakService = {
      getMountedPaks: vi.fn<() => MountedPak[]>(),
    } as unknown as PakService;
  });

  it('should detect a complex scenario with base game, expansion, and a mod', async () => {
    // 1. Setup Base Game PAK
    const basePak = {
      id: 'base',
      name: 'pak0.pak',
      isUser: false,
      archive: {
        has: (f: string) => f === 'pics/colormap.pcx',
        entries: { has: (f: string) => f === 'pics/colormap.pcx' },
        readFile: () => null,
      }
    } as unknown as MountedPak;

    // 2. Setup Expansion PAK (Rogue)
    const roguePak = {
      id: 'rogue',
      name: 'rogue.pak', // Filename detection
      isUser: false,
      archive: {
        has: (f: string) => false,
        entries: { has: (f: string) => false },
        readFile: () => null,
      }
    } as unknown as MountedPak;

    // 3. Setup Custom Mod PAK
    const modMetadata = JSON.stringify({
      id: 'custom_mod',
      name: 'My Custom Mod',
      priority: 150
    });
    const modPak = {
      id: 'mod',
      name: 'mod.pak',
      isUser: true,
      archive: {
        has: (f: string) => f === 'mod.json',
        entries: { has: (f: string) => f === 'mod.json' },
        readFile: (f: string) => f === 'mod.json' ? new TextEncoder().encode(modMetadata) : null,
      }
    } as unknown as MountedPak;

    // Mock return
    (pakService.getMountedPaks as vi.Mock).mockReturnValue([basePak, roguePak, modPak]);

    // Execute
    const mods = await modService.detectMods(pakService);

    // Verify
    expect(mods).toHaveLength(3);

    const base = mods.find(m => m.id === 'baseq2');
    expect(base).toBeDefined();
    expect(base?.priority).toBe(MOD_PRIORITY.BASE);

    const rogue = mods.find(m => m.id === 'rogue');
    expect(rogue).toBeDefined();
    expect(rogue?.priority).toBe(MOD_PRIORITY.EXPANSION);

    const custom = mods.find(m => m.id === 'custom_mod');
    expect(custom).toBeDefined();
    expect(custom?.priority).toBe(150);
  });
});
