import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ViewerControls } from '@/src/components/UniversalViewer/ViewerControls';
import { CameraMode } from '@/src/types/cameraMode';
import { DebugMode } from '@/src/types/debugMode';
import { OrbitState, FreeCameraState } from '@/src/utils/cameraUtils';

describe('ViewerControls Integration', () => {
    const mockOrbit: OrbitState = {
        radius: 100,
        theta: 0,
        phi: 0,
        target: [0, 0, 0] as any
    };
    const mockFreeCam: FreeCameraState = {
        position: [0, 0, 0] as any,
        rotation: [0, 0, 0] as any
    };

    const defaultProps = {
        isPlaying: false,
        onPlayPause: jest.fn(),
        orbit: mockOrbit,
        setOrbit: jest.fn(),
        freeCamera: mockFreeCam,
        setFreeCamera: jest.fn(),
        hasPlayback: true,
        speed: 1.0,
        setSpeed: jest.fn(),
        showCameraControls: true,
        cameraMode: 'orbit' as const,
        setCameraMode: jest.fn(),
        renderMode: 'textured' as const,
        setRenderMode: jest.fn(),
        renderColor: [1, 1, 1] as [number, number, number],
        setRenderColor: jest.fn(),
        onScreenshot: jest.fn(),
        onMetadata: jest.fn()
    };

    test('renders metadata button when onMetadata provided', () => {
        render(<ViewerControls {...defaultProps} />);

        const metadataBtn = screen.getByTitle('Edit Metadata');
        expect(metadataBtn).toBeInTheDocument();

        fireEvent.click(metadataBtn);
        expect(defaultProps.onMetadata).toHaveBeenCalled();
    });

    test('does not render metadata button when onMetadata not provided', () => {
        const props = { ...defaultProps, onMetadata: undefined };
        render(<ViewerControls {...props} />);

        const metadataBtn = screen.queryByTitle('Edit Metadata');
        expect(metadataBtn).not.toBeInTheDocument();
    });
});
