import React, { useState, useEffect, useMemo } from 'react';
import { demoStorageService, StoredDemo } from '@/src/services/demoStorageService';
import { demoMetadataService, DemoMetadata } from '@/src/services/demoMetadataService';
import './DemoBrowser.css';

interface DemoBrowserProps {
  onPlayDemo: (demo: StoredDemo) => void;
  onClose: () => void;
}

type SortOption = 'date' | 'name' | 'size' | 'duration';

interface EnrichedDemo extends StoredDemo {
  metadata?: DemoMetadata;
}

export function DemoBrowser({ onPlayDemo, onClose }: DemoBrowserProps) {
  const [demos, setDemos] = useState<StoredDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [metadataMap, setMetadataMap] = useState<Record<string, DemoMetadata>>({});

  useEffect(() => {
    loadDemos();
  }, []);

  const loadDemos = async () => {
    try {
      setLoading(true);
      const list = await demoStorageService.getDemos();
      setDemos(list);

      // Load all metadata
      const allMeta = demoMetadataService.getAllMetadata();
      const metaMap: Record<string, DemoMetadata> = {};
      allMeta.forEach(m => {
        metaMap[m.id] = m;
      });
      setMetadataMap(metaMap);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demos');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedDemos = useMemo(() => {
    let result: EnrichedDemo[] = demos.map(d => ({
      ...d,
      metadata: metadataMap[d.id]
    }));

    // Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(d => {
        const nameMatch = d.name.toLowerCase().includes(lowerQuery);
        const mapMatch = d.mapName?.toLowerCase().includes(lowerQuery);
        const customNameMatch = d.metadata?.customName?.toLowerCase().includes(lowerQuery);
        const tagMatch = d.metadata?.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
        const descMatch = d.metadata?.description?.toLowerCase().includes(lowerQuery);

        return nameMatch || mapMatch || customNameMatch || tagMatch || descMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.metadata?.customName || a.name).localeCompare(b.metadata?.customName || b.name);
        case 'size':
          return b.size - a.size;
        case 'duration':
          // Prioritize duration from metadata (more accurate if edited/parsed), then fallback to stored demo property
          const durationA = a.metadata?.duration ?? a.duration ?? 0;
          const durationB = b.metadata?.duration ?? b.duration ?? 0;
          return durationB - durationA;
        case 'date':
        default:
          return b.date - a.date;
      }
    });

    return result;
  }, [demos, metadataMap, searchQuery, sortBy]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this demo?')) return;

    try {
      await demoStorageService.deleteDemo(id);
      demoMetadataService.deleteMetadata(id);
      setDemos(demos.filter(d => d.id !== id));
      const newMeta = { ...metadataMap };
      delete newMeta[id];
      setMetadataMap(newMeta);
    } catch (err) {
      alert('Failed to delete demo');
    }
  };

  const handleDownload = (e: React.MouseEvent, demo: StoredDemo) => {
    e.stopPropagation();
    const url = URL.createObjectURL(demo.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = demo.name.endsWith('.dm2') ? demo.name : `${demo.name}.dm2`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="demo-browser-overlay">
      <div className="demo-browser-content">
        <div className="demo-browser-header">
          <h2>Recorded Demos</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="demo-browser-controls">
          <input
            type="text"
            placeholder="Search demos (name, map, tags)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="sort-select"
            aria-label="Sort by"
          >
            <option value="date">Date (Newest)</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
            <option value="duration">Duration</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="demo-list-container">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : filteredAndSortedDemos.length === 0 ? (
            <div className="empty-state">
              {searchQuery ? 'No demos match your search.' : 'No recorded demos found.'}
            </div>
          ) : (
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedDemos.map(demo => (
                  <tr key={demo.id} onClick={() => onPlayDemo(demo)} className="demo-row">
                    <td>
                      <div className="demo-name-container">
                        <div className="demo-name">
                          {demo.metadata?.customName || demo.name}
                          {demo.metadata?.customName && <span className="original-name">({demo.name})</span>}
                        </div>
                        <div className="demo-badges">
                          {demo.mapName && <span className="demo-badge map-badge">{demo.mapName}</span>}
                          {demo.metadata?.tags.map(tag => (
                            <span key={tag} className="demo-badge tag-badge">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(demo.date)}</td>
                    <td>{formatDuration(demo.metadata?.duration ?? demo.duration)}</td>
                    <td>{formatSize(demo.size)}</td>
                    <td className="actions-cell">
                      <button
                        className="action-btn download-btn"
                        onClick={(e) => handleDownload(e, demo)}
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={(e) => handleDelete(e, demo.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
