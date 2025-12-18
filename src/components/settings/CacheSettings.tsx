import React, { useState, useEffect } from 'react';
import { cacheService, CACHE_STORES, CacheStoreName } from '@/src/services/cacheService';

export function CacheSettingsTab() {
  const [stats, setStats] = useState<Record<string, { count: number }> | null>(null);
  const [estimate, setEstimate] = useState<{ usage?: number, quota?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        cacheService.getStats(),
        cacheService.getStorageEstimate()
      ]);
      setStats(s);
      setEstimate(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cache stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClear = async (storeName: CacheStoreName) => {
    if (!confirm(`Are you sure you want to clear the ${storeName} cache?`)) return;
    setLoading(true);
    try {
      await cacheService.clear(storeName);
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear cache');
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL caches?')) return;
    setLoading(true);
    try {
      await cacheService.clearAll();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all caches');
      setLoading(false);
    }
  };

  const handleExport = async (storeName: CacheStoreName) => {
      setLoading(true);
      try {
          const data = await cacheService.export(storeName);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${storeName}-export.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to export cache');
      } finally {
          setLoading(false);
      }
  };

  const formatSize = (bytes?: number) => {
    if (bytes === undefined) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="settings-tab-content" data-testid="cache-settings-tab">
      <div className="settings-group">
        <h3>Storage Overview</h3>
        <div className="setting-item">
            <div className="setting-label">
                <span className="setting-name">Total Usage</span>
                <span className="setting-description">
                    {estimate ? `${formatSize(estimate.usage)} / ${formatSize(estimate.quota)}` : 'Loading...'}
                </span>
            </div>
             <div className="setting-control">
                <button
                    className="btn btn-danger"
                    onClick={handleClearAll}
                    disabled={loading}
                    data-testid="clear-all-button"
                >
                    Clear All Caches
                </button>
            </div>
        </div>
      </div>

      <div className="settings-group">
        <h3>Cache Stores</h3>
        {loading && !stats && <div>Loading stats...</div>}
        {error && <div className="error-message">{error}</div>}
        {stats && Object.entries(CACHE_STORES).map(([key, storeName]) => (
            <div className="setting-item" key={storeName}>
                <div className="setting-label">
                    <span className="setting-name">{storeName}</span>
                    <span className="setting-description">
                        Items: {stats[storeName]?.count ?? 0}
                    </span>
                </div>
                <div className="setting-control" style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => handleExport(storeName)}
                        disabled={loading}
                        data-testid={`export-${storeName}`}
                    >
                        Export
                    </button>
                    <button
                        className="btn btn-warning"
                        onClick={() => handleClear(storeName)}
                        disabled={loading}
                        data-testid={`clear-${storeName}`}
                    >
                        Clear
                    </button>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
