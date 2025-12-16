import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PostProcessSettings } from '@/src/components/PostProcessSettings';
import { defaultPostProcessOptions } from '@/src/utils/postProcessing';

describe('PostProcessSettings', () => {
    const mockOnChange = jest.fn();
    const mockOnClose = jest.fn();

    const renderComponent = (props: Partial<React.ComponentProps<typeof PostProcessSettings>> = {}) => {
        return render(
            <PostProcessSettings
                options={defaultPostProcessOptions}
                onChange={mockOnChange}
                isOpen={true}
                onClose={mockOnClose}
                {...props}
            />
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not render when isOpen is false', () => {
        renderComponent({ isOpen: false });
        expect(screen.queryByText('Post Processing')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
        renderComponent();
        expect(screen.getByText('Post Processing')).toBeInTheDocument();
        expect(screen.getByLabelText('Enable Post Processing')).toBeInTheDocument();
    });

    it('should call onChange when settings are modified', () => {
        renderComponent();
        const enableCheckbox = screen.getByLabelText('Enable Post Processing');
        fireEvent.click(enableCheckbox);

        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultPostProcessOptions,
            enabled: !defaultPostProcessOptions.enabled
        });
    });

    it('should disable controls when enabled is false', () => {
        renderComponent({ options: { ...defaultPostProcessOptions, enabled: false } });
        expect(screen.getByLabelText('Enable Bloom')).toBeDisabled();
        expect(screen.getByLabelText('FXAA (Fast Approximate Anti-Aliasing)')).toBeDisabled();
        expect(screen.getByLabelText(/Contrast/)).toBeDisabled();
    });

    it('should enable controls when enabled is true', () => {
        renderComponent({ options: { ...defaultPostProcessOptions, enabled: true } });
        expect(screen.getByLabelText('Enable Bloom')).not.toBeDisabled();
        expect(screen.getByLabelText('FXAA (Fast Approximate Anti-Aliasing)')).not.toBeDisabled();
        expect(screen.getByLabelText(/Contrast/)).not.toBeDisabled();
    });

    it('should call onClose when close button is clicked', () => {
        renderComponent();
        // The close button is the "×" button in the header
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset defaults when Reset to Defaults is clicked', () => {
        const modifiedOptions = { ...defaultPostProcessOptions, brightness: 2.0, enabled: true };
        renderComponent({ options: modifiedOptions });

        fireEvent.click(screen.getByText('Reset to Defaults'));
        expect(mockOnChange).toHaveBeenCalledWith(defaultPostProcessOptions);
    });
});
