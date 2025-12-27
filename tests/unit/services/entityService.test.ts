
import { EntityService, EntityRecord } from '@/src/services/entityService';
import { VirtualFileSystem, parseBsp } from '@quake2ts/engine';
import { toArrayBuffer } from '@/src/utils/helpers';

// Mock quake2ts engine
vi.mock('@quake2ts/engine', () => {
  return {
    VirtualFileSystem: vi.fn().mockImplementation(() => ({
      findByExtension: vi.fn().mockReturnValue([]),
      readFile: vi.fn(),
    })),
    parseBsp: vi.fn(),
  };
});

vi.mock('@/src/utils/helpers', () => ({
  toArrayBuffer: vi.fn((data) => data.buffer),
}));

describe('EntityService', () => {
  let vfs: any;
  let service: EntityService;
  let mockMap: any;

  beforeEach(() => {
    // Reset mocks
    const { VirtualFileSystem } = require('@quake2ts/engine');
    vfs = new VirtualFileSystem();
    service = new EntityService(vfs);

    mockMap = {
      entities: {
        entities: [
          {
            classname: 'worldspawn',
            properties: { classname: 'worldspawn', message: 'Test Map' }
          },
          {
            classname: 'info_player_start',
            properties: { classname: 'info_player_start', origin: '100 200 50' }
          },
          {
            classname: 'light',
            properties: { classname: 'light', light: '300', origin: '100 200 100' }
          }
        ]
      }
    };
  });

  it('should extract entities from a map correctly', () => {
    const records = service.extractEntitiesFromMap(mockMap, 'test.bsp');

    expect(records).toHaveLength(3);
    expect(records[0].classname).toBe('worldspawn');
    expect(records[0].mapName).toBe('test.bsp');
    expect(records[1].classname).toBe('info_player_start');
    expect(records[1].origin).toEqual({ x: 100, y: 200, z: 50 });
  });

  it('should scan all maps and aggregate entities', async () => {
    const mockBspData = new Uint8Array([1, 2, 3]);
    // Ensure findByExtension returns files with 'path' property
    vfs.findByExtension.mockReturnValue([{ path: 'maps/map1.bsp' }, { path: 'maps/map2.bsp' }]);
    vfs.readFile.mockResolvedValue(mockBspData);

    // Using the directly imported parseBsp mock and casting it to Mock
    (parseBsp as any).mockReturnValue(mockMap);

    const onProgress = vi.fn();
    const records = await service.scanAllMaps(onProgress);

    expect(vfs.findByExtension).toHaveBeenCalledWith('bsp');
    expect(vfs.readFile).toHaveBeenCalledTimes(2);
    expect(parseBsp).toHaveBeenCalledTimes(2);

    // 2 maps * 3 entities each = 6 entities
    expect(records).toHaveLength(6);

    expect(onProgress).toHaveBeenCalled();
  });

  it('should handle errors during map parsing', async () => {
    vfs.findByExtension.mockReturnValue([{ path: 'maps/bad.bsp' }]);
    vfs.readFile.mockResolvedValue(new Uint8Array([0]));

    (parseBsp as any).mockImplementation(() => { throw new Error('Parse error'); });

    const records = await service.scanAllMaps();

    expect(records).toHaveLength(0);
  });

  it('should calculate stats correctly', () => {
    const records: EntityRecord[] = [
      { id: '1', mapName: 'map1', index: 0, classname: 'worldspawn', properties: {}, raw: {} as any },
      { id: '2', mapName: 'map1', index: 1, classname: 'light', properties: {}, raw: {} as any },
      { id: '3', mapName: 'map2', index: 0, classname: 'light', properties: {}, raw: {} as any },
    ];

    const stats = service.getStats(records);

    expect(stats.totalEntities).toBe(3);
    expect(stats.entitiesPerMap['map1']).toBe(2);
    expect(stats.entitiesPerMap['map2']).toBe(1);
    expect(stats.entitiesByType['light']).toBe(2);
    expect(stats.entitiesByType['worldspawn']).toBe(1);
  });

  it('should generate valid ENT file content', () => {
    const records: EntityRecord[] = [
      {
        id: '1', mapName: 'map1', index: 0, classname: 'worldspawn',
        properties: { classname: 'worldspawn', message: 'My Map' },
        raw: {} as any
      },
      {
        id: '2', mapName: 'map1', index: 1, classname: 'info_player_start',
        properties: { classname: 'info_player_start', origin: '100 0 -50' },
        raw: {} as any
      }
    ];

    const entContent = service.generateEntFile(records);

    // Should look like:
    // {
    // "classname" "worldspawn"
    // "message" "My Map"
    // }
    // {
    // "classname" "info_player_start"
    // "origin" "100 0 -50"
    // }

    expect(entContent).toContain('{\n"classname" "worldspawn"\n"message" "My Map"\n}');
    expect(entContent).toContain('{\n"classname" "info_player_start"\n"origin" "100 0 -50"\n}');
  });

  it('should escape quotes in ENT file content', () => {
     const records: EntityRecord[] = [
      {
        id: '1', mapName: 'map1', index: 0, classname: 'worldspawn',
        properties: { classname: 'worldspawn', message: 'Map "Quake" 2' },
        raw: {} as any
      }
    ];

    const entContent = service.generateEntFile(records);
    // Expect quotes to be escaped: "message" "Map \"Quake\" 2"
    expect(entContent).toContain('"message" "Map \\"Quake\\" 2"');
  });
});
