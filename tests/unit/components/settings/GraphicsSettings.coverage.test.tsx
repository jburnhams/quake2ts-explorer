import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GraphicsSettingsTab } from '@/src/components/settings/GraphicsSettings';
import { GraphicsSettings } from '@/src/types/settings';

describe('GraphicsSettingsTab', () => {
  const mockSettings: GraphicsSettings = {
    renderQuality: 'high',
    resolutionScale: 1.0,
    fov: 90,
    frameRateLimit: 60,
    vsync: true,
    antialiasing: 'none',
    textureFiltering: 'bilinear',
    anisotropicFiltering: 8,
    brightness: 1.0,
    gamma: 1.0,
    textureQuality: 'high',
    particles: 'high',
    lighting: 'high',
    shadows: 'medium',
    postProcessing: {
        bloom: true,
        ssao: true,
        antialiasing: 'fxaa',
    },
    bloom: true,
    ssao: true,
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all settings controls', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    expect(screen.getByText('Render Quality Preset')).toBeInTheDocument();
    expect(screen.getByText('Resolution Scale')).toBeInTheDocument();
    expect(screen.getByText('Field of View')).toBeInTheDocument();
    expect(screen.getByText('Frame Rate Limit')).toBeInTheDocument();
    expect(screen.getByText('VSync')).toBeInTheDocument();
    expect(screen.getByText('Anti-Aliasing')).toBeInTheDocument();
    expect(screen.getByText('Texture Filtering')).toBeInTheDocument();
    expect(screen.getByText('Anisotropic Filtering')).toBeInTheDocument();
  });

  it('updates render quality', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    // Find select by current value or label logic.
    // Since there are multiple selects, we might need to be specific.
    // However, looking at the code, they don't have IDs.
    // We can find by combobox role and value/options.

    const selects = screen.getAllByRole('combobox');
    const qualitySelect = selects.find(s => (s as HTMLSelectElement).value === 'high' && s.innerHTML.includes('Ultra'));

    fireEvent.change(qualitySelect!, { target: { value: 'ultra' } });
    expect(mockOnChange).toHaveBeenCalledWith({ renderQuality: 'ultra' });
  });

  it('updates resolution scale', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    // Find range input
    const slider = screen.getAllByRole('slider').find(s => (s as HTMLInputElement).max === "2.0");

    fireEvent.change(slider!, { target: { value: '1.5' } });
    expect(mockOnChange).toHaveBeenCalledWith({ resolutionScale: 1.5 });
  });

  it('updates fov', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const slider = screen.getAllByRole('slider').find(s => (s as HTMLInputElement).max === "120");

    fireEvent.change(slider!, { target: { value: '100' } });
    expect(mockOnChange).toHaveBeenCalledWith({ fov: 100 });
  });

  it('updates frame rate limit', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const selects = screen.getAllByRole('combobox');
    const fpsSelect = selects.find(s => s.innerHTML.includes('120 FPS'));

    fireEvent.change(fpsSelect!, { target: { value: '120' } });
    expect(mockOnChange).toHaveBeenCalledWith({ frameRateLimit: 120 });
  });

  it('updates vsync', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith({ vsync: false });
  });

  it('updates antialiasing', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const selects = screen.getAllByRole('combobox');
    const aaSelect = selects.find(s => s.innerHTML.includes('MSAA'));

    fireEvent.change(aaSelect!, { target: { value: 'msaa' } });
    expect(mockOnChange).toHaveBeenCalledWith({ antialiasing: 'msaa' });
  });

  it('updates texture filtering', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const selects = screen.getAllByRole('combobox');
    const tfSelect = selects.find(s => s.innerHTML.includes('Trilinear'));

    fireEvent.change(tfSelect!, { target: { value: 'trilinear' } });
    expect(mockOnChange).toHaveBeenCalledWith({ textureFiltering: 'trilinear' });
  });

  it('updates anisotropic filtering', () => {
    render(<GraphicsSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    const selects = screen.getAllByRole('combobox');
    const afSelect = selects.find(s => s.innerHTML.includes('16x'));

    fireEvent.change(afSelect!, { target: { value: '16' } });
    expect(mockOnChange).toHaveBeenCalledWith({ anisotropicFiltering: 16 });
  });
});
