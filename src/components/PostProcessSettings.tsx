import React from 'react';
import './ScreenshotSettings.css'; // Reusing existing styles
import { PostProcessOptions, defaultPostProcessOptions } from '../utils/postProcessing';

interface PostProcessSettingsProps {
    options: PostProcessOptions;
    onChange: (options: PostProcessOptions) => void;
    isOpen: boolean;
    onClose: () => void;
}

export const PostProcessSettings: React.FC<PostProcessSettingsProps> = ({ options, onChange, isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleChange = (key: keyof PostProcessOptions, value: number | boolean) => {
        onChange({
            ...options,
            [key]: value
        });
    };

    return (
        <div className="screenshot-settings-modal" style={{ zIndex: 2000 }}>
            <div className="screenshot-settings-content" style={{ minWidth: '320px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Post-Processing</h3>
                    <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
                </div>

                <div className="setting-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <label htmlFor="pp-enabled" style={{ marginBottom: 0, marginRight: '10px', fontWeight: 'bold' }}>Enable Post-Processing</label>
                    <input
                        id="pp-enabled"
                        type="checkbox"
                        checked={options.enabled}
                        onChange={(e) => handleChange('enabled', e.target.checked)}
                    />
                </div>

                <hr style={{ borderColor: '#444', width: '100%' }} />

                <h4 style={{ margin: '10px 0', fontSize: '0.9em', color: '#aaa' }}>Bloom</h4>
                <div className="setting-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <label htmlFor="pp-bloom-enabled" style={{ marginBottom: 0, marginRight: '10px' }}>Enable Bloom</label>
                    <input
                        id="pp-bloom-enabled"
                        type="checkbox"
                        checked={options.bloomEnabled}
                        disabled={!options.enabled}
                        onChange={(e) => handleChange('bloomEnabled', e.target.checked)}
                    />
                </div>
                <div className="setting-group">
                    <label htmlFor="pp-bloom-threshold" style={{ opacity: options.bloomEnabled ? 1 : 0.5 }}>Threshold: {options.bloomThreshold.toFixed(2)}</label>
                    <input
                        id="pp-bloom-threshold"
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={options.bloomThreshold}
                        disabled={!options.enabled || !options.bloomEnabled}
                        onChange={(e) => handleChange('bloomThreshold', parseFloat(e.target.value))}
                    />
                </div>
                <div className="setting-group">
                    <label htmlFor="pp-bloom-intensity" style={{ opacity: options.bloomEnabled ? 1 : 0.5 }}>Intensity: {options.bloomIntensity.toFixed(2)}</label>
                    <input
                        id="pp-bloom-intensity"
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={options.bloomIntensity}
                        disabled={!options.enabled || !options.bloomEnabled}
                        onChange={(e) => handleChange('bloomIntensity', parseFloat(e.target.value))}
                    />
                </div>

                <hr style={{ borderColor: '#444', width: '100%' }} />

                <h4 style={{ margin: '10px 0', fontSize: '0.9em', color: '#aaa' }}>Anti-Aliasing</h4>
                <div className="setting-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <label htmlFor="pp-fxaa" style={{ marginBottom: 0, marginRight: '10px' }}>Enable FXAA</label>
                    <input
                        id="pp-fxaa"
                        type="checkbox"
                        checked={options.fxaaEnabled}
                        disabled={!options.enabled}
                        onChange={(e) => handleChange('fxaaEnabled', e.target.checked)}
                    />
                </div>

                <hr style={{ borderColor: '#444', width: '100%' }} />

                <h4 style={{ margin: '10px 0', fontSize: '0.9em', color: '#aaa' }}>Color Grading</h4>
                <div className="setting-group">
                    <label htmlFor="pp-gamma">Gamma: {options.gamma.toFixed(2)}</label>
                    <input
                        id="pp-gamma"
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={options.gamma}
                        disabled={!options.enabled}
                        onChange={(e) => handleChange('gamma', parseFloat(e.target.value))}
                    />
                </div>
                <div className="setting-group">
                    <label htmlFor="pp-contrast">Contrast: {options.contrast.toFixed(2)}</label>
                    <input
                        id="pp-contrast"
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={options.contrast}
                        disabled={!options.enabled}
                        onChange={(e) => handleChange('contrast', parseFloat(e.target.value))}
                    />
                </div>
                <div className="setting-group">
                    <label htmlFor="pp-saturation">Saturation: {options.saturation.toFixed(2)}</label>
                    <input
                        id="pp-saturation"
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={options.saturation}
                        disabled={!options.enabled}
                        onChange={(e) => handleChange('saturation', parseFloat(e.target.value))}
                    />
                </div>
                <div className="setting-group">
                    <label htmlFor="pp-brightness">Brightness: {options.brightness.toFixed(2)}</label>
                    <input
                        id="pp-brightness"
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={options.brightness}
                        disabled={!options.enabled}
                        onChange={(e) => handleChange('brightness', parseFloat(e.target.value))}
                    />
                </div>

                <div className="button-group" style={{ marginTop: '15px' }}>
                    <button onClick={() => onChange(defaultPostProcessOptions)} className="cancel-btn">
                        Reset Defaults
                    </button>
                    <button onClick={onClose} className="capture-btn">Close</button>
                </div>
            </div>
        </div>
    );
};
