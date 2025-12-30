import { demoMetadataService, DemoMetadata } from '../../../src/services/demoMetadataService';

describe('DemoMetadataService', () => {
  beforeEach(() => {
    // Defensive check for localStorage
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    } else {
      // Mock if missing (e.g. in some environments)
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: vi.fn(),
          setItem: vi.fn(),
          removeItem: vi.fn(),
          clear: vi.fn(),
          length: 0,
          key: vi.fn(),
        },
        writable: true
      });
    }
    vi.clearAllMocks();
  });

  const mockMetadata: DemoMetadata = {
    id: 'demo1.dm2',
    customName: 'My Awesome Run',
    description: 'A test run',
    tags: ['speedrun', 'dm1'],
    mapName: 'q2dm1',
    duration: 120,
    rating: 5
  };

  test('should save and retrieve metadata', () => {
    demoMetadataService.saveMetadata(mockMetadata);
    const retrieved = demoMetadataService.getMetadata('demo1.dm2');
    expect(retrieved).toEqual(mockMetadata);
  });

  test('should return default metadata if not found', () => {
    const retrieved = demoMetadataService.getMetadata('nonexistent.dm2');
    expect(retrieved).toEqual({
      id: 'nonexistent.dm2',
      tags: []
    });
  });

  test('should delete metadata', () => {
    demoMetadataService.saveMetadata(mockMetadata);
    demoMetadataService.deleteMetadata('demo1.dm2');
    const retrieved = demoMetadataService.getMetadata('demo1.dm2');
    expect(retrieved).toEqual({
      id: 'demo1.dm2',
      tags: []
    });
  });

  test('should retrieve all metadata', () => {
    const meta2: DemoMetadata = { ...mockMetadata, id: 'demo2.dm2' };
    demoMetadataService.saveMetadata(mockMetadata);
    demoMetadataService.saveMetadata(meta2);

    const all = demoMetadataService.getAllMetadata();
    expect(all).toHaveLength(2);
    expect(all).toEqual(expect.arrayContaining([mockMetadata, meta2]));
  });

  test('should search metadata', () => {
    const meta2: DemoMetadata = {
      id: 'demo2.dm2',
      tags: ['casual'],
      customName: 'Fun Game'
    };
    demoMetadataService.saveMetadata(mockMetadata);
    demoMetadataService.saveMetadata(meta2);

    const results = demoMetadataService.search('speedrun');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('demo1.dm2');

    const results2 = demoMetadataService.search('Fun');
    expect(results2).toHaveLength(1);
    expect(results2[0].id).toBe('demo2.dm2');

    const results3 = demoMetadataService.search('dm2');
    expect(results3).toHaveLength(2);
  });

  test('should add and remove tags', () => {
    demoMetadataService.saveMetadata({ id: 'demo1.dm2', tags: [] });

    demoMetadataService.addTag('demo1.dm2', 'newtag');
    let retrieved = demoMetadataService.getMetadata('demo1.dm2');
    expect(retrieved.tags).toContain('newtag');

    demoMetadataService.removeTag('demo1.dm2', 'newtag');
    retrieved = demoMetadataService.getMetadata('demo1.dm2');
    expect(retrieved.tags).not.toContain('newtag');
  });

  test('should handle storage errors gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Spy on Storage.prototype.setItem to correctly intercept JSDOM localStorage
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    demoMetadataService.saveMetadata(mockMetadata);

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const args = consoleSpy.mock.lastCall;
    expect(args?.[0]).toBe('Failed to save demo metadata');
    expect(args?.[1]).toBeInstanceOf(Error);
    expect((args?.[1] as Error).message).toBe('Storage full');

    setItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
