import React, { useState, useEffect } from 'react';
import './KeybindingEditor.css';
import { keybindingService, KeyBinding, ACTION_CATEGORIES } from '@/src/services/keybindingService';

interface KeybindingEditorProps {
  onClose: () => void;
}

export function KeybindingEditor({ onClose }: KeybindingEditorProps) {
  const [bindings, setBindings] = useState<KeyBinding[]>([]);
  const [captureMode, setCaptureMode] = useState<{ action: string, slot: 'primary' | 'secondary' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  useEffect(() => {
    loadBindings();
  }, []);

  const loadBindings = () => {
    setBindings(keybindingService.getBindings());
  };

  useEffect(() => {
    if (!captureMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setCaptureMode(null);
        setConflictWarning(null);
        return;
      }

      // Map event.code to readable string if needed, or just use code
      const code = e.code;

      // Check conflict
      const conflict = keybindingService.checkConflict(code, captureMode.action);

      if (conflict) {
          // Ask user to resolve?
          if (confirm(`Key '${code}' is already bound to '${conflict}'. Overwrite?`)) {
              // Proceed
          } else {
              setCaptureMode(null);
              return;
          }
      }

      keybindingService.bindKey(captureMode.action, code, captureMode.slot);
      loadBindings();
      setCaptureMode(null);
      setConflictWarning(null);
    };

    // Mouse buttons?
    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Map button to "Mouse1", "Mouse2", etc.
        // Quake convention: Mouse1=Left, Mouse2=Right, Mouse3=Middle
        let code = '';
        if (e.button === 0) code = 'Mouse1';
        else if (e.button === 1) code = 'Mouse3'; // Middle often 3 in DOM but 2 in some games? Standard is 0=L, 1=M, 2=R. Quake: 1=L, 2=R, 3=M.
        else if (e.button === 2) code = 'Mouse2';
        else code = `Mouse${e.button + 1}`;

         // Check conflict
        const conflict = keybindingService.checkConflict(code, captureMode.action);
        if (conflict) {
             if (!confirm(`Button '${code}' is already bound to '${conflict}'. Overwrite?`)) {
                 setCaptureMode(null);
                 return;
             }
        }

        keybindingService.bindKey(captureMode.action, code, captureMode.slot);
        loadBindings();
        setCaptureMode(null);
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [captureMode]);

  const handleReset = () => {
      if (confirm(`Reset ${activeCategory === 'All' ? 'all' : activeCategory} keybindings to defaults?`)) {
          keybindingService.resetCategory(activeCategory);
          loadBindings();
      }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (confirm(`Apply ${e.target.value} preset? This will overwrite current bindings.`)) {
          keybindingService.applyPreset(e.target.value);
          loadBindings();
      }
  };

  const handleUnbind = (action: string, slot: 'primary' | 'secondary', e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent entering capture mode
      keybindingService.unbindKey(action, slot);
      loadBindings();
  };

  const filteredBindings = bindings.filter(b => {
    const matchesSearch = b.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || b.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Movement', 'Combat', 'Inventory', 'Interface'];

  return (
    <div className="keybinding-overlay">
      <div className="keybinding-modal">
        <header className="keybinding-header">
          <h2>Key Bindings</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </header>

        <div className="keybinding-toolbar">
          <div className="keybinding-search">
            <input
              type="text"
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="keybinding-categories">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="keybinding-presets">
              <select onChange={handlePresetChange} value="" style={{ padding: '6px', borderRadius: '4px', background: '#2a2a2a', color: '#fff', border: '1px solid #444' }}>
                  <option value="" disabled>Load Preset...</option>
                  <option value="WASD">WASD (Default)</option>
                  <option value="Arrow Keys">Arrow Keys</option>
              </select>
          </div>
        </div>

        <div className="keybinding-list">
          <div className="keybinding-row header">
            <div className="col-action">Action</div>
            <div className="col-key">Primary</div>
            <div className="col-key">Secondary</div>
          </div>

          {filteredBindings.map(binding => (
            <div key={binding.action} className="keybinding-row">
              <div className="col-action">{binding.description}</div>

              <div
                className={`col-key ${captureMode?.action === binding.action && captureMode?.slot === 'primary' ? 'capturing' : ''}`}
                onClick={() => setCaptureMode({ action: binding.action, slot: 'primary' })}
              >
                {binding.primaryKey || <span className="unbound">Unbound</span>}
                {binding.primaryKey && (
                    <button
                        className="unbind-btn"
                        onClick={(e) => handleUnbind(binding.action, 'primary', e)}
                        title="Unbind"
                    >&times;</button>
                )}
              </div>

              <div
                className={`col-key ${captureMode?.action === binding.action && captureMode?.slot === 'secondary' ? 'capturing' : ''}`}
                onClick={() => setCaptureMode({ action: binding.action, slot: 'secondary' })}
              >
                {binding.secondaryKey || <span className="unbound">Unbound</span>}
                {binding.secondaryKey && (
                    <button
                        className="unbind-btn"
                        onClick={(e) => handleUnbind(binding.action, 'secondary', e)}
                        title="Unbind"
                    >&times;</button>
                )}
              </div>
            </div>
          ))}

          {filteredBindings.length === 0 && (
              <div className="no-results">No bindings found</div>
          )}
        </div>

        <footer className="keybinding-footer">
          <div className="status-message">
              {captureMode ? 'Press a key to bind (ESC to cancel)...' : ''}
          </div>
          <button className="btn btn-danger" onClick={handleReset}>
              {activeCategory === 'All' ? 'Reset All Defaults' : `Reset ${activeCategory} Defaults`}
          </button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
}
