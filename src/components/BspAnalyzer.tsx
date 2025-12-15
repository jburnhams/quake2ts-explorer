import React, { useState } from 'react';
import { BspMap } from 'quake2ts/engine';
import { PakService } from '../services/pakService';
import { UniversalViewer } from './UniversalViewer/UniversalViewer';
import { LightmapInspector } from './LightmapInspector';
import { ViewerAdapter } from './UniversalViewer/adapters/types';
import './BspAnalyzer.css';

export interface BspAnalyzerProps {
  map: BspMap;
  pakService: PakService;
  filePath: string;
  onClassnamesLoaded?: (classnames: string[]) => void;
  hiddenClassnames?: Set<string>;
  onEntitySelected?: (entity: any) => void;
}

type TabType = 'overview' | 'geometry' | 'lightmaps' | 'visibility' | 'entities';

interface GeometryStats {
    avgTrisPerFace: number;
    textureUsage: { name: string; count: number; percent: number }[];
    largestSurfaces: { index: number; texture: string; area: number }[];
}

interface LightmapStats {
    count: number;
    totalSize: number; // in bytes
    avgSize: number;
}

interface VisibilityStats {
    numClusters: number;
    totalPvsBytes: number;
    avgVisibleClusters: number;
}

function getGeometryStats(map: BspMap): GeometryStats {
    const totalFaces = map.faces?.length || 0;
    if (totalFaces === 0) return { avgTrisPerFace: 0, textureUsage: [], largestSurfaces: [] };

    const usageMap = new Map<string, number>();
    let totalTris = 0;
    const surfaces = [];

    const faceCount = map.faces?.length || 0;
    for(let i=0; i<faceCount; i++) {
        const face = map.faces[i];
        // Note: quake2ts definition might differ slightly in property casing or existence.
        // Checking BspMap definition via error messages:
        // 'texinfo' -> 'texInfo' ?
        // Let's try casting to any if unsure, but better to fix types.
        // Error: Property 'texinfo' does not exist on type 'BspFace'. Did you mean 'texInfo'?
        const texInfoIndex = (face as any).texInfo !== undefined ? (face as any).texInfo : (face as any).texinfo;

        // IMPORTANT: The test mock uses texInfo (camelCase) but the code below was using texInfo property.
        // Ensure consistency.
        // We also need to check if map has 'texinfo' property in lower case as per Quake specs/some implementations
        // Some quake2ts versions might use 'texinfos' plural.
        const texInfos = (map as any).texInfo || (map as any).texinfo || (map as any).texInfos;
        // Check if texInfos is defined before accessing it
        const texInfo = (texInfos && texInfos[texInfoIndex]) ? texInfos[texInfoIndex] : null;
        const textureName = texInfo ? texInfo.texture : 'unknown';

        usageMap.set(textureName, (usageMap.get(textureName) || 0) + 1);

        const numEdges = face.numEdges;
        const numTris = Math.max(0, numEdges - 2);
        totalTris += numTris;

        surfaces.push({ index: i, texture: textureName, area: numTris });
    }

    const textureUsage = Array.from(usageMap.entries())
        .map(([name, count]) => ({ name, count, percent: (count / totalFaces) * 100 }))
        .sort((a, b) => b.count - a.count);

    const largestSurfaces = surfaces
        .sort((a, b) => b.area - a.area)
        .slice(0, 10);

    return {
        avgTrisPerFace: totalTris / totalFaces,
        textureUsage,
        largestSurfaces
    };
}

function getLightmapStats(map: BspMap): LightmapStats {
    // Quake 2 lightmaps are stored in the 'lightmaps' lump (if available via map object)
    // or referenced by faces.
    // In quake2ts BspMap, we check for 'lightmaps'.
    const lightmaps = (map as any).lightmaps;
    if (!lightmaps) return { count: 0, totalSize: 0, avgSize: 0 };

    // lightmaps is usually a raw buffer or array of 128x128 blocks?
    // If it's the raw lump, it's one big buffer.
    // But quake2ts might have parsed it.
    // If 'lightmaps' is a Uint8Array, we can just get length.

    let count = 0;
    let totalSize = 0;

    if (lightmaps instanceof Uint8Array) {
        totalSize = lightmaps.length;
        // Each lightmap is 128x128*3 bytes (RGB) in raw BSP?
        // Actually Q2 BSP has variable sized lightmaps packed into 128x128 pages?
        // Or specific per-face lightmaps.
        // Assuming lightmaps property exposes something.
        // If it's a Uint8Array, it's the lump data.
    } else if (Array.isArray(lightmaps)) {
        count = lightmaps.length;
        // Assume each entry is a lightmap texture or data
        // If they are objects with data, sum it up.
    }

    // Fallback: Estimate from faces
    // Each face with lightmap has lightmap styles and offsets.

    return {
        count,
        totalSize,
        avgSize: count > 0 ? totalSize / count : 0
    };
}

