
import { AssetCrossRefService } from '../../../src/services/assetCrossRefService';
import { VirtualFileSystem, parseMd2, parseMd3, parseBsp } from 'quake2ts/engine';

jest.mock('quake2ts/engine');

describe('AssetCrossRefService', () => {
  let service: AssetCrossRefService;
  let mockVfs: jest.Mocked<VirtualFileSystem>;

  beforeEach(() => {
    mockVfs = {
      findByExtension: jest.fn(),
      readFile: jest.fn(),
    } as unknown as jest.Mocked<VirtualFileSystem>;

    service = new AssetCrossRefService(mockVfs);
  });

  it('should find usages in MD2 files', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
      if (ext === 'md2') return [{ path: 'models/test.md2' }] as any;
      return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseMd2 as jest.Mock).mockReturnValue({
      skins: [{ name: 'models/skin.pcx' }]
    });

    const usages = await service.findTextureUsage('models/skin.pcx');
    expect(usages).toHaveLength(1);
    expect(usages[0].path).toBe('models/test.md2');
  });

  it('should find usages in MD3 files', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
      if (ext === 'md3') return [{ path: 'models/test.md3' }] as any;
      return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseMd3 as jest.Mock).mockReturnValue({
      surfaces: [{ shaders: [{ name: 'models/skin.tga' }] }]
    });

    const usages = await service.findTextureUsage('models/skin.tga');
    expect(usages).toHaveLength(1);
    expect(usages[0].path).toBe('models/test.md3');
  });

  it('should find usages in BSP files', async () => {
    mockVfs.findByExtension.mockImplementation((ext) => {
      if (ext === 'bsp') return [{ path: 'maps/test.bsp' }] as any;
      return [];
    });
    mockVfs.readFile.mockReturnValue(new Uint8Array(10));

    (parseBsp as jest.Mock).mockReturnValue({
      textures: [{ name: 'textures/wall.wal' }]
    });

    const usages = await service.findTextureUsage('textures/wall.wal');
    expect(usages).toHaveLength(1);
    expect(usages[0].path).toBe('maps/test.bsp');
  });
});
