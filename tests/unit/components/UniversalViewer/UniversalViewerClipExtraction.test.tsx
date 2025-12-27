import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UniversalViewer } from '../../../../src/components/UniversalViewer/UniversalViewer';
import { bookmarkService } from '../../../../src/services/bookmarkService';
import { ParsedFile, PakService } from '../../../../src/services/pakService';

// Mock dependencies
vi.mock('../../../../src/services/bookmarkService');
vi.mock('@/src/services/videoRecorder');
vi.mock('../../../../src/components/UniversalViewer/adapters/DebugRenderer', () => ({
    DebugRenderer: vi.fn().mockImplementation(() => ({ init: vi.fn(), render: vi.fn(), clear: vi.fn() }))
}));

// Mock DemoTimeline to expose extract trigger
vi.mock('../../../../src/components/DemoTimeline', () => ({
    DemoTimeline: ({ onExtractClip }: any) => (
        <button data-testid="extract-clip-btn" onClick={() => onExtractClip(10, 20)}>
            Extract Clip
        </button>
    )
}));

// Mock quake2ts/engine
vi.mock('@quake2ts/engine', () => ({
    createWebGLContext: vi.fn(() => ({
        gl: {
            getExtension: vi.fn(),
            getParameter: vi.fn(),
            createShader: vi.fn().mockReturnValue({}),
            shaderSource: vi.fn(),
            compileShader: vi.fn(),
            getShaderParameter: vi.fn().mockReturnValue(true),
            createProgram: vi.fn().mockReturnValue({}),
            attachShader: vi.fn(),
            linkProgram: vi.fn(),
            getProgramParameter: vi.fn().mockReturnValue(true),
            useProgram: vi.fn(),
            getUniformLocation: vi.fn(),
            getAttribLocation: vi.fn(),
            createBuffer: vi.fn(),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            vertexAttribPointer: vi.fn(),
            createVertexArray: vi.fn(),
            bindVertexArray: vi.fn(),
            viewport: vi.fn(),
            clearColor: vi.fn(),
            clear: vi.fn(),
            enable: vi.fn(),
            cullFace: vi.fn(),
            depthFunc: vi.fn(),
            blendFunc: vi.fn(),
            blendFuncSeparate: vi.fn(),
            deleteShader: vi.fn(),
            deleteProgram: vi.fn(),
            deleteVertexArray: vi.fn(),
            deleteBuffer: vi.fn(),
            createTexture: vi.fn(),
            bindTexture: vi.fn(),
            texParameteri: vi.fn(),
            texImage2D: vi.fn(),
            generateMipmap: vi.fn(),
            activeTexture: vi.fn(),
            deleteTexture: vi.fn(),
            createRenderbuffer: vi.fn().mockReturnValue({}),
            bindRenderbuffer: vi.fn(),
            renderbufferStorage: vi.fn(),
            framebufferRenderbuffer: vi.fn(),
            createFramebuffer: vi.fn().mockReturnValue({}),
            bindFramebuffer: vi.fn(),
            checkFramebufferStatus: vi.fn().mockReturnValue(36053), // GL_FRAMEBUFFER_COMPLETE
            framebufferTexture2D: vi.fn(),
            deleteFramebuffer: vi.fn(),
            deleteRenderbuffer: vi.fn(),
            readPixels: vi.fn(),
        }
    })),
    Camera: vi.fn(),
    DemoPlaybackController: vi.fn()
}));

// Mock Dm2Adapter
const mockGetDemoController = vi.fn();
const mockGetDemoBuffer = vi.fn();

vi.mock('../../../../src/components/UniversalViewer/adapters/Dm2Adapter', () => ({
    Dm2Adapter: vi.fn().mockImplementation(() => ({
        load: vi.fn(),
        update: vi.fn(),
        render: vi.fn(),
        cleanup: vi.fn(),
        getDemoController: mockGetDemoController,
        getDemoBuffer: mockGetDemoBuffer,
        hasCameraControl: () => false
    }))
}));

describe('UniversalViewer Clip Extraction', () => {
    let pakService: PakService;
    let mockController: any;

    beforeEach(() => {
        vi.clearAllMocks();
        pakService = {} as PakService;

        mockController = {
            timeToFrame: vi.fn((t) => t * 10), // Simple 10fps mock
            getDuration: vi.fn(() => 100),
            getCurrentTime: vi.fn(() => 0),
            getCurrentFrame: vi.fn(() => 0),
            addBookmark: vi.fn(),
            removeBookmark: vi.fn(),
        };
        mockGetDemoController.mockReturnValue(mockController);

        // Setup global mocks
        global.alert = vi.fn();
        global.URL.createObjectURL = vi.fn(() => 'blob:url');
        global.URL.revokeObjectURL = vi.fn();
    });

    it('extracts clip successfully', async () => {
        const buffer = new Uint8Array([1, 2, 3]);
        mockGetDemoBuffer.mockReturnValue(buffer);
        (bookmarkService.extractClip as vi.Mock).mockResolvedValue(new Uint8Array([4, 5, 6]));

        const parsedFile: ParsedFile = { type: 'dm2', data: new Uint8Array() };
        render(<UniversalViewer parsedFile={parsedFile} pakService={pakService} filePath="test.dm2" />);

        await waitFor(() => screen.getByTestId('extract-clip-btn'));
        fireEvent.click(screen.getByTestId('extract-clip-btn'));

        await waitFor(() => {
            expect(mockGetDemoBuffer).toHaveBeenCalled();
            expect(mockController.timeToFrame).toHaveBeenCalledWith(10);
            expect(mockController.timeToFrame).toHaveBeenCalledWith(20);
            expect(bookmarkService.extractClip).toHaveBeenCalledWith(buffer, 100, 200);
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });
    });

    it('handles missing buffer error', async () => {
        mockGetDemoBuffer.mockReturnValue(null);

        const parsedFile: ParsedFile = { type: 'dm2', data: new Uint8Array() };
        render(<UniversalViewer parsedFile={parsedFile} pakService={pakService} filePath="test.dm2" />);

        await waitFor(() => screen.getByTestId('extract-clip-btn'));
        fireEvent.click(screen.getByTestId('extract-clip-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Cannot access demo data'));
        });
    });

    it('handles extraction failure', async () => {
        mockGetDemoBuffer.mockReturnValue(new Uint8Array());
        (bookmarkService.extractClip as vi.Mock).mockRejectedValue(new Error('Extraction failed'));

        const parsedFile: ParsedFile = { type: 'dm2', data: new Uint8Array() };
        render(<UniversalViewer parsedFile={parsedFile} pakService={pakService} filePath="test.dm2" />);

        await waitFor(() => screen.getByTestId('extract-clip-btn'));
        fireEvent.click(screen.getByTestId('extract-clip-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Failed to extract clip: Extraction failed'));
        });
    });

    it('handles null result from extraction service', async () => {
        mockGetDemoBuffer.mockReturnValue(new Uint8Array());
        (bookmarkService.extractClip as vi.Mock).mockResolvedValue(null);

        const parsedFile: ParsedFile = { type: 'dm2', data: new Uint8Array() };
        render(<UniversalViewer parsedFile={parsedFile} pakService={pakService} filePath="test.dm2" />);

        await waitFor(() => screen.getByTestId('extract-clip-btn'));
        fireEvent.click(screen.getByTestId('extract-clip-btn'));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalledWith('Clip extraction failed or not supported.');
        });
    });
});
