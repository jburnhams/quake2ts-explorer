
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { videoRecorderService } from '@/src/services/videoRecorder';
import { ParsedFile, PakService } from '@/src/services/pakService';
import { createWebGLContext } from '@quake2ts/engine';

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
    return {
        createWebGLContext: vi.fn(),
        Camera: vi.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            updateMatrices: vi.fn()
        })),
        BspSurfacePipeline: vi.fn(),
        Md2Pipeline: vi.fn().mockImplementation(() => ({
             bind: vi.fn(),
             draw: vi.fn()
        })),
        Md2MeshBuffers: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            update: vi.fn(),
            draw: vi.fn()
        })),
        createAnimationState: vi.fn(),
        createBspSurfaces: vi.fn().mockReturnValue([]),
        buildBspGeometry: vi.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: vi.fn().mockImplementation(() => ({
            bind: vi.fn(),
            setParameters: vi.fn(),
            uploadImage: vi.fn()
        })),
        parseWal: vi.fn(),
        walToRgba: vi.fn(),
        resolveLightStyles: vi.fn().mockReturnValue(new Float32Array(64)),
        applySurfaceState: vi.fn(),
        BspMap: vi.fn(),
        findLeafForPoint: vi.fn(),
        DemoPlaybackController: vi.fn()
    };
});

vi.mock('@/src/services/videoRecorder');

// Mock canvas captureStream
HTMLCanvasElement.prototype.captureStream = vi.fn().mockReturnValue({
    getVideoTracks: () => [{ stop: vi.fn() }]
});

// Mock URL
global.URL.createObjectURL = vi.fn(() => 'blob:url');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLAnchorElement.click to prevent navigation
const clickMock = vi.fn();
Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
    writable: true,
    value: clickMock
});

describe('Video Recording Integration', () => {
    let mockPakService: PakService;
    let mockParsedFile: ParsedFile;
    let mockGl: Partial<WebGL2RenderingContext>;

    beforeEach(() => {
        mockPakService = {
            hasFile: vi.fn().mockReturnValue(false),
            readFile: vi.fn(),
            getPalette: vi.fn(),
            mountPak: vi.fn(),
            findByExtension: vi.fn()
        } as unknown as PakService;

        const mockModel = {
            header: {
                skinWidth: 0, skinHeight: 0, frameSize: 0, numSkins: 0, numVertices: 0, numST: 0, numTris: 0, numGlCmds: 0, numFrames: 1, offsetSkins: 0, offsetST: 0, offsetTris: 0, offsetFrames: 0, offsetGlCmds: 0, offsetEnd: 0
            },
            skins: [],
            frames: [{ name: 'stand01', translate: [0,0,0], scale: [1,1,1], vertices: [] }],
            triangles: [],
            glCmds: new Int32Array(0)
        };

        mockParsedFile = {
            type: 'md2',
            model: mockModel,
            animations: []
        } as unknown as ParsedFile;

        mockGl = {
            viewport: vi.fn(),
            clearColor: vi.fn(),
            clear: vi.fn(),
            enable: vi.fn(),
            disable: vi.fn(),
            cullFace: vi.fn(),
            getExtension: vi.fn(),
            getParameter: vi.fn(),
            createShader: vi.fn(),
            createProgram: vi.fn(),
            createBuffer: vi.fn(),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            createVertexArray: vi.fn(),
            bindVertexArray: vi.fn(),
            getShaderParameter: vi.fn().mockReturnValue(true),
            getProgramParameter: vi.fn().mockReturnValue(true),
            createTexture: vi.fn(),
            bindTexture: vi.fn(),
            texParameteri: vi.fn(),
            texImage2D: vi.fn(),
            generateMipmap: vi.fn(),
            drawElements: vi.fn(),
            activeTexture: vi.fn(),
        };

        (createWebGLContext as vi.Mock).mockReturnValue({ gl: mockGl });
        (videoRecorderService.isRecording as vi.Mock).mockReturnValue(false);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('opens video settings when clicking record', async () => {
        render(
            <UniversalViewer
                parsedFile={mockParsedFile}
                pakService={mockPakService}
                filePath="models/test.md2"
            />
        );

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        const recordBtn = screen.getByTitle('Record Video');
        fireEvent.click(recordBtn);

        expect(screen.getByText('Video Recording Settings')).toBeInTheDocument();
    });

    it('starts recording with selected options', async () => {
        render(
            <UniversalViewer
                parsedFile={mockParsedFile}
                pakService={mockPakService}
                filePath="models/test.md2"
            />
        );

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        fireEvent.click(screen.getByTitle('Record Video'));
        fireEvent.click(screen.getByText('Start Recording'));

        expect(videoRecorderService.startRecording).toHaveBeenCalledWith(
            expect.any(HTMLCanvasElement),
            expect.objectContaining({
                fps: 30,
                videoBitsPerSecond: 2500000,
                mimeType: 'video/webm;codecs=vp9'
            })
        );
    });

    it('stops recording and handles download', async () => {
        (videoRecorderService.isRecording as vi.Mock).mockReturnValue(true);
        (videoRecorderService.stopRecording as vi.Mock).mockResolvedValue(new Blob(['video data'], { type: 'video/webm' }));

        render(
            <UniversalViewer
                parsedFile={mockParsedFile}
                pakService={mockPakService}
                filePath="models/test.md2"
            />
        );

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        fireEvent.click(screen.getByTitle('Record Video'));
        fireEvent.click(screen.getByText('Start Recording'));

        const stopBtn = screen.getByTitle('Stop Recording');
        expect(stopBtn).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(stopBtn);
        });

        expect(videoRecorderService.stopRecording).toHaveBeenCalled();
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
});
