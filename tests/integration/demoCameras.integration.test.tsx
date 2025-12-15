import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UniversalViewer } from '@/src/components/UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '@/src/services/pakService';
import { Dm2Adapter } from '@/src/components/UniversalViewer/adapters/Dm2Adapter';
import { CameraMode } from '@/src/types/cameraMode';
import { DemoPlaybackController } from 'quake2ts/engine';

// Mock everything
jest.mock('@/src/components/UniversalViewer/adapters/Dm2Adapter');
jest.mock('@/src/components/UniversalViewer/adapters/BspAdapter');
jest.mock('@/src/components/UniversalViewer/adapters/Md2Adapter');
jest.mock('@/src/components/UniversalViewer/adapters/Md3Adapter');
jest.mock('@/src/utils/cameraUtils');
jest.mock('@/src/services/screenshotService');
jest.mock('@/src/services/performanceService', () => ({
    performanceService: {
        createFpsCounter: () => ({
            update: jest.fn(),
            getAverageFps: jest.fn(),
            getMinFps: jest.fn(),
            getMaxFps: jest.fn()
        }),
        now: jest.fn(),
        startMeasure: jest.fn(),
        endMeasure: jest.fn()
    }
}));

jest.mock('quake2ts/engine', () => ({
    createWebGLContext: jest.fn().mockReturnValue({ gl: {
        clearColor: jest.fn(),
        clear: jest.fn(),
        enable: jest.fn(),
        viewport: jest.fn(),
        createShader: jest.fn(),
        createProgram: jest.fn(),
        // Mock all required gl methods
    } }),
    Camera: jest.fn().mockImplementation(() => ({
        position: [0,0,0],
        angles: [0,0,0],
        updateMatrices: jest.fn()
    })),
    DemoPlaybackController: jest.fn()
}));

describe('UniversalViewer Camera Integration', () => {
    let mockPakService: PakService;
    let mockDm2Adapter: jest.Mocked<Dm2Adapter>;
    let mockController: any;

    beforeEach(() => {
        mockPakService = {
            hasFile: jest.fn(),
            parseFile: jest.fn()
        } as any;

        mockController = {
             getCurrentFrame: jest.fn().mockReturnValue(0),
             getFrameCount: jest.fn().mockReturnValue(100),
             getDuration: jest.fn().mockReturnValue(10),
             getCurrentTime: jest.fn().mockReturnValue(0),
             getFrameData: jest.fn().mockReturnValue({}),
             loadDemo: jest.fn(),
             play: jest.fn(),
             pause: jest.fn()
        };

        mockDm2Adapter = {
            load: jest.fn().mockResolvedValue(undefined),
            cleanup: jest.fn(),
            update: jest.fn(),
            render: jest.fn(),
            hasCameraControl: jest.fn().mockReturnValue(true),
            setCameraMode: jest.fn(),
            getCameraUpdate: jest.fn().mockReturnValue({ position: [0,0,0], angles: [0,0,0] }),
            getDemoController: jest.fn().mockReturnValue(mockController),
            setRenderOptions: jest.fn(),
            setDebugMode: jest.fn(),
            isPlaying: jest.fn().mockReturnValue(true),
            play: jest.fn(),
            pause: jest.fn()
        } as any;

        (Dm2Adapter as jest.Mock).mockImplementation(() => mockDm2Adapter);
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
