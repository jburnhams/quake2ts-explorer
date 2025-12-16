import { BspAdapter } from '@/src/components/UniversalViewer/adapters/BspAdapter';
import { Camera, BspMap, Texture2D, BspSurfacePipeline, resolveLightStyles } from 'quake2ts/engine';
import { mat4 } from 'gl-matrix';
import { PakService } from '@/src/services/pakService';
import { RenderOptions } from '@/src/components/UniversalViewer/adapters/types';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    const originalModule = jest.requireActual('quake2ts/engine');
    return {
        ...originalModule,
        BspSurfacePipeline: jest.fn().mockImplementation(() => ({
            bind: jest.fn().mockReturnValue({}),
            draw: jest.fn()
        })),
        resolveLightStyles: jest.fn(),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            uploadImage: jest.fn(),
            setParameters: jest.fn()
        })),
        applySurfaceState: jest.fn()
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
            createTexture: jest.fn(),
            bindTexture: jest.fn(),
            texImage2D: jest.fn(),
            texParameteri: jest.fn(),
            generateMipmap: jest.fn(),
            activeTexture: jest.fn(),
            drawElements: jest.fn(),
            createShader: jest.fn().mockReturnValue({}),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            createProgram: jest.fn().mockReturnValue({}),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn().mockReturnValue(true),
            getShaderParameter: jest.fn().mockReturnValue(true),
            getAttribLocation: jest.fn(),
            getUniformLocation: jest.fn(),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            createVertexArray: jest.fn().mockReturnValue({}),
            bindVertexArray: jest.fn(),
            useProgram: jest.fn(),
            getUniformLocation: jest.fn(),
            uniformMatrix4fv: jest.fn(),
            uniform3fv: jest.fn(),
            uniform4fv: jest.fn(),
            drawArrays: jest.fn(),
            deleteShader: jest.fn(),
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
            hasFile: jest.fn().mockReturnValue(false)
        } as unknown as PakService;

        adapter = new BspAdapter();
        // Load map (mocked)
        return adapter.loadMap(mockGl, mockMap, mockPakService);
    });

    it('freezes light styles when freezeLights is true', () => {
        // Mock light styles returning dynamic values
        (resolveLightStyles as jest.Mock).mockReturnValue(new Float32Array([0.5, 2.0]));

        // Mock pipeline to capture bind call
        const mockBind = jest.fn().mockReturnValue({});
        (adapter as any).pipeline.bind = mockBind;
        (adapter as any).geometry = { surfaces: [{ surfaceFlags: 0, indexCount: 0, vao: { bind: jest.fn() } }], lightmaps: [] };
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
         (resolveLightStyles as jest.Mock).mockReturnValue(new Float32Array([0.5, 2.0]));

         const mockBind = jest.fn().mockReturnValue({});
         (adapter as any).pipeline.bind = mockBind;
         (adapter as any).geometry = { surfaces: [{ surfaceFlags: 0, indexCount: 0, vao: { bind: jest.fn() } }], lightmaps: [] };
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
