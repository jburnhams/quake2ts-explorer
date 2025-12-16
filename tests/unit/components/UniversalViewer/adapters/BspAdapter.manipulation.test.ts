import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { EntityEditorService } from '@/src/services/entityEditorService';
import { vec3, mat4 } from 'gl-matrix';
import { GizmoRenderer } from '@/src/components/UniversalViewer/adapters/GizmoRenderer';
import { TransformUtils } from '@/src/utils/transformUtils';

// Mock WebGL
const mockGl = {
  createProgram: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  getProgramParameter: jest.fn(() => true),
  getUniformLocation: jest.fn(),
  getAttribLocation: jest.fn(),
  createVertexArray: jest.fn(),
  bindVertexArray: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  createTexture: jest.fn(),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  generateMipmap: jest.fn(),
  activeTexture: jest.fn(),
  useProgram: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  uniform3fv: jest.fn(),
  uniform4fv: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  deleteShader: jest.fn(),
  deleteProgram: jest.fn(),
  viewport: jest.fn(),
  clear: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
} as unknown as WebGL2RenderingContext;

// Mock dependencies
jest.mock('quake2ts/engine', () => ({
  BspSurfacePipeline: jest.fn().mockImplementation(() => ({
    bind: jest.fn(),
  })),
  createBspSurfaces: jest.fn(() => []),
  buildBspGeometry: jest.fn(() => ({ surfaces: [], lightmaps: [] })),
  Texture2D: jest.fn().mockImplementation(() => ({
    bind: jest.fn(),
    uploadImage: jest.fn(),
    setParameters: jest.fn(),
  })),
  resolveLightStyles: jest.fn(() => new Float32Array(32)),
  applySurfaceState: jest.fn(),
}));

jest.mock('@/src/components/UniversalViewer/adapters/GizmoRenderer');
jest.mock('@/src/utils/transformUtils');

describe('BspAdapter - Entity Manipulation', () => {
  let adapter: BspAdapter;
  let mockMap: any;
  let mockPakService: any;
  let mockFile: any;

  beforeEach(() => {
    // Reset EntityEditorService
    (EntityEditorService as any).instance = null;
    jest.clearAllMocks();

    mockMap = {
      entities: {
        entities: [
          {
            classname: 'worldspawn',
            properties: {}
          },
          {
            classname: 'info_player_start',
            properties: { origin: '100 200 50' },
            origin: [100, 200, 50]
          }
        ],
        getUniqueClassnames: jest.fn(() => ['worldspawn', 'info_player_start'])
      },
      models: [{}],
      faces: [],
      planes: [],
      leafs: [],
      pickEntity: jest.fn()
    };

    mockFile = {
      type: 'bsp',
      map: mockMap
    };

    mockPakService = {
      hasFile: jest.fn(() => false),
      readFile: jest.fn()
    };

    adapter = new BspAdapter();
  });

  it('should initialize GizmoRenderer on load', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'maps/test.bsp');
    expect(GizmoRenderer).toHaveBeenCalledWith(mockGl);
  });

  it('should detect gizmo intersection on mouse down', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'maps/test.bsp');

    // Select entity 1
    EntityEditorService.getInstance().selectEntity(1);

    // Memory: "When mocking quake2ts classes... accessed via mock.results[0].value rather than mock.instances"
    // GizmoRenderer is mocked by jest.mock, so it's a standard jest mock.
    // However, if the constructor returns an object explicitly (like quake2ts might), we use results.
    // Here GizmoRenderer is local source.
    // Let's check how GizmoRenderer is mocked. It's an auto-mock.
    // Auto-mocks return undefined from methods by default unless configured.

    const mockGizmoRenderer = (GizmoRenderer as unknown as jest.Mock).mock.instances[0];

    // We need to ensure intersect returns something
    mockGizmoRenderer.intersect.mockReturnValue({ axis: 'x', distance: 10 });

    (TransformUtils.projectRayToLine as jest.Mock).mockReturnValue({ point: vec3.fromValues(110, 200, 50), t: 10 });

    const ray = { origin: [0, 0, 0] as any, direction: [1, 0, 0] as any };
    const event = new MouseEvent('mousedown');

    const result = adapter.onMouseDown(ray, event);

    expect(mockGizmoRenderer.intersect).toHaveBeenCalled();
    expect(mockGizmoRenderer.setActiveAxis).toHaveBeenCalledWith('x');
    expect(result).toBe(true);
  });

  it('should update entity position on drag', async () => {
    await adapter.load(mockGl, mockFile, mockPakService, 'maps/test.bsp');

    // Select entity 1
    EntityEditorService.getInstance().selectEntity(1);

    const mockGizmoRenderer = (GizmoRenderer as unknown as jest.Mock).mock.instances[0];

    // Start drag
    mockGizmoRenderer.intersect.mockReturnValue({ axis: 'x', distance: 10 });
    (TransformUtils.projectRayToLine as jest.Mock).mockReturnValue({ point: vec3.fromValues(110, 200, 50), t: 10 });

    const startRay = { origin: [0, 0, 0] as any, direction: [1, 0, 0] as any };
    adapter.onMouseDown(startRay, new MouseEvent('mousedown'));

    // Move
    (TransformUtils.projectRayToLine as jest.Mock).mockReturnValue({ point: vec3.fromValues(120, 200, 50), t: 20 });
    const moveRay = { origin: [0, 0, 0] as any, direction: [1, 0, 0] as any };

    // Mock updateEntity to verify
    const updateSpy = jest.spyOn(EntityEditorService.getInstance(), 'updateEntity');

    const result = adapter.onMouseMove(moveRay, new MouseEvent('mousemove'));

    expect(result).toBe(true);
    expect(updateSpy).toHaveBeenCalled();

    // Check update args
    const updatedEntity = updateSpy.mock.calls[0][1];
    expect(updatedEntity.properties.origin).toBe('110 200 50'); // 100 + (120 - 110) = 110
  });

  it('should clear drag state on mouse up', async () => {
      await adapter.load(mockGl, mockFile, mockPakService, 'maps/test.bsp');
      EntityEditorService.getInstance().selectEntity(1);
      const mockGizmoRenderer = (GizmoRenderer as unknown as jest.Mock).mock.instances[0];

      // Start drag
      mockGizmoRenderer.intersect.mockReturnValue({ axis: 'x', distance: 10 });
      (TransformUtils.projectRayToLine as jest.Mock).mockReturnValue({ point: vec3.fromValues(110, 200, 50), t: 10 });
      adapter.onMouseDown({ origin: [0, 0, 0] as any, direction: [1, 0, 0] as any }, new MouseEvent('mousedown'));

      // Mouse up
      const result = adapter.onMouseUp({ origin: [0, 0, 0] as any, direction: [1, 0, 0] as any }, new MouseEvent('mouseup'));

      expect(result).toBe(true);
      expect(mockGizmoRenderer.setActiveAxis).toHaveBeenCalledWith(null);

      // Subsequent move should be hover only
      mockGizmoRenderer.intersect.mockReturnValue(null);
      const hoverResult = adapter.onMouseMove({ origin: [0, 0, 0] as any, direction: [1, 0, 0] as any }, new MouseEvent('mousemove'));
      expect(hoverResult).toBe(false);
  });
});
