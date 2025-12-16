import React from 'react';
import './ScreenshotSettings.css';

export interface LightingOptions {
    brightness: number;
    gamma: number;
    ambient: number;
    fullbright: boolean;
    freezeLights: boolean;
}

interface LightingControlsProps {
    options: LightingOptions;
    onChange: (options: LightingOptions) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const LightingControls: React.FC<LightingControlsProps> = ({ options, onChange, isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleChange = (key: keyof LightingOptions, value: number | boolean) => {
        onChange({
            ...options,
            [key]: value
        });
    };

    return (
        <div className="screenshot-settings-modal" style={{ zIndex: 2000 }}>
            <div className="screenshot-settings-content" style={{ minWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Lighting Controls</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                </div>

                <div className="setting-group">
                    <label>Brightness: {options.brightness.toFixed(2)}</label>
                    <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.05"
                        value={options.brightness}
                        onChange={(e) => handleChange('brightness', parseFloat(e.target.value))}
                    />
                </div>

                <div className="setting-group">
                    <label>Gamma: {options.gamma.toFixed(2)}</label>
                    <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={options.gamma}
                        onChange={(e) => handleChange('gamma', parseFloat(e.target.value))}
                    />
                </div>

                <div className="setting-group">
                    <label>Ambient Light: {options.ambient.toFixed(2)}</label>
                    <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={options.ambient}
                        onChange={(e) => handleChange('ambient', parseFloat(e.target.value))}
                    />
                </div>

                <div className="setting-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <label style={{ marginBottom: 0, marginRight: '10px' }}>Fullbright Mode:</label>
                    <input
                        type="checkbox"
                        checked={options.fullbright}
                        onChange={(e) => handleChange('fullbright', e.target.checked)}
                    />
                </div>

                <div className="setting-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <label style={{ marginBottom: 0, marginRight: '10px' }}>Freeze Animated Lights:</label>
                    <input
                        type="checkbox"
                        checked={options.freezeLights}
                        onChange={(e) => handleChange('freezeLights', e.target.checked)}
                    />
                </div>

                <div className="button-group" style={{ marginTop: '15px' }}>
                    <button onClick={() => onChange({ brightness: 1.0, gamma: 1.0, ambient: 0.1, fullbright: false, freezeLights: false })} className="cancel-btn">
                        Reset Defaults
                    </button>
                    <button onClick={onClose} className="capture-btn">Close</button>
                </div>
            </div>
        </div>
    );
};
