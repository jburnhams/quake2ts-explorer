import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Md2CameraControls } from '@/src/components/Md2CameraControls';
import { OrbitState } from '@/src/utils/cameraUtils';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Md2CameraControls', () => {
  const mockSetOrbit = jest.fn();
  const mockSetAutoRotate = jest.fn();
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
        autoRotate={false}
        setAutoRotate={mockSetAutoRotate}
      />
    );
    expect(screen.getByText('Reset Camera')).toBeInTheDocument();
    expect(screen.getByText(/Distance:/)).toBeInTheDocument();
    expect(screen.getByLabelText('Auto-rotate')).toBeInTheDocument();
  });

  it('handles reset camera', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
        autoRotate={false}
        setAutoRotate={mockSetAutoRotate}
      />
    );
    fireEvent.click(screen.getByText('Reset Camera'));
    expect(mockSetOrbit).toHaveBeenCalled();
  });

  it('handles auto-rotate toggle', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
        autoRotate={false}
        setAutoRotate={mockSetAutoRotate}
      />
    );
    fireEvent.click(screen.getByLabelText('Auto-rotate'));
    expect(mockSetAutoRotate).toHaveBeenCalledWith(true);
  });

  it('handles distance change', () => {
    render(
      <Md2CameraControls
        orbit={orbit}
        setOrbit={mockSetOrbit}
        autoRotate={false}
        setAutoRotate={mockSetAutoRotate}
      />
    );
    const range = screen.getByLabelText(/Distance:/);
    fireEvent.change(range, { target: { value: '200' } });
    expect(mockSetOrbit).toHaveBeenCalled();
  });
});
