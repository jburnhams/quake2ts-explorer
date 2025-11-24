import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Md3Adapter } from '../../../../../src/components/UniversalViewer/adapters/Md3Adapter';
import { PakService, ParsedFile } from '../../../../../src/services/pakService';
import { Md3ModelMesh, Md3Pipeline } from 'quake2ts/engine';
import { mat4 } from 'gl-matrix';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
  return {
    Md3Pipeline: jest.fn().mockImplementation(() => ({})),
    Md3ModelMesh: jest.fn().mockImplementation(() => ({})),
  };
});

describe('Md3Adapter', () => {
  let adapter: Md3Adapter;
  let mockGl: WebGL2RenderingContext;
  let mockPakService: jest.Mocked<PakService>;

  beforeEach(() => {
    adapter = new Md3Adapter();
    mockGl = {} as WebGL2RenderingContext;
    mockPakService = {} as unknown as jest.Mocked<PakService>;

    (Md3Pipeline as jest.Mock).mockClear();
    (Md3ModelMesh as jest.Mock).mockClear();
  });

  it('throws error if file type is not md3', async () => {
    const file: ParsedFile = { type: 'bsp' } as any;
    await expect(adapter.load(mockGl, file, mockPakService, 'models/test.bsp')).rejects.toThrow('Invalid file type');
  });

  it('loads md3 model', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: {}
    } as any;

    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    expect(Md3Pipeline).toHaveBeenCalledWith(mockGl);
    expect(Md3ModelMesh).toHaveBeenCalledWith(mockGl, file.model, 0, 0);
  });

  it('updates (no-op)', () => {
      adapter.update(16);
      // No observable effect to test currently
  });

  it('renders if loaded', async () => {
    const file: ParsedFile = {
        type: 'md3',
        model: {}
    } as any;
    await adapter.load(mockGl, file, mockPakService, 'models/test.md3');

    const camera = {
        projectionMatrix: mat4.create()
    } as any;
    const viewMatrix = mat4.create();

    // We expect it not to throw and cover the lines
    adapter.render(mockGl, camera, viewMatrix);
  });

  it('does not render if not loaded', () => {
      const camera = {
        projectionMatrix: mat4.create()
    } as any;
    const viewMatrix = mat4.create();

    // Should return early
    adapter.render(mockGl, camera, viewMatrix);
  });

  it('cleans up (no-op)', () => {
      adapter.cleanup();
  });
});
