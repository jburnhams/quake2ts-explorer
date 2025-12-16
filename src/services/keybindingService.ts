import { DEFAULT_BINDINGS, KeyBindingEntry } from '@/src/config/defaultBindings';

const STORAGE_KEY = 'quake2ts-keybindings';

export interface KeyBinding {
  action: string;
  category: 'Movement' | 'Combat' | 'Interface' | 'Inventory';
  primaryKey: string | null;
  secondaryKey: string | null;
  description: string;
}

export const ACTION_CATEGORIES: Record<string, KeyBinding['category']> = {
  '+forward': 'Movement',
  '+back': 'Movement',
  '+moveleft': 'Movement',
  '+moveright': 'Movement',
  '+jump': 'Movement',
  '+crouch': 'Movement',
  '+attack': 'Combat',
  'weapon 1': 'Combat',
  'weapon 2': 'Combat',
  'weapon 3': 'Combat',
  'weapon 4': 'Combat',
  'weapon 5': 'Combat',
  'weapon 6': 'Combat',
  'weapon 7': 'Combat',
  'weapon 8': 'Combat',
  'weapon 9': 'Combat',
  'weapon 0': 'Combat',
  'weapnext': 'Combat',
  'weapprev': 'Combat',
  '+use': 'Interface',
  'invprev': 'Inventory',
  'invnext': 'Inventory',
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  '+forward': 'Move Forward',
  '+back': 'Move Backward',
  '+moveleft': 'Strafe Left',
  '+moveright': 'Strafe Right',
  '+jump': 'Jump',
  '+crouch': 'Crouch',
  '+attack': 'Attack',
  '+use': 'Use Item / Open Door',
  'weapon 1': 'Select Blaster',
  'weapon 2': 'Select Shotgun',
  'weapon 3': 'Select Super Shotgun',
  'weapon 4': 'Select Machinegun',
  'weapon 5': 'Select Chaingun',
  'weapon 6': 'Select Grenade Launcher',
  'weapon 7': 'Select Rocket Launcher',
  'weapon 8': 'Select Hyperblaster',
  'weapon 9': 'Select Railgun',
  'weapon 0': 'Select BFG10K',
  'weapnext': 'Next Weapon',
  'weapprev': 'Previous Weapon',
  'invprev': 'Previous Item',
  'invnext': 'Next Item',
};

export class KeybindingService {
  private bindings: KeyBindingEntry[];

  constructor() {
    this.bindings = this.loadBindings();
  }

