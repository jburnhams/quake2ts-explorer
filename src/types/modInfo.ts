export interface ModInfo {
  id: string;
  name: string;
  version?: string;
  author?: string;
  description?: string;
  pakFiles: string[]; // List of PAK filenames belonging to this mod
  dependencies?: string[]; // IDs of other required mods
  homepage?: string;
  thumbnail?: string; // Base64 or URL
  priority?: number; // Load priority (default: 100 for mods, 50 for expansions, 0 for base)
}

export const MOD_PRIORITY = {
  BASE: 0,
  EXPANSION: 50,
  MOD: 100,
  USER_OVERRIDE: 200,
};
