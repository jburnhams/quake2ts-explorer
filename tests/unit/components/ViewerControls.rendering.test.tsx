import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerControls } from '../../../src/components/UniversalViewer/ViewerControls';
import { OrbitState } from '../../../src/utils/cameraUtils';
import { RenderingOptions } from '../../../src/components/UniversalViewer/adapters/types';
import { vec3 } from 'gl-matrix';

describe('ViewerControls Rendering Options', () => {
    const mockSetOrbit = jest.fn();
    const mockSetSpeed = jest.fn();
    const mockOnPlayPause = jest.fn();
    const mockSetRenderingOptions = jest.fn();

    const defaultOrbit: OrbitState = {
        radius: 100,
        theta: 0,
        phi: Math.PI / 4,
        target: [0, 0, 0] as unknown as vec3,
    };

    const defaultRenderingOptions: RenderingOptions = {
        fillMode: 'solid',
    };

    const defaultProps = {
        isPlaying: false,
        onPlayPause: mockOnPlayPause,
        orbit: defaultOrbit,
        setOrbit: mockSetOrbit,
        hasPlayback: true,
        speed: 1.0,
        setSpeed: mockSetSpeed,
        showCameraControls: true,
        cameraMode: 'orbit' as const,
        setCameraMode: jest.fn(),
        renderingOptions: defaultRenderingOptions,
        setRenderingOptions: mockSetRenderingOptions,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the fill mode dropdown', () => {
        render(<ViewerControls {...defaultProps} />);
        expect(screen.getByLabelText('Fill Mode:')).toBeInTheDocument();
    });

    it('calls setRenderingOptions when fill mode is changed', () => {
        const setRenderingOptions = jest.fn();
        render(<ViewerControls {...defaultProps} setRenderingOptions={setRenderingOptions} />);
        const select = screen.getByLabelText('Fill Mode:');
        fireEvent.change(select, { target: { value: 'wireframe' } });

        expect(setRenderingOptions).toHaveBeenCalledWith(expect.any(Function));
    });

    it('shows the color picker when fill mode is solid', () => {
        render(<ViewerControls {...defaultProps} />);
        expect(screen.getByLabelText('Solid Color:')).toBeInTheDocument();
    });

    it('hides the color picker when fill mode is not solid', () => {
        render(<ViewerControls {...defaultProps} renderingOptions={{ fillMode: 'wireframe' }} />);
        expect(screen.queryByLabelText('Solid Color:')).not.toBeInTheDocument();
    });

    it('calls setRenderingOptions when color is changed', () => {
        render(<ViewerControls {...defaultProps} />);
        const colorPicker = screen.getByLabelText('Solid Color:');
        fireEvent.change(colorPicker, { target: { value: '#ff0000' } });

        expect(mockSetRenderingOptions).toHaveBeenCalledWith(expect.any(Function));
        const updater = mockSetRenderingOptions.mock.calls[0][0];
        const newState = updater(defaultRenderingOptions);
        expect(newState.solidColor).toEqual([1, 0, 0]);
    });
});
