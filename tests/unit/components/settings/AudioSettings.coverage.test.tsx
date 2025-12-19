import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioSettingsTab } from '@/src/components/settings/AudioSettings';
import { AudioSettings } from '@/src/types/settings';

describe('AudioSettingsTab', () => {
  const mockSettings: AudioSettings = {
    masterVolume: 0.8,
    sfxVolume: 1.0,
    musicVolume: 0.5,
    spatialAudio: true,
    audioQuality: 'high',
    channels: 2,
    sampleRate: 44100
  };

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all settings controls', () => {
    render(<AudioSettingsTab settings={mockSettings} onChange={mockOnChange} />);

    expect(screen.getByText('Master Volume')).toBeInTheDocument();
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Spatial Audio')).toBeInTheDocument();
    expect(screen.getByText('Audio Quality')).toBeInTheDocument();
  });

  it('updates master volume', () => {
    render(<AudioSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const sliders = screen.getAllByRole('slider');
    // Assuming order or finding by context, but order is master, sfx, music
    fireEvent.change(sliders[0], { target: { value: '0.9' } });
    expect(mockOnChange).toHaveBeenCalledWith({ masterVolume: 0.9 });
  });

  it('updates sfx volume', () => {
    render(<AudioSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[1], { target: { value: '0.4' } });
    expect(mockOnChange).toHaveBeenCalledWith({ sfxVolume: 0.4 });
  });

  it('updates music volume', () => {
    render(<AudioSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[2], { target: { value: '0.2' } });
    expect(mockOnChange).toHaveBeenCalledWith({ musicVolume: 0.2 });
  });

  it('updates spatial audio', () => {
    render(<AudioSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockOnChange).toHaveBeenCalledWith({ spatialAudio: false });
  });

  it('updates audio quality', () => {
    render(<AudioSettingsTab settings={mockSettings} onChange={mockOnChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'low' } });
    expect(mockOnChange).toHaveBeenCalledWith({ audioQuality: 'low' });
  });
});
