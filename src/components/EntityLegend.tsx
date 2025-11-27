import React from 'react';

interface EntityLegendProps {
  classnames: string[];
  hiddenClassnames: Set<string>;
  onToggle: (classname: string) => void;
}

export const EntityLegend: React.FC<EntityLegendProps> = ({ classnames, hiddenClassnames, onToggle }) => {
  if (classnames.length === 0) return null;

  return (
    <div className="entity-legend" data-testid="entity-legend">
      <div className="metadata-section">
        <h3>Entities ({classnames.length})</h3>
        <ul className="entity-list">
          {classnames.map(name => {
            const isHidden = hiddenClassnames.has(name);
            return (
              <li key={name} className="entity-item">
                <label className="entity-label">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => onToggle(name)}
                    data-testid={`toggle-${name}`}
                  />
                  <span className="entity-name">{name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
