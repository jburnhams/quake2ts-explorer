import React from 'react';
import './SurfaceFlags.css';
import { getSurfaceFlagNames } from '../utils/surfaceFlagParser';

export interface SurfaceProperties {
  textureName: string;
  flags: number;
  value: number; // light value
  contents?: number;
}

export interface SurfaceFlagsProps {
  properties: SurfaceProperties | null;
}

export function SurfaceFlags({ properties }: SurfaceFlagsProps) {
  if (!properties) {
    return <div className="surface-flags-empty" data-testid="surface-flags-empty">Hover over a surface to see details</div>;
  }

  const flagNames = getSurfaceFlagNames(properties.flags);

  return (
    <div className="surface-flags" data-testid="surface-flags">
      <div className="surface-flags-header">Surface Properties</div>

      <div className="surface-property-row">
        <span className="surface-property-label">Texture:</span>
        <span className="surface-property-value">{properties.textureName}</span>
      </div>

      <div className="surface-property-row">
        <span className="surface-property-label">Value:</span>
        <span className="surface-property-value">{properties.value}</span>
      </div>

      <div className="surface-flags-list">
        <div className="surface-property-label">Flags:</div>
        {flagNames.length === 0 ? (
           <span className="surface-flags-none">None</span>
        ) : (
          <div className="surface-flags-tags">
            {flagNames.map(flag => (
              <span key={flag} className="surface-flag-tag">{flag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
