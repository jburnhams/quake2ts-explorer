import { keybindingService, KeyBinding } from '@/src/services/keybindingService';
import { DEFAULT_BINDINGS } from '@/src/config/defaultBindings';

const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('KeybindingService', () => {
  beforeEach(() => {
    localStorage.clear();
    // Re-instantiate service to clear internal state if singleton logic allowed it,
    // but since it's exported as constant instance, we rely on reset methods or carefully managing state.
    // In our implementation, constructor loads from localStorage.
    // We can't easily re-construct the singleton.
    // We will use resetToDefaults to clean slate.
    keybindingService.resetToDefaults();
  });

  test('loads default bindings initially', () => {
    const bindings = keybindingService.getBindings();
    expect(bindings.length).toBeGreaterThan(0);

    // Check a known default
    const forward = bindings.find(b => b.action === '+forward');
    expect(forward).toBeDefined();
    expect(forward?.primaryKey).toBe('KeyW');
  });

  test('binds a key correctly', () => {
    keybindingService.bindKey('+forward', 'KeyP', 'primary');

    const bindings = keybindingService.getBindings();
    const forward = bindings.find(b => b.action === '+forward');

    expect(forward?.primaryKey).toBe('KeyP');
    // Secondary should remain if it existed
    expect(forward?.secondaryKey).toBe('ArrowUp');
  });

  test('binds secondary key', () => {
      keybindingService.bindKey('+jump', 'KeyJ', 'secondary');

      const bindings = keybindingService.getBindings();
      const jump = bindings.find(b => b.action === '+jump');

      expect(jump?.secondaryKey).toBe('KeyJ');
      expect(jump?.primaryKey).toBe('Space'); // Default
  });

  test('detects conflicts', () => {
      const conflict = keybindingService.checkConflict('Space', '+crouch');
      expect(conflict).toBe('Jump'); // Space is Jump

      const noConflict = keybindingService.checkConflict('KeyZ', '+crouch');
      expect(noConflict).toBeNull(); // Assuming Z is unbound by default
  });

  test('unbinds key', () => {
      keybindingService.unbindKey('+forward', 'primary');

      const bindings = keybindingService.getBindings();
      const forward = bindings.find(b => b.action === '+forward');

      // Unbinding primary promotes secondary to primary in this implementation
      expect(forward?.primaryKey).toBe('ArrowUp');
      expect(forward?.secondaryKey).toBeNull();
  });

  test('persists to localStorage', () => {
    keybindingService.bindKey('+forward', 'KeyL', 'primary');

    const stored = localStorage.getItem('quake2ts-keybindings');
    expect(stored).toBeTruthy();
    expect(stored).toContain('KeyL');
  });
});
