import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LightingControls, LightingOptions } from '@/src/components/LightingControls';
import '@testing-library/jest-dom';

describe('LightingControls', () => {
    const defaultOptions: LightingOptions = {
        brightness: 1.0,
        gamma: 1.0,
        ambient: 0.1,
        fullbright: false
    };

    const mockOnChange = jest.fn();
    const mockOnClose = jest.fn();

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

        // Find the brightness input (first range input or by label nearby)
        // Since labels contain the value, we can find by text match?
        // Or cleaner: getByRole doesn't distinguish ranges easily without aria-label.
        // But the component uses <label> text </label> <input>.
        // Let's assume order or add aria-labels if needed.
        // For now, let's find input associated with label implicitly or by value?
        // Actually, the structure is <div><label>Brightness: 1.00</label><input></div>
        // Testing-library philosophy: query by label text. But the input is not nested in label in my code.
        // Code: <label>...</label><input>
        // I can use `getAllByRole('slider')`.

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

        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);

        expect(mockOnChange).toHaveBeenCalledWith({
            ...defaultOptions,
            fullbright: true
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
                options={{ brightness: 2.0, gamma: 2.0, ambient: 0.5, fullbright: true }}
                onChange={mockOnChange}
                onClose={mockOnClose}
            />
        );

        const resetBtn = screen.getByText('Reset Defaults');
        fireEvent.click(resetBtn);

        expect(mockOnChange).toHaveBeenCalledWith(defaultOptions);
    });
});
