import React from 'react';
import { BspMap } from '@quake2ts/engine';
import './BspAnalyzer.css'; // Reuse existing CSS

interface BspOptimizationTabProps {
  map: BspMap;
}

interface Suggestion {
  type: 'info' | 'warning' | 'error';
  category: 'geometry' | 'lightmap' | 'texture' | 'entity';
  title: string;
  message: string;
  details?: string;
  count?: number;
}

function analyzeGeometry(map: BspMap, suggestions: Suggestion[]) {
  const faces = map.faces;
  if (!faces) return;

  const MAX_TRIS_PER_FACE = 64; // Arbitrary threshold
  let largeFaces = 0;

  for (let i = 0; i < faces.length; i++) {
    const face = faces[i];
    const numTris = Math.max(0, face.numEdges - 2);
    if (numTris > MAX_TRIS_PER_FACE) {
      largeFaces++;
    }
  }

  if (largeFaces > 0) {
    suggestions.push({
      type: 'warning',
      category: 'geometry',
      title: 'Oversized Surfaces',
      message: `${largeFaces} surfaces have more than ${MAX_TRIS_PER_FACE} triangles.`,
      details: 'Consider subdividing large surfaces to reduce overdraw and improve culling.',
      count: largeFaces
    });
  }

  // Check for degenerate faces (0 triangles)
  let degenerateFaces = 0;
  for (let i = 0; i < faces.length; i++) {
     if (faces[i].numEdges < 3) degenerateFaces++;
  }
  if (degenerateFaces > 0) {
      suggestions.push({
          type: 'error',
          category: 'geometry',
          title: 'Degenerate Faces',
          message: `${degenerateFaces} faces have fewer than 3 edges.`,
          details: 'These faces are invisible and waste memory. Clean up geometry in the editor.'
      });
  }
}

function analyzeTextures(map: BspMap, suggestions: Suggestion[]) {
    // Check for texture name issues or missing textures?
    // Hard to check missing textures without VFS access here, but we can check usage patterns.
    // e.g. many small usages of unique textures vs atlases (not applicable to Q2 really).

    // Check for potential unused textures (textures in list but not referenced by any face)
    const texInfos = (map as any).texInfo || (map as any).texinfo || (map as any).texInfos;
    if (!texInfos) return;

    const usedTexInfoIndices = new Set<number>();
    const faces = map.faces;
    if (faces) {
        for (let i=0; i<faces.length; i++) {
            const face = faces[i];
            const idx = (face as any).texInfo !== undefined ? (face as any).texInfo : (face as any).texinfo;
            usedTexInfoIndices.add(idx);
        }
    }

    // Now check which textures are actually used
    // texInfos is an array of texture definitions.
    // Multiple texinfos can point to the same texture name (different flags).
    // So we need to collect all unique texture names, and mark which ones are used.

    const allTextures = new Set<string>();
    const usedTextures = new Set<string>();

    for (let i = 0; i < texInfos.length; i++) {
        const ti = texInfos[i];
        if (!ti) continue;
        const name = ti.texture;
        allTextures.add(name);
        if (usedTexInfoIndices.has(i)) {
            usedTextures.add(name);
        }
    }

    const unusedCount = allTextures.size - usedTextures.size;
    if (unusedCount > 0) {
         suggestions.push({
            type: 'info',
            category: 'texture',
            title: 'Unused Textures',
            message: `${unusedCount} textures are defined but not used by any surface.`,
            details: 'Cleaning up unused textures reduces map file size and memory overhead.'
        });
    }
}

function analyzeLightmaps(map: BspMap, suggestions: Suggestion[]) {
    // If lightmap data is huge relative to geometry?
    // Or check if many surfaces have no lightmap (fullbright or dynamic only)
}

function analyzeEntities(map: BspMap, suggestions: Suggestion[]) {
    const entities = (map.entities as any).entities || map.entities;
    if (!Array.isArray(entities)) return;

    // Check for entities outside world bounds?
    // Check for duplicate targets?
}

export function BspOptimizationTab({ map }: BspOptimizationTabProps) {
  const suggestions: Suggestion[] = [];

  analyzeGeometry(map, suggestions);
  analyzeTextures(map, suggestions);
  analyzeLightmaps(map, suggestions);
  analyzeEntities(map, suggestions);

  if (suggestions.length === 0) {
      return (
          <div className="bsp-analyzer-tab-content">
              <h3>Optimization Suggestions</h3>
              <p className="no-issues">No significant optimization issues found!</p>
          </div>
      )
  }

  return (
    <div className="bsp-analyzer-tab-content">
      <h3>Optimization Suggestions</h3>
      <div className="optimization-list">
        {suggestions.map((item, index) => (
          <div key={index} className={`suggestion-card ${item.type}`}>
             <div className="suggestion-header">
                 <span className={`suggestion-icon ${item.type}`}></span>
                 <span className="suggestion-title">{item.title}</span>
                 {item.count && <span className="suggestion-count">({item.count})</span>}
             </div>
             <p className="suggestion-message">{item.message}</p>
             {item.details && <p className="suggestion-details">{item.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
