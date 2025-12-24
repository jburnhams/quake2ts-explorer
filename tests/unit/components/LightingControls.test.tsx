import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightingControls, LightingOptions } from '@/src/components/LightingControls';
import '@testing-library/jest-dom';

describe('LightingControls', () => {
    const defaultOptions: LightingOptions = {
        brightness: 1.0,
        gamma: 1.0,
        ambient: 0.1,
        fullbright: false,
        freezeLights: false
    };

    const mockOnChange = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
        mockOnClose.mockClear();
    });

    it('renders nothing when closed', () => {
        const { container } = render(
            <LightingControls
                isOpen={false}
                options={defaultOptions}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders controls when open', () => {
        render(
            <LightingControls
                isOpen={true}
                options={defaultOptions}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText('Lighting Controls')).toBeInTheDocument();
        expect(screen.getByText(/Brightness:/)).toBeInTheDocument();
        expect(screen.getByText(/Gamma:/)).toBeInTheDocument();
        expect(screen.getByText(/Ambient Light:/)).toBeInTheDocument();
        expect(screen.getByText(/Fullbright Mode:/)).toBeInTheDocument();
        expect(screen.getByText(/Freeze Animated Lights:/)).toBeInTheDocument();
    });

    it('calls onChange when brightness changes', () => {
        render(
            <LightingControls
                isOpen={true}
                options={defaultOptions}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        const sliders = screen.getAllByRole('slider'); // ranges are sliders
        const brightnessSlider = sliders[0]; // Assuming order: Brightness, Gamma, Ambient

        fireEvent.change(brightnessSlider, { target: { value: '1.5' } });

        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultOptions,
            brightness: 1.5
        });
    });

    it('calls onChange when fullbright toggles', () => {
        render(
            <LightingControls
                isOpen={true}
                options={defaultOptions}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        const checkboxes = screen.getAllByRole('checkbox');
        // Assuming Fullbright is the first checkbox
        const fullbrightCheckbox = checkboxes[0];
        fireEvent.click(fullbrightCheckbox);

        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultOptions,
            fullbright: true
        });
    });

    it('calls onChange when freeze lights toggles', () => {
        render(
            <LightingControls
                isOpen={true}
                options={defaultOptions}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        const checkboxes = screen.getAllByRole('checkbox');
        // Assuming Freeze Lights is the second checkbox
        const freezeCheckbox = checkboxes[1];
        fireEvent.click(freezeCheckbox);

        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultOptions,
            freezeLights: true
        });
    });

    it('calls onClose when close button clicked', () => {
        render(
            <LightingControls
                isOpen={true}
                options={defaultOptions}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        const closeBtn = screen.getByText('Close');
        fireEvent.click(closeBtn);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets defaults', () => {
        render(
            <LightingControls
                isOpen={true}
                options={{ brightness: 2.0, gamma: 2.0, ambient: 0.5, fullbright: true, freezeLights: true }}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        const resetBtn = screen.getByText('Reset Defaults');
        fireEvent.click(resetBtn);

        expect(mockOnChange).toHaveBeenCalledWith(defaultOptions);
    });
});
