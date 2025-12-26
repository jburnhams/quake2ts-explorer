import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '@/src/services/pakService';
import { Dm2Adapter } from '@/src/components/UniversalViewer/adapters/Dm2Adapter';
import { CameraMode } from '@/src/types/cameraMode';
import { DemoPlaybackController } from '@quake2ts/engine';

// Mock everything
vi.mock('@/src/components/UniversalViewer/adapters/Dm2Adapter');
vi.mock('@/src/components/UniversalViewer/adapters/BspAdapter');
vi.mock('@/src/components/UniversalViewer/adapters/Md2Adapter');
vi.mock('@/src/components/UniversalViewer/adapters/Md3Adapter');
vi.mock('@/src/utils/cameraUtils');
vi.mock('@/src/services/screenshotService');
vi.mock('@/src/services/performanceService', () => ({
    performanceService: {
        createFpsCounter: () => ({
            update: vi.fn(),
            getAverageFps: vi.fn(),
            getMinFps: vi.fn(),
            getMaxFps: vi.fn()
        }),
        now: vi.fn(),
        startMeasure: vi.fn(),
        endMeasure: vi.fn()
    }
}));

vi.mock('@quake2ts/engine', () => ({
    createWebGLContext: vi.fn().mockReturnValue({ gl: {
        clearColor: vi.fn(),
        clear: vi.fn(),
        enable: vi.fn(),
        viewport: vi.fn(),
        createShader: vi.fn(),
        createProgram: vi.fn(),
        // Mock all required gl methods
    } }),
    Camera: vi.fn().mockImplementation(() => ({
        position: [0,0,0],
        angles: [0,0,0],
        updateMatrices: vi.fn()
    })),
    DemoPlaybackController: vi.fn()
}));

describe('UniversalViewer Camera Integration', () => {
    let mockPakService: PakService;
    let mockDm2Adapter: vi.Mocked<Dm2Adapter>;
    let mockController: any;

    beforeEach(() => {
        mockPakService = {
            hasFile: vi.fn(),
            parseFile: vi.fn()
        } as any;

        mockController = {
             getCurrentFrame: vi.fn().mockReturnValue(0),
             getFrameCount: vi.fn().mockReturnValue(100),
             getDuration: vi.fn().mockReturnValue(10),
             getCurrentTime: vi.fn().mockReturnValue(0),
             getFrameData: vi.fn().mockReturnValue({}),
             loadDemo: vi.fn(),
             play: vi.fn(),
             pause: vi.fn()
        };

        mockDm2Adapter = {
            load: vi.fn().mockResolvedValue(undefined),
            cleanup: vi.fn(),
            update: vi.fn(),
            render: vi.fn(),
            hasCameraControl: vi.fn().mockReturnValue(true),
            setCameraMode: vi.fn(),
            getCameraUpdate: vi.fn().mockReturnValue({ position: [0,0,0], angles: [0,0,0] }),
            getDemoController: vi.fn().mockReturnValue(mockController),
            setRenderOptions: vi.fn(),
            setDebugMode: vi.fn(),
            isPlaying: vi.fn().mockReturnValue(true),
            play: vi.fn(),
            pause: vi.fn()
        } as any;

        (Dm2Adapter as vi.Mock).mockImplementation(() => mockDm2Adapter);
    });

    test('renders demo camera controls when playing DM2', async () => {
        const file = { type: 'dm2', name: 'test.dm2', data: new Uint8Array(10) } as any;

        await act(async () => {
            render(<UniversalViewer parsedFile={file} pakService={mockPakService} />);
        });

        // Wait for adapter load
        await screen.findByRole('combobox', { name: /camera mode/i });

        const select = screen.getByRole('combobox', { name: /camera mode/i });
        expect(select).toBeInTheDocument();
        expect(select).toHaveValue(CameraMode.FirstPerson);

        // Change mode
        fireEvent.change(select, { target: { value: CameraMode.ThirdPerson } });

        // Verify adapter was updated
        expect(mockDm2Adapter.setCameraMode).toHaveBeenCalledWith(CameraMode.ThirdPerson);
    });
});
