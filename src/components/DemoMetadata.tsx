import React, { useState, useEffect } from 'react';
import { demoMetadataService, DemoMetadata } from '../services/demoMetadataService';
import './DemoMetadata.css';

interface DemoMetadataProps {
  demoId: string;
  filename: string;
  duration?: number;
  mapName?: string;
  onSave?: () => void;
  onClose?: () => void;
}

export const DemoMetadataEditor: React.FC<DemoMetadataProps> = ({
  demoId,
  filename,
  duration,
  mapName,
  onSave,
  onClose
}) => {
  const [metadata, setMetadata] = useState<DemoMetadata>({
    id: demoId,
    tags: []
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const loaded = demoMetadataService.getMetadata(demoId);
    // Initialize with props if not already in metadata, but don't overwrite saved values if they exist
    setMetadata({
      ...loaded,
      id: demoId, // Ensure ID matches
      // Only set these if they aren't already saved
      mapName: loaded.mapName || mapName,
      duration: loaded.duration || duration,
    });
  }, [demoId, mapName, duration]);

  const handleSave = () => {
    demoMetadataService.saveMetadata(metadata);
    if (onSave) onSave();
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') || !newTag.trim()) {
      return;
    }

    if (!metadata.tags.includes(newTag.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="demo-metadata-editor">
      <div className="metadata-header">
        <h3>Demo Metadata</h3>
        <button className="close-button" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="metadata-content">
        <div className="metadata-row read-only">
          <label>Filename:</label>
          <span>{filename}</span>
        </div>

        {metadata.mapName && (
          <div className="metadata-row read-only">
            <label>Map:</label>
            <span>{metadata.mapName}</span>
          </div>
        )}

        {metadata.duration && (
          <div className="metadata-row read-only">
            <label>Duration:</label>
            <span>{metadata.duration.toFixed(2)}s</span>
          </div>
        )}

        <div className="metadata-row">
          <label htmlFor="customName">Custom Name:</label>
          <input
            id="customName"
            type="text"
            value={metadata.customName || ''}
            onChange={e => setMetadata(prev => ({ ...prev, customName: e.target.value }))}
            placeholder="Display name"
          />
        </div>

        <div className="metadata-row">
          <label htmlFor="rating">Rating (1-5):</label>
          <input
            id="rating"
            type="number"
            min="1"
            max="5"
            value={metadata.rating || ''}
            onChange={e => setMetadata(prev => ({ ...prev, rating: parseInt(e.target.value) || undefined }))}
          />
        </div>

        <div className="metadata-row">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={metadata.description || ''}
            onChange={e => setMetadata(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="metadata-row tags-section">
          <label>Tags:</label>
          <div className="tags-input-container">
            <input
              type="text"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="Add tag (Enter)"
            />
            <button onClick={handleAddTag} className="add-tag-btn">+</button>
          </div>
          <div className="tags-list">
            {metadata.tags.map(tag => (
              <span key={tag} className="tag-chip">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} aria-label={`Remove tag ${tag}`}>×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="metadata-footer">
        <button onClick={onClose} className="cancel-btn">Cancel</button>
        <button onClick={handleSave} className="save-btn">Save</button>
      </div>
    </div>
  );
};
