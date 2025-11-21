import React from 'react';
import type { Md2Animation, AnimationState } from 'quake2ts';

interface Md2AnimationControlsProps {
  animations: Md2Animation[];
  currentAnimIndex: number;
  animState: AnimationState;
  isPlaying: boolean;
  animSpeed: number;
  onAnimationChange: (index: number) => void;
  onPlayingChange: (isPlaying: boolean) => void;
  onAnimSpeedChange: (speed: number) => void;
  onScrub: (time: number) => void;
}

export function Md2AnimationControls({
  animations,
  currentAnimIndex,
  animState,
  isPlaying,
  animSpeed,
  onAnimationChange,
  onPlayingChange,
  onAnimSpeedChange,
  onScrub,
}: Md2AnimationControlsProps) {
  const currentAnim = animations[currentAnimIndex];

  return (
    <div className="md2-animation-controls">
      <select
        value={currentAnimIndex}
        onChange={(e) => onAnimationChange(parseInt(e.target.value))}
      >
        {animations.map((anim, i) => (
          <option key={i} value={i}>
            {anim.name} ({anim.firstFrame}-{anim.lastFrame})
          </option>
        ))}
      </select>
      <button onClick={() => onPlayingChange(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min="0"
        max="2"
        step="0.1"
        value={animSpeed}
        onChange={(e) => onAnimSpeedChange(parseFloat(e.target.value))}
      />
      <span>Speed: {animSpeed.toFixed(2)}x</span>
      <input
        type="range"
        min={currentAnim.firstFrame}
        max={currentAnim.lastFrame}
        step="0.1"
        value={animState.time}
        onChange={(e) => onScrub(parseFloat(e.target.value))}
      />
    </div>
  );
}
