import React, { useState, useEffect } from 'react';
import { demoStorageService, StoredDemo } from '@/src/services/demoStorageService';
import './DemoBrowser.css';

interface DemoBrowserProps {
  onPlayDemo: (demo: StoredDemo) => void;
  onClose: () => void;
}

export function DemoBrowser({ onPlayDemo, onClose }: DemoBrowserProps) {
  const [demos, setDemos] = useState<StoredDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDemos();
  }, []);

  const loadDemos = async () => {
    try {
      setLoading(true);
      const list = await demoStorageService.getDemos();
      setDemos(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this demo?')) return;

    try {
      await demoStorageService.deleteDemo(id);
      setDemos(demos.filter(d => d.id !== id));
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

  return (
    <div className="demo-browser-overlay">
      <div className="demo-browser-content">
        <div className="demo-browser-header">
          <h2>Recorded Demos</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="demo-list-container">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : demos.length === 0 ? (
            <div className="empty-state">No recorded demos found.</div>
          ) : (
            <table className="demo-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demos.map(demo => (
                  <tr key={demo.id} onClick={() => onPlayDemo(demo)} className="demo-row">
                    <td>
                      <div className="demo-name">{demo.name}</div>
                      {demo.mapName && <span className="demo-map-badge">{demo.mapName}</span>}
                    </td>
                    <td>{formatDate(demo.date)}</td>
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
