
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { videoRecorderService } from '@/src/services/videoRecorder';
import { ParsedFile, PakService } from '@/src/services/pakService';
import { createWebGLContext } from 'quake2ts/engine';

// Mock dependencies
jest.mock('quake2ts/engine', () => {
    return {
        createWebGLContext: jest.fn(),
        Camera: jest.fn().mockImplementation(() => ({
            projectionMatrix: new Float32Array(16),
            viewMatrix: new Float32Array(16),
            updateMatrices: jest.fn()
        })),
        BspSurfacePipeline: jest.fn(),
        Md2Pipeline: jest.fn().mockImplementation(() => ({
             bind: jest.fn(),
             draw: jest.fn()
        })),
        Md2MeshBuffers: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            update: jest.fn(),
            draw: jest.fn()
        })),
        createAnimationState: jest.fn(),
        createBspSurfaces: jest.fn().mockReturnValue([]),
        buildBspGeometry: jest.fn().mockReturnValue({ surfaces: [], lightmaps: [] }),
        Texture2D: jest.fn().mockImplementation(() => ({
            bind: jest.fn(),
            setParameters: jest.fn(),
            uploadImage: jest.fn()
        })),
        parseWal: jest.fn(),
        walToRgba: jest.fn(),
        resolveLightStyles: jest.fn().mockReturnValue(new Float32Array(64)),
        applySurfaceState: jest.fn(),
        BspMap: jest.fn(),
        findLeafForPoint: jest.fn(),
        DemoPlaybackController: jest.fn()
    };
});

jest.mock('@/src/services/videoRecorder');

// Mock canvas captureStream
HTMLCanvasElement.prototype.captureStream = jest.fn().mockReturnValue({
    getVideoTracks: () => [{ stop: jest.fn() }]
});

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

describe('Video Recording Integration', () => {
    let mockPakService: PakService;
    let mockParsedFile: ParsedFile;
    let mockGl: Partial<WebGL2RenderingContext>;

    beforeEach(() => {
        mockPakService = {
            hasFile: jest.fn().mockReturnValue(false),
            readFile: jest.fn(),
            getPalette: jest.fn(),
            mountPak: jest.fn(),
            findByExtension: jest.fn()
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
            viewport: jest.fn(),
            clearColor: jest.fn(),
            clear: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            cullFace: jest.fn(),
            getExtension: jest.fn(),
            getParameter: jest.fn(),
            createShader: jest.fn(),
            createProgram: jest.fn(),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            createVertexArray: jest.fn(),
            bindVertexArray: jest.fn(),
            getShaderParameter: jest.fn().mockReturnValue(true),
            getProgramParameter: jest.fn().mockReturnValue(true),
            createTexture: jest.fn(),
            bindTexture: jest.fn(),
            texParameteri: jest.fn(),
            texImage2D: jest.fn(),
            generateMipmap: jest.fn(),
            drawElements: jest.fn(),
            activeTexture: jest.fn(),
        };

        (createWebGLContext as jest.Mock).mockReturnValue({ gl: mockGl });
        (videoRecorderService.isRecording as jest.Mock).mockReturnValue(false);
    });

    afterEach(() => {
        jest.clearAllMocks();
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
        (videoRecorderService.isRecording as jest.Mock).mockReturnValue(true);
        (videoRecorderService.stopRecording as jest.Mock).mockResolvedValue(new Blob(['video data'], { type: 'video/webm' }));

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