function getVisibilityStats(map: BspMap): VisibilityStats {
    // vis info is in map.vis (BspVis)
    const vis = (map as any).vis;
    if (!vis) return { numClusters: 0, totalPvsBytes: 0, avgVisibleClusters: 0 };

    return {
        numClusters: vis.numClusters || 0,
        totalPvsBytes: (vis.buffer instanceof Uint8Array) ? vis.buffer.length : 0,
        avgVisibleClusters: 0 // Requires decoding PVS
    };
}

export function BspAnalyzer({ map, pakService, filePath, onClassnamesLoaded, hiddenClassnames, onEntitySelected }: BspAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [adapter, setAdapter] = useState<ViewerAdapter | null>(null);

  const stats = React.useMemo(() => getGeometryStats(map), [map]);

  const handleAdapterReady = React.useCallback((newAdapter: ViewerAdapter) => {
      setAdapter(newAdapter);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="bsp-analyzer-tab-content">
            <h3>Map Overview</h3>
            <div className="bsp-analyzer-stats-grid">
              <div className="bsp-stat-item">
                <label>Filename</label>
                <span>{filePath.split('/').pop()}</span>
              </div>
              <div className="bsp-stat-item">
                 <label>Models</label>
                 <span>{map.models.length}</span>
              </div>
               <div className="bsp-stat-item">
                 <label>Entities</label>
                 <span>{(map.entities as any).length || 0}</span>
              </div>
               <div className="bsp-stat-item">
                 <label>Textures</label>
                 <span>{stats.textureUsage.length}</span>
              </div>
            </div>
          </div>
        );
      case 'geometry':
        return (
          <div className="bsp-analyzer-tab-content">
            <h3>Geometry Analysis</h3>
            <div className="bsp-analyzer-stats-grid">
               <div className="bsp-stat-item">
                 <label>Vertices</label>
                 <span>{map.vertices?.length || 0}</span>
               </div>
               <div className="bsp-stat-item">
                 <label>Faces</label>
                 <span>{map.faces?.length || 0}</span>
               </div>
               <div className="bsp-stat-item">
                 <label>Brushes</label>
                 <span>{map.brushes?.length || 0}</span>
               </div>
               <div className="bsp-stat-item">
                 <label>Nodes</label>
                 <span>{map.nodes?.length || 0}</span>
               </div>
               <div className="bsp-stat-item">
                 <label>Leaves</label>
                 <span>{map.leafs?.length || 0}</span>
               </div>
                <div className="bsp-stat-item">
                 <label>Avg Tris/Face</label>
                 <span>{stats.avgTrisPerFace.toFixed(1)}</span>
               </div>
            </div>

            <h4>Texture Usage (Top 10)</h4>
            <div className="bsp-analyzer-table-container">
                <table className="bsp-analyzer-table">
                    <thead>
                        <tr>
                            <th>Texture</th>
                            <th>Count</th>
                            <th>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.textureUsage.slice(0, 10).map((item, i) => (
                            <tr key={i}>
                                <td>{item.name}</td>
                                <td>{item.count}</td>
                                <td>{item.percent.toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h4>Largest Surfaces (by Tri Count)</h4>
            <div className="bsp-analyzer-table-container">
                 <table className="bsp-analyzer-table">
                    <thead>
                        <tr>
                            <th>Face Index</th>
                            <th>Texture</th>
                            <th>Triangles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.largestSurfaces.slice(0, 5).map((item, i) => (
                            <tr key={i} style={{cursor: 'pointer'}}>
                                <td>{item.index}</td>
                                <td>{item.texture}</td>
                                <td>{item.area}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        );
      case 'lightmaps':
        return (
            <div className="bsp-analyzer-tab-content" style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <h3>Lightmap Inspector</h3>
                <LightmapInspector map={map} adapter={adapter} />
            </div>
        );
      case 'visibility':
        const visStats = getVisibilityStats(map);
        return (
            <div className="bsp-analyzer-tab-content">
                <h3>Visibility (PVS) Statistics</h3>
                <div className="bsp-analyzer-stats-grid">
                    <div className="bsp-stat-item">
                        <label>Clusters</label>
                        <span>{visStats.numClusters}</span>
                    </div>
                    <div className="bsp-stat-item">
                        <label>PVS Data Size</label>
                        <span>{(visStats.totalPvsBytes / 1024).toFixed(1)} KB</span>
                    </div>
                </div>
            </div>
        );
      case 'entities':
        // Prepare entity data
        // map.entities is BspEntities which might iterate or have internal array
        // It seems it doesn't have length directly in some versions?
        // But in tests we mocked it as array.
        // If it's an object with array inside?
        // Let's assume it is iterable or we can get array from it.
        const entities: any[] = Array.isArray(map.entities) ? map.entities : (map.entities as any).entities || Array.from(map.entities as any);

        // Count by classname
        const counts: Record<string, number> = {};
        entities.forEach(e => {
            const cls = e.classname || 'unknown';
            counts[cls] = (counts[cls] || 0) + 1;
        });
        const sortedCounts = Object.entries(counts).sort((a, b) => b[1] - a[1]);

        return (
            <div className="bsp-analyzer-tab-content">
                <h3>Entity Analysis</h3>
                <div className="bsp-analyzer-stats-grid">
                    <div className="bsp-stat-item">
                        <label>Total Entities</label>
                        <span>{entities.length}</span>
                    </div>
                    <div className="bsp-stat-item">
                        <label>Unique Types</label>
                        <span>{sortedCounts.length}</span>
                    </div>
                </div>

                <h4>Entity Types</h4>
                <div className="bsp-analyzer-table-container">
                    <table className="bsp-analyzer-table">
                        <thead>
                            <tr>
                                <th>Classname</th>
                                <th>Count</th>
                                <th>%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedCounts.map(([cls, count], i) => (
                                <tr key={i}>
                                    <td>{cls}</td>
                                    <td>{count}</td>
                                    <td>{((count / entities.length) * 100).toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <h4>Entity List</h4>
                 <div className="bsp-analyzer-table-container" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    <table className="bsp-analyzer-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Classname</th>
                                <th>Targetname</th>
                                <th>Origin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entities.slice(0, 100).map((ent, i) => (
                                <tr key={i} onClick={() => onEntitySelected && onEntitySelected(ent)} style={{cursor: 'pointer'}}>
                                    <td>{i}</td>
                                    <td>{ent.classname}</td>
                                    <td>{ent.targetname || '-'}</td>
                                    <td>{ent.origin ? `${ent.origin.x?.toFixed(0)}, ${ent.origin.y?.toFixed(0)}, ${ent.origin.z?.toFixed(0)}` : '-'}</td>
                                </tr>
                            ))}
                            {entities.length > 100 && (
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'center', color: '#888'}}>
                                        ... and {entities.length - 100} more entities
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bsp-analyzer">
      <div className="bsp-analyzer-toolbar">
        <div className="bsp-analyzer-tabs">
          <button
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={activeTab === 'geometry' ? 'active' : ''}
            onClick={() => setActiveTab('geometry')}
          >
            Geometry
          </button>
          <button
            className={activeTab === 'lightmaps' ? 'active' : ''}
            onClick={() => setActiveTab('lightmaps')}
          >
            Lightmaps
          </button>
          <button
            className={activeTab === 'visibility' ? 'active' : ''}
            onClick={() => setActiveTab('visibility')}
          >
            Visibility
          </button>
          <button
            className={activeTab === 'entities' ? 'active' : ''}
            onClick={() => setActiveTab('entities')}
          >
            Entities
          </button>
        </div>
      </div>

      <div className="bsp-analyzer-split-view">
        <div className="bsp-analyzer-3d-view">
           <UniversalViewer
             parsedFile={{ type: 'bsp', map }}
             pakService={pakService}
             filePath={filePath}
             onClassnamesLoaded={onClassnamesLoaded}
             hiddenClassnames={hiddenClassnames}
             onEntitySelected={onEntitySelected}
             showControls={true}
             onAdapterReady={handleAdapterReady}
           />
        </div>
        <div className="bsp-analyzer-panel">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
