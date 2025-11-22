import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Md2AnimationControls } from '@/src/components/Md2AnimationControls';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Md2Animation, AnimationState } from 'quake2ts/engine';

describe('Md2AnimationControls', () => {
  const mockSetAnimState = jest.fn();
  const mockSetIsPlaying = jest.fn();
  const mockSetAnimSpeed = jest.fn();

  const animations: Md2Animation[] = [
    { name: 'stand', firstFrame: 0, lastFrame: 39 },
    { name: 'run', firstFrame: 40, lastFrame: 45 }
  ];

  const animState: AnimationState = {
    sequence: { name: 'stand', start: 0, end: 39, fps: 9, loop: true },
    time: 0,
    frame: 0,
    nextFrame: 1,
    interpolation: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with animations', () => {
    render(
      <Md2AnimationControls
        animations={animations}
        animState={animState}
        setAnimState={mockSetAnimState}
        isPlaying={true}
        setIsPlaying={mockSetIsPlaying}
        animSpeed={1.0}
        setAnimSpeed={mockSetAnimSpeed}
      />
    );
    expect(screen.getByText(/stand/)).toBeInTheDocument();
    expect(screen.getByText('Pause')).toBeInTheDocument();
    expect(screen.getByText(/Speed:/)).toBeInTheDocument();
  });

  it('handles animation switch', () => {
    render(
      <Md2AnimationControls
        animations={animations}
        animState={animState}
        setAnimState={mockSetAnimState}
        isPlaying={true}
        setIsPlaying={mockSetIsPlaying}
        animSpeed={1.0}
        setAnimSpeed={mockSetAnimSpeed}
      />
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(mockSetAnimState).toHaveBeenCalled();
  });

  it('handles play/pause toggle', () => {
    render(
      <Md2AnimationControls
        animations={animations}
        animState={animState}
        setAnimState={mockSetAnimState}
        isPlaying={true}
        setIsPlaying={mockSetIsPlaying}
        animSpeed={1.0}
        setAnimSpeed={mockSetAnimSpeed}
      />
    );
    fireEvent.click(screen.getByText('Pause'));
    expect(mockSetIsPlaying).toHaveBeenCalledWith(false);
  });

  it('handles speed change', () => {
    render(
      <Md2AnimationControls
        animations={animations}
        animState={animState}
        setAnimState={mockSetAnimState}
        isPlaying={true}
        setIsPlaying={mockSetIsPlaying}
        animSpeed={1.0}
        setAnimSpeed={mockSetAnimSpeed}
      />
    );
    // The first range input is speed (0.1 to 2.0)
    // The second range input is scrub (frame)
    const inputs = screen.getAllByRole('slider');
    fireEvent.change(inputs[0], { target: { value: '1.5' } });
    expect(mockSetAnimSpeed).toHaveBeenCalled();
  });

  it('renders no animations message', () => {
     render(
      <Md2AnimationControls
        animations={[]}
        animState={animState}
        setAnimState={mockSetAnimState}
        isPlaying={true}
        setIsPlaying={mockSetIsPlaying}
        animSpeed={1.0}
        setAnimSpeed={mockSetAnimSpeed}
      />
    );
    expect(screen.getByText('No animations found in model')).toBeInTheDocument();
  });
});
