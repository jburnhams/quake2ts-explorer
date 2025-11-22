import React, { useState } from 'react';
import { Md2Animation, AnimationState, createAnimationState, AnimationSequence } from 'quake2ts/engine';

interface Md2AnimationControlsProps {
  animations: Md2Animation[];
  animState: AnimationState;
  setAnimState: (state: AnimationState) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  animSpeed: number;
  setAnimSpeed: (speed: number) => void;
}

export function Md2AnimationControls({
  animations,
  animState,
  setAnimState,
  isPlaying,
  setIsPlaying,
  animSpeed,
  setAnimSpeed,
}: Md2AnimationControlsProps) {
  const [currentAnimIndex, setCurrentAnimIndex] = useState(0);

  const switchAnimation = (index: number) => {
    setCurrentAnimIndex(index);
    const anim = animations[index];
    const sequence: AnimationSequence = {
      name: anim.name,
      start: anim.firstFrame,
      end: anim.lastFrame,
      fps: 9,
      loop: true
    };
    setAnimState(createAnimationState(sequence));
  };

  const scrubToFrame = (time: number) => {
    setAnimState({ ...animState, time });
  };

  if (animations.length === 0) {
    return (
      <div className="md2-control-group">
        <span>No animations found in model</span>
      </div>
    );
  }

  return (
    <div className="md2-control-group">
      <select
        value={currentAnimIndex}
        onChange={(e) => switchAnimation(parseInt(e.target.value, 10))}
      >
        {animations.map((anim, i) => (
          <option key={i} value={i}>
            {anim.name} ({anim.firstFrame}-{anim.lastFrame})
          </option>
        ))}
      </select>

      <button onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <input
        type="range"
        min="0.1"
        max="2.0"
        step="0.1"
        value={animSpeed}
        onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
      />
      <span>Speed: {animSpeed.toFixed(1)}x</span>

      <input
        type="range"
        min={animations[currentAnimIndex].firstFrame}
        max={animations[currentAnimIndex].lastFrame}
        step="0.1"
        value={animState.time}
        onChange={(e) => scrubToFrame(parseFloat(e.target.value))}
        />
    </div>
  );
}