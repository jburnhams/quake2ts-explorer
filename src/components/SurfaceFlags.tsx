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
  onFilterByFlag?: (flag: string) => void;
  activeFilter?: string | null;
}

export function SurfaceFlags({ properties, onFilterByFlag, activeFilter }: SurfaceFlagsProps) {
  if (!properties) {
     if (activeFilter) {
         return (
             <div className="surface-flags-filter-active">
                 <span>Filtering by: <strong>{activeFilter}</strong></span>
                 <button onClick={() => onFilterByFlag && onFilterByFlag(activeFilter)}>Clear</button>
             </div>
         );
     }
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
              <span
                  key={flag}
                  className={`surface-flag-tag ${activeFilter === flag ? 'active' : ''}`}
                  onClick={() => onFilterByFlag && onFilterByFlag(flag)}
                  title="Click to filter by this flag"
                  style={{cursor: 'pointer'}}
              >
                  {flag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
