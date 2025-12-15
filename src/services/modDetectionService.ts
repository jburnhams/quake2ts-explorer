import { PakArchive } from 'quake2ts/engine';
import { ModInfo, MOD_PRIORITY } from '../types/modInfo';
import { PakService, MountedPak } from './pakService';

export interface ModDetectionService {
  detectMods(pakService: PakService): Promise<ModInfo[]>;
}

export class ModDetectionServiceImpl implements ModDetectionService {
  async detectMods(pakService: PakService): Promise<ModInfo[]> {
    const mods: Map<string, ModInfo> = new Map();
    const paks = pakService.getMountedPaks();

    for (const pak of paks) {
      const modInfo = await this.inspectPak(pak);
      if (modInfo) {
        // If we already found this mod (e.g. split across multiple PAKs), merge info
        if (mods.has(modInfo.id)) {
          const existing = mods.get(modInfo.id)!;
          existing.pakFiles.push(...modInfo.pakFiles);
          // Keep the existing metadata if it was already richer, or merge?
          // For simplicity, just append PAKs.
        } else {
          mods.set(modInfo.id, modInfo);
        }
      }
    }


    return Array.from(mods.values());
  }

  private async inspectPak(pak: MountedPak): Promise<ModInfo | null> {
    const archive = pak.archive;
    const filename = pak.name.toLowerCase();

    // 1. Check for mod.json
    if (archive.entries.has('mod.json')) {
      try {
        const data = archive.readFile('mod.json');
        if (data) {
          const json = new TextDecoder().decode(data);
          const metadata = JSON.parse(json);
          if (metadata.id) {
            return {
              ...metadata,
              pakFiles: [pak.name],
              priority: metadata.priority ?? MOD_PRIORITY.MOD,
            };
          }
        }
      } catch (e) {
        console.warn(`Failed to parse mod.json in ${pak.name}`, e);
      }
    }

    // 2. Check for Official Expansions by filename
    if (filename.includes('rogue')) {
      return {
        id: 'rogue',
        name: 'Ground Zero',
        description: 'Official Expansion Pack: Ground Zero',
        author: 'Rogue Entertainment',
        pakFiles: [pak.name],
        priority: MOD_PRIORITY.EXPANSION,
      };
    }
    if (filename.includes('xatrix')) {
      return {
        id: 'xatrix',
        name: 'The Reckoning',
        description: 'Official Expansion Pack: The Reckoning',
        author: 'Xatrix Entertainment',
        pakFiles: [pak.name],
        priority: MOD_PRIORITY.EXPANSION,
      };
    }

    // 3. Check for specific unique files to identify expansions if filename is generic
    if (archive.entries.has('maps/rogue1.bsp')) {
         return {
            id: 'rogue',
            name: 'Ground Zero',
            description: 'Official Expansion Pack: Ground Zero',
            author: 'Rogue Entertainment',
            pakFiles: [pak.name],
            priority: MOD_PRIORITY.EXPANSION,
         };
    }
    if (archive.entries.has('maps/xware1.bsp')) {
         return {
            id: 'xatrix',
            name: 'The Reckoning',
            description: 'Official Expansion Pack: The Reckoning',
            author: 'Xatrix Entertainment',
            pakFiles: [pak.name],
            priority: MOD_PRIORITY.EXPANSION,
         };
    }

    // 4. Default / Unknown -> Assign to Base Game if it looks like standard content
    // e.g. contains 'pics/colormap.pcx' -> Base Game
    if (archive.entries.has('pics/colormap.pcx')) {
         return {
            id: 'baseq2',
            name: 'Base Game',
            description: 'Quake II Base Game',
            author: 'id Software',
            pakFiles: [pak.name],
            priority: MOD_PRIORITY.BASE,
         };
    }

    return null;
  }
}

export const modDetectionService = new ModDetectionServiceImpl();