  private loadBindings(): KeyBindingEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load keybindings', e);
    }
    return [...DEFAULT_BINDINGS];
  }

  public getBindings(): KeyBinding[] {
    const actions = new Set(Object.keys(ACTION_DESCRIPTIONS));
    const result: KeyBinding[] = [];

    actions.forEach(action => {
      const entries = this.bindings.filter(b => b.command === action);
      result.push({
        action,
        category: ACTION_CATEGORIES[action] || 'Interface',
        description: ACTION_DESCRIPTIONS[action] || action,
        primaryKey: entries[0]?.code || null,
        secondaryKey: entries[1]?.code || null
      });
    });

    return result;
  }

  public getRawBindings(): KeyBindingEntry[] {
    return [...this.bindings];
  }

  public bindKey(action: string, code: string, slot: 'primary' | 'secondary' = 'primary') {
    // Remove existing binding for this key if any (to avoid duplicates)
    // Note: Quake 2 allows multiple keys for same action, but UI simplifies to primary/secondary
    // Also allows same key for multiple actions? Usually conflicts are warned.

    // First, remove the specific binding if we are rebinding a slot
    const current = this.getBindings().find(b => b.action === action);
    if (!current) return;

    // Filter out the binding we are replacing
    let newBindings = this.bindings.filter(b => b.command !== action);

    // Reconstruct valid bindings
    if (slot === 'primary') {
      if (code) newBindings.push({ code, command: action });
      if (current.secondaryKey) newBindings.push({ code: current.secondaryKey, command: action });
    } else {
      if (current.primaryKey) newBindings.push({ code: current.primaryKey, command: action });
      if (code) newBindings.push({ code, command: action });
    }

    this.bindings = newBindings;
    this.saveBindings();
  }

  public unbindKey(action: string, slot: 'primary' | 'secondary') {
    // Get the exact bindings to verify we are removing the right one
    const currentBindings = this.bindings.filter(b => b.command === action);
    if (currentBindings.length === 0) return;

    // Logic:
    // We treat the first entry as primary and second as secondary in getBindings()
    // We need to match that logic here.

    // If unbinding primary, we remove the first entry
    // If unbinding secondary, we remove the second entry (if exists)

    let newBindings = this.bindings.filter(b => b.command !== action);

    if (slot === 'primary') {
      // Logic for removing primary:
      // Since bindings are just a list, removing the first one (primary)
      // effectively promotes the second one (if it exists) to primary.
      // This is standard behavior for list-based bindings.
      if (currentBindings.length > 1) {
        newBindings.push(currentBindings[1]);
      }
    } else if (slot === 'secondary') {
       if (currentBindings.length > 0) {
         newBindings.push(currentBindings[0]);
       }
    }

    this.bindings = newBindings;
    this.saveBindings();
  }

  public checkConflict(code: string, action: string): string | null {
    const existing = this.bindings.find(b => b.code === code && b.command !== action);
    if (existing) {
      return ACTION_DESCRIPTIONS[existing.command] || existing.command;
    }
    return null;
  }

  public resetToDefaults() {
    this.bindings = [...DEFAULT_BINDINGS];
    this.saveBindings();
  }

  public resetCategory(category: string) {
    if (category === 'All') {
      this.resetToDefaults();
      return;
    }

    // Filter out current bindings for this category (custom ones)
    // Then add back default bindings for this category

    // 1. Identify actions in this category
    const categoryActions = new Set<string>();
    Object.entries(ACTION_CATEGORIES).forEach(([action, cat]) => {
      if (cat === category) {
        categoryActions.add(action);
      }
    });

    // 2. Remove all bindings for these actions
    this.bindings = this.bindings.filter(b => !categoryActions.has(b.command));

    // 3. Add default bindings for these actions
    const defaultCategoryBindings = DEFAULT_BINDINGS.filter(b => categoryActions.has(b.command));
    this.bindings = [...this.bindings, ...defaultCategoryBindings];

    this.saveBindings();
  }

  public applyPreset(presetName: string) {
      // For now, only 'Default' is supported as it matches DEFAULT_BINDINGS
      // In future, we can define more presets in a config file
      if (presetName === 'Default' || presetName === 'WASD') {
          this.resetToDefaults();
      } else if (presetName === 'Arrow Keys') {
          // Example Arrow Keys Preset
           this.bindings = [
               { code: 'ArrowUp', command: '+forward' },
               { code: 'ArrowDown', command: '+back' },
               { code: 'ArrowLeft', command: '+moveleft' }, // Turning vs strafing preference? Assuming strafe for modern feel
               { code: 'ArrowRight', command: '+moveright' },
               { code: 'ControlRight', command: '+attack' },
               { code: 'Enter', command: '+use' },
               { code: 'Space', command: '+jump' },
               // Add others as needed, keeping it simple for now
               ...DEFAULT_BINDINGS.filter(b => ['invprev', 'invnext', 'weapnext', 'weapprev'].includes(b.command) || b.command.startsWith('weapon'))
           ];
           this.saveBindings();
      }
  }

  private saveBindings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
      // Notify input service? Or just let next init pick it up.
      // Ideally should be hot-reloadable.
    } catch (e) {
      console.error('Failed to save keybindings', e);
    }
  }
}

export const keybindingService = new KeybindingService();
