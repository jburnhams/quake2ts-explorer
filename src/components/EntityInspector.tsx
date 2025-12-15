
import React from 'react';
import { EntityRecord } from '@/src/services/entityService';
import entityReferenceData from '@/src/data/entityReference.json';
import './EntityDatabase.css'; // We'll reuse styles or add new ones

interface EntityInspectorProps {
  entity: EntityRecord | null;
  onClose?: () => void;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({ entity, onClose }) => {
  if (!entity) {
    return (
      <div className="entity-inspector-panel">
        <div className="inspector-header">Inspector</div>
        <div className="empty-state">
          <span>Select an entity to view details</span>
        </div>
      </div>
    );
  }

  // Sort properties
  const sortedProps = Object.entries(entity.properties).sort(([keyA], [keyB]) =>
    keyA.localeCompare(keyB)
  );

  // Look up reference info
  const reference = (entityReferenceData as any)[entity.classname];

  return (
    <div className="entity-inspector-panel">
      <div className="inspector-header">
        {entity.classname}
        {onClose && <button onClick={onClose} style={{float: 'right'}}>×</button>}
      </div>
      <div className="inspector-content">
        {reference && (
            <div className="property-group reference-info">
                <strong>Description</strong>
                <p>{reference.description}</p>
            </div>
        )}

        <div className="property-group">
          <strong>Metadata</strong>
          <div className="property-row">
            <span className="property-key">Map</span>
            <span className="property-value">{entity.mapName}</span>
          </div>
          <div className="property-row">
            <span className="property-key">Index</span>
            <span className="property-value">{entity.index}</span>
          </div>
        </div>

        <div className="property-group">
          <strong>Properties</strong>
          {sortedProps.map(([key, value]) => {
            const propHelp = reference?.properties?.[key];
            return (
                <div className="property-row" key={key} title={propHelp || ''}>
                <span className="property-key">{key}</span>
                <span className="property-value">{value}</span>
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
