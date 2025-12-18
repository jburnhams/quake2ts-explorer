/// <reference lib="webworker" />
import { expose } from 'comlink';
import { parseMd2, parseMd3, parseBsp } from 'quake2ts/engine';

export interface FileReference {
  path: string;
  type: 'texture' | 'model' | 'sound' | 'other';
  context?: string;
}

export interface IndexerApi {
  analyzeBsp(buffer: ArrayBuffer): FileReference[];
  analyzeMd2(buffer: ArrayBuffer): FileReference[];
  analyzeMd3(buffer: ArrayBuffer): FileReference[];
  buildSearchIndex(paths: string[]): void;
  searchFiles(query: string): string[];
}

export const analyzeMd2 = (buffer: ArrayBuffer): FileReference[] => {
  const refs: FileReference[] = [];
  try {
    const model = parseMd2(buffer);
    if (model && Array.isArray(model.skins)) {
      model.skins.forEach((skin: any) => {
        const path = typeof skin === 'string' ? skin : skin.name;
        if (path) {
          refs.push({ path, type: 'texture', context: 'skin' });
        }
      });
    }
  } catch (e) {
    console.warn('Failed to analyze MD2', e);
  }
  return refs;
};

export const analyzeMd3 = (buffer: ArrayBuffer): FileReference[] => {
  const refs: FileReference[] = [];
  try {
    const model = parseMd3(buffer);
    if (model && Array.isArray(model.surfaces)) {
      model.surfaces.forEach((surf: any) => {
        if (Array.isArray(surf.shaders)) {
          surf.shaders.forEach((shader: any) => {
            if (shader.name) {
              refs.push({ path: shader.name, type: 'texture', context: 'shader' });
            }
          });
        }
      });
    }
  } catch (e) {
    console.warn('Failed to analyze MD3', e);
  }
  return refs;
};

export const analyzeBsp = (buffer: ArrayBuffer): FileReference[] => {
  const refs: FileReference[] = [];
  try {
    const map = parseBsp(buffer);
    const mapAny = map as any;

    // Textures
    if (mapAny.textures && Array.isArray(mapAny.textures)) {
      mapAny.textures.forEach((tex: any) => {
        const path = typeof tex === 'string' ? tex : tex.name;
        if (path) {
          refs.push({ path, type: 'texture', context: 'surface' });
        }
      });
    }

    // Entities
    let entitiesList: any[] = [];
    if (mapAny.entities) {
      if (Array.isArray(mapAny.entities)) {
        entitiesList = mapAny.entities;
      } else if (Array.isArray(mapAny.entities.entities)) {
        entitiesList = mapAny.entities.entities;
      }
    }

    entitiesList.forEach((entity: any) => {
      const props = entity.properties || entity;
      for (const [key, value] of Object.entries(props)) {
        if (typeof value === 'string') {
           const valLower = value.toLowerCase();
           if (key === 'noise' || key === 'sound' || key === 'message') {
             refs.push({ path: value, type: 'sound', context: `entity:${key}|${entity.classname}` });
           } else if (key === 'model' || key === 'model2' || key === 'model3' || key === 'model4') {
              // Ignore *1, *2 etc which are brush models
              if (!value.startsWith('*')) {
                  refs.push({ path: value, type: 'model', context: `entity:${key}|${entity.classname}` });
              }
           } else if (key === 'skin') {
              refs.push({ path: value, type: 'texture', context: `entity:${key}|${entity.classname}` });
           } else if (valLower.endsWith('.wav') || valLower.endsWith('.pcx') || valLower.endsWith('.tga') || valLower.endsWith('.md2')) {
              // Heuristic fallback for other keys
              refs.push({ path: value, type: 'other', context: `entity:${key}|${entity.classname}` });
           }
        }
      }
    });

  } catch (e) {
    console.warn('Failed to analyze BSP', e);
  }
  return refs;
};

// Search index implementation
let filePaths: string[] = [];

export const buildSearchIndex = (paths: string[]) => {
  filePaths = paths;
};

export const searchFiles = (query: string): string[] => {
  if (!query) return [];
  const queryLower = query.toLowerCase();
  return filePaths.filter(path => path.toLowerCase().includes(queryLower));
};

const api: IndexerApi = {
  analyzeMd2,
  analyzeMd3,
  analyzeBsp,
  buildSearchIndex,
  searchFiles
};

expose(api);
