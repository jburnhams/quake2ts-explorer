import React from 'react';
import { BspEntity } from '@quake2ts/engine';

interface EntityMetadataProps {
  entity: BspEntity | null;
}

export const EntityMetadata: React.FC<EntityMetadataProps> = ({ entity }) => {
  if (!entity) {
    return null; // Don't show anything if no entity selected, or maybe a placeholder?
                 // Plan says: "When nothing is selected, it can show a summary or remain empty."
                 // Let's render nothing or maybe "No entity selected" if we want to fill space.
                 // But sidebar already has MetadataPanel and EntityLegend.
                 // If I put it at the top, it might be weird if empty.
                 // Let's return null if no entity, to keep it clean.
  }

  return (
    <div className="entity-metadata" data-testid="entity-metadata" style={{ marginTop: '1rem', borderTop: '1px solid #444', paddingTop: '1rem' }}>
      <div className="metadata-section">
        <h3>Selection: {entity.classname || 'Entity'}</h3>
        <div className="metadata-props" style={{ overflowX: 'auto' }}>
            {Object.entries(entity.properties).map(([key, value]) => (
                <div key={key} className="metadata-row" style={{ display: 'flex', gap: '8px', fontSize: '0.9em', marginBottom: '4px' }}>
                    <span className="metadata-key" style={{ fontWeight: 'bold', minWidth: '80px', flexShrink: 0 }}>{key}:</span>
                    <span className="metadata-value" style={{ wordBreak: 'break-all' }}>{value}</span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
