import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { Camera, BspMap, Texture2D, BspSurfacePipeline, resolveLightStyles } from '@quake2ts/engine';
import { mat4 } from 'gl-matrix';
import { PakService } from '@/src/services/pakService';
import { RenderOptions } from '@/src/components/UniversalViewer/adapters/types';

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
    const originalModule = vi.requireActual('quake2ts/engine');
    return {
        ...originalModule,
        BspSurfacePipeline: vi.fn().mockImplementation(() => ({
            bind: vi.fn().mockReturnValue({}),
            draw: vi.fn()
        })),
        resolveLightStyles: vi.fn(),
        createBspSurfaces: vi.fn().mockReturnValue([]),
        buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            uploadImage: vi.fn(),
            setParameters: vi.fn()
        })),
        applySurfaceState: vi.fn()
    };
});

describe('BspAdapter Lighting Controls', () => {
    let adapter: BspAdapter;
    let mockGl: WebGL2RenderingContext;
    let mockCamera: Camera;
    let mockMap: BspMap;
    let mockPakService: PakService;

    beforeEach(() => {
        mockGl = {
            createTexture: vi.fn(),
            bindTexture: vi.fn(),
            texImage2D: vi.fn(),
            texParameteri: vi.fn(),
            generateMipmap: vi.fn(),
            activeTexture: vi.fn(),
            drawElements: vi.fn(),
            createShader: vi.fn().mockReturnValue({}),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            createProgram: vi.fn().mockReturnValue({}),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn().mockReturnValue(true),
            getShaderParameter: vi.fn().mockReturnValue(true),
            getAttribLocation: vi.fn(),
            getUniformLocation: vi.fn(),
            createBuffer: vi.fn(),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            createVertexArray: vi.fn().mockReturnValue({}),
            bindVertexArray: vi.fn(),
            useProgram: vi.fn(),
            getUniformLocation: vi.fn(),
            uniformMatrix4fv: vi.fn(),
            uniform3fv: vi.fn(),
            uniform4fv: vi.fn(),
            drawArrays: vi.fn(),
            deleteShader: vi.fn(),
            NEAREST: 9728,
            LINEAR: 9729,
            RGBA: 6408,
            UNSIGNED_BYTE: 5121,
            TEXTURE_2D: 3553,
            TEXTURE0: 33984,
            TEXTURE1: 33985,
            TRIANGLES: 4,
            UNSIGNED_SHORT: 5123,
            LINK_STATUS: 35714,
            COMPILE_STATUS: 35713,
            VERTEX_SHADER: 35633,
            FRAGMENT_SHADER: 35632,
            ARRAY_BUFFER: 34962,
            STATIC_DRAW: 35044,
            FLOAT: 5126,
        } as unknown as WebGL2RenderingContext;

        mockCamera = {
            projectionMatrix: mat4.create()
        } as Camera;

        mockMap = {
            header: { version: 38 },
            entities: { entities: [] },
            vertices: [],
            leafs: [],
            planes: [],
            nodes: [],
            texInfo: [],
            faces: [],
            models: [],
            brushes: [],
            vis: null
        } as unknown as BspMap;

        mockPakService = {
            hasFile: vi.fn().mockReturnValue(false)
        } as unknown as PakService;

        adapter = new BspAdapter();
        // Load map (mocked)
        return adapter.loadMap(mockGl, mockMap, mockPakService);
    });

    it('freezes light styles when freezeLights is true', () => {
        // Mock light styles returning dynamic values
        (resolveLightStyles as vi.Mock).mockReturnValue(new Float32Array([0.5, 2.0]));

        // Mock pipeline to capture bind call
        const mockBind = vi.fn().mockReturnValue({});
        (adapter as any).pipeline.bind = mockBind;
        (adapter as any).geometry = { surfaces: [{ surfaceFlags: 0, indexCount: 0, vao: { bind: vi.fn() } }], lightmaps: [] };
        (adapter as any).surfaces = [{ surfaceFlags: 0 }];

        // Set render options with freezeLights = true
        adapter.setRenderOptions({
            mode: 'textured',
            color: [1, 1, 1],
            freezeLights: true,
            brightness: 1.0
        });

        // Render
        adapter.render(mockGl, mockCamera, mat4.create());

        // Verify bind was called
        expect(mockBind).toHaveBeenCalled();
        const callArgs = mockBind.mock.calls[0][0];

        // Expect timeSeconds to be 0
        expect(callArgs.timeSeconds).toBe(0);

        // Expect styleValues to be all 1.0 (frozen/full intensity)
        // Since we mocked 2 styles, we expect [1.0, 1.0]
        expect(callArgs.styleValues).toEqual([1.0, 1.0]);
    });

    it('uses dynamic light styles when freezeLights is false', () => {
         // Mock light styles
         (resolveLightStyles as vi.Mock).mockReturnValue(new Float32Array([0.5, 2.0]));

         const mockBind = vi.fn().mockReturnValue({});
         (adapter as any).pipeline.bind = mockBind;
         (adapter as any).geometry = { surfaces: [{ surfaceFlags: 0, indexCount: 0, vao: { bind: vi.fn() } }], lightmaps: [] };
         (adapter as any).surfaces = [{ surfaceFlags: 0 }];

         // Set render options with freezeLights = false
         adapter.setRenderOptions({
             mode: 'textured',
             color: [1, 1, 1],
             freezeLights: false,
             brightness: 1.0
         });

         // Render
         adapter.render(mockGl, mockCamera, mat4.create());

         const callArgs = mockBind.mock.calls[0][0];

         // Expect timeSeconds to correspond to performance.now() (non-zero)
         expect(callArgs.timeSeconds).toBeGreaterThan(0);

         // Expect styleValues to match mocked values
         expect(callArgs.styleValues).toEqual([0.5, 2.0]);
    });
});
