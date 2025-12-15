import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ModDetectionServiceImpl } from '../../src/services/modDetectionService';
import { PakService, MountedPak } from '../../src/services/pakService';
import { PakArchive } from 'quake2ts/engine';
import { MOD_PRIORITY } from '../../src/types/modInfo';

// Mock PakArchive
const createMockArchive = (files: Record<string, string>) => {
  return {
    has: (path: string) => path in files,
    readFile: (path: string) => {
      if (path in files) {
        return new TextEncoder().encode(files[path]);
      }
      return null;
    },
  } as unknown as PakArchive;
};

describe('ModDetectionService', () => {
  let service: ModDetectionServiceImpl;
  let mockPakService: PakService;

  beforeEach(() => {
    service = new ModDetectionServiceImpl();
    mockPakService = {
      getMountedPaks: jest.fn<() => MountedPak[]>().mockReturnValue([]),
    } as unknown as PakService;
  });

  it('should detect base game from colormap.pcx', async () => {
    const archive = createMockArchive({ 'pics/colormap.pcx': '...' });
    const pak: MountedPak = { id: '1', name: 'pak0.pak', archive, isUser: false };
    (mockPakService.getMountedPaks as jest.Mock).mockReturnValue([pak]);

    const mods = await service.detectMods(mockPakService);

    expect(mods).toHaveLength(1);
    expect(mods[0].id).toBe('baseq2');
    expect(mods[0].priority).toBe(MOD_PRIORITY.BASE);
    expect(mods[0].pakFiles).toContain('pak0.pak');
  });

  it('should detect mod from mod.json', async () => {
    const modJson = JSON.stringify({
      id: 'my_mod',
      name: 'My Custom Mod',
      author: 'Me',
      description: 'Cool mod',
    });
    const archive = createMockArchive({ 'mod.json': modJson });
    const pak: MountedPak = { id: '2', name: 'my_mod.pak', archive, isUser: true };
    (mockPakService.getMountedPaks as jest.Mock).mockReturnValue([pak]);

    const mods = await service.detectMods(mockPakService);

    expect(mods).toHaveLength(1);
    expect(mods[0].id).toBe('my_mod');
    expect(mods[0].name).toBe('My Custom Mod');
    expect(mods[0].priority).toBe(MOD_PRIORITY.MOD); // Default priority
  });

  it('should detect Rogue expansion by unique file', async () => {
    const archive = createMockArchive({ 'maps/rogue1.bsp': '...' });
    const pak: MountedPak = { id: '3', name: 'pak0.pak', archive, isUser: false };
    (mockPakService.getMountedPaks as jest.Mock).mockReturnValue([pak]);

    const mods = await service.detectMods(mockPakService);

    expect(mods).toHaveLength(1);
    expect(mods[0].id).toBe('rogue');
    expect(mods[0].priority).toBe(MOD_PRIORITY.EXPANSION);
  });

  it('should detect Xatrix expansion by filename', async () => {
     const archive = createMockArchive({}); // Empty archive
     const pak: MountedPak = { id: '4', name: 'xatrix.pak', archive, isUser: false };
     (mockPakService.getMountedPaks as jest.Mock).mockReturnValue([pak]);

     const mods = await service.detectMods(mockPakService);

     expect(mods).toHaveLength(1);
     expect(mods[0].id).toBe('xatrix');
     expect(mods[0].priority).toBe(MOD_PRIORITY.EXPANSION);
   });

  it('should merge multiple PAKs for same mod', async () => {
    const archive1 = createMockArchive({ 'pics/colormap.pcx': '...' });
    const pak1: MountedPak = { id: '1', name: 'pak0.pak', archive: archive1, isUser: false };

    const archive2 = createMockArchive({ 'pics/colormap.pcx': '...' });
    const pak2: MountedPak = { id: '2', name: 'pak1.pak', archive: archive2, isUser: false };

    (mockPakService.getMountedPaks as jest.Mock).mockReturnValue([pak1, pak2]);

    const mods = await service.detectMods(mockPakService);

    expect(mods).toHaveLength(1);
    expect(mods[0].id).toBe('baseq2');
    expect(mods[0].pakFiles).toHaveLength(2);
    expect(mods[0].pakFiles).toContain('pak0.pak');
    expect(mods[0].pakFiles).toContain('pak1.pak');
  });
});
