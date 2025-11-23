import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Md2CameraControls } from '@/src/components/Md2CameraControls';
import { OrbitState } from '@/src/utils/cameraUtils';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Md2CameraControls', () => {
  const mockSetOrbit = jest.fn();
  const orbit: OrbitState = {
    radius: 100,
    theta: 0,
    phi: 0,
    target: [0, 0, 0]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
      />
    );
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Move / Zoom')).toBeInTheDocument();
    expect(screen.getByText('Rotate')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom In')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom Out')).toBeInTheDocument();
  });

  it('handles reset camera', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
      />
    );
    fireEvent.click(screen.getByText('Reset'));
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('handles zoom in', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
      />
    );
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('handles zoom out', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
      />
    );
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('handles rotation', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
      />
    );
    fireEvent.click(screen.getByTitle('Rotate Left'));
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('handles panning', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
      />
    );
    fireEvent.click(screen.getByTitle('Pan Left'));
    expect(mockSetOrbit).toHaveBeenCalled();
  });
});
