import { jest, describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('comlink', () => ({
  expose: jest.fn(),
  transfer: jest.fn(obj => obj)
}));

jest.mock('quake2ts/engine', () => ({
  parseMd2: jest.fn(),
  parseMd3: jest.fn(),
  parseBsp: jest.fn(),
}));

import { analyzeBsp, analyzeMd2, analyzeMd3, buildSearchIndex, searchFiles } from '../../../src/workers/indexer.worker';
import { parseMd2, parseMd3, parseBsp } from 'quake2ts/engine';

describe('Indexer Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeMd2', () => {
    it('should extract skin references', () => {
      (parseMd2 as jest.Mock).mockReturnValue({
        skins: ['skin1.pcx', { name: 'skin2.pcx' }]
      });

      const buffer = new ArrayBuffer(0);
      const refs = analyzeMd2(buffer);

      expect(refs).toHaveLength(2);
      expect(refs[0]).toEqual({ path: 'skin1.pcx', type: 'texture', context: 'skin' });
      expect(refs[1]).toEqual({ path: 'skin2.pcx', type: 'texture', context: 'skin' });
    });
  });

  describe('analyzeMd3', () => {
    it('should extract shader references', () => {
      (parseMd3 as jest.Mock).mockReturnValue({
        surfaces: [
          { shaders: [{ name: 'shader1' }] },
          { shaders: [{ name: 'shader2' }] }
        ]
      });

      const buffer = new ArrayBuffer(0);
      const refs = analyzeMd3(buffer);

      expect(refs).toHaveLength(2);
      expect(refs).toContainEqual({ path: 'shader1', type: 'texture', context: 'shader' });
      expect(refs).toContainEqual({ path: 'shader2', type: 'texture', context: 'shader' });
    });
  });

  describe('analyzeBsp', () => {
    it('should extract texture and entity references', () => {
      (parseBsp as jest.Mock).mockReturnValue({
        textures: [{ name: 'wall' }],
        entities: {
          entities: [
            { classname: 'worldspawn' },
            {
              classname: 'func_button',
              properties: {
                target: 'func1',
                sound: 'click.wav',
                model: '*1' // Should be ignored
              }
            },
            {
              classname: 'misc_model',
              properties: {
                model: 'models/tree.md2'
              }
            }
          ]
        }
      });

      const buffer = new ArrayBuffer(0);
      const refs = analyzeBsp(buffer);

      // Texture 'wall'
      expect(refs).toContainEqual({ path: 'wall', type: 'texture', context: 'surface' });

      // Sound 'click.wav'
      expect(refs).toContainEqual({ path: 'click.wav', type: 'sound', context: 'entity:sound|func_button' });

      // Model 'models/tree.md2'
      expect(refs).toContainEqual({ path: 'models/tree.md2', type: 'model', context: 'entity:model|misc_model' });

      // '*1' should be ignored
      const starRefs = refs.filter(r => r.path === '*1');
      expect(starRefs).toHaveLength(0);
    });
  });

  describe('Search Index', () => {
    it('should build index and search files', () => {
      const paths = [
        'models/weapons/v_rail/tris.md2',
        'maps/q2dm1.bsp',
        'textures/e1u1/wall.wal'
      ];

      buildSearchIndex(paths);

      const results = searchFiles('rail');
      expect(results).toHaveLength(1);
      expect(results[0]).toBe('models/weapons/v_rail/tris.md2');

      const results2 = searchFiles('e1u1');
      expect(results2).toHaveLength(1);
      expect(results2[0]).toBe('textures/e1u1/wall.wal');
    });
  });
});
