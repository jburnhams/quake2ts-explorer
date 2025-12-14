import React, { useState, useEffect } from 'react';
import { UniversalViewer } from './UniversalViewer/UniversalViewer';
import { ParsedFile, PakService } from '../services/pakService';
import { ViewerAdapter, AnimationInfo, FrameInfo } from './UniversalViewer/adapters/types';
import './ModelInspector.css';

interface ModelInspectorProps {
  parsedFile: ParsedFile;
  pakService: PakService;
  filePath: string;
}

export function ModelInspector({ parsedFile, pakService, filePath }: ModelInspectorProps) {
  const [adapter, setAdapter] = useState<ViewerAdapter | null>(null);
  const [animations, setAnimations] = useState<AnimationInfo[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);
  const [frameInfo, setFrameInfo] = useState<FrameInfo>({ currentFrame: 0, totalFrames: 0, interpolatedFrame: 0 });
  const [isPlaying, setIsPlaying] = useState(true);

  // Poll for frame info
  useEffect(() => {
    if (!adapter) return;

    let animId: number;
    const updateFrameInfo = () => {
      if (adapter.getFrameInfo) {
        setFrameInfo(adapter.getFrameInfo());
      }
      if (adapter.isPlaying) {
         setIsPlaying(adapter.isPlaying());
      }
      animId = requestAnimationFrame(updateFrameInfo);
    };
    animId = requestAnimationFrame(updateFrameInfo);

    return () => cancelAnimationFrame(animId);
  }, [adapter]);

  const handleAdapterReady = (newAdapter: ViewerAdapter) => {
    setAdapter(newAdapter);
    if (newAdapter.getAnimations) {
      const anims = newAdapter.getAnimations();
      setAnimations(anims);
      if (anims.length > 0) {
        setActiveAnimation(anims[0].name);
      }
    }
  };

  const handleAnimationSelect = (name: string) => {
    if (adapter && adapter.setAnimation) {
      adapter.setAnimation(name);
      setActiveAnimation(name);
      setIsPlaying(true);
      adapter.play?.();
    }
  };

  const togglePlay = () => {
    if (adapter) {
      if (isPlaying) {
        adapter.pause?.();
      } else {
        adapter.play?.();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseFloat(e.target.value);
    if (adapter && adapter.seekFrame) {
      adapter.pause?.();
      setIsPlaying(false);
      adapter.seekFrame(frame);
      // Manually update frame info for responsiveness
      setFrameInfo(prev => ({ ...prev, interpolatedFrame: frame, currentFrame: Math.floor(frame) }));
    }
  };

  const currentAnim = animations.find(a => a.name === activeAnimation);
  const minFrame = currentAnim ? currentAnim.firstFrame : 0;
  const maxFrame = currentAnim ? currentAnim.lastFrame : (frameInfo.totalFrames > 0 ? frameInfo.totalFrames - 1 : 100);

  return (
    <div className="model-inspector">
      <div className="model-inspector-main">
        <div className="model-inspector-sidebar">
          <div className="model-inspector-sidebar-header">Animations</div>
          <div className="model-inspector-animations">
            {animations.map((anim) => (
              <div
                key={anim.name}
                className={`model-inspector-animation-item ${activeAnimation === anim.name ? 'active' : ''}`}
                onClick={() => handleAnimationSelect(anim.name)}
              >
                {anim.name} <small>({anim.lastFrame - anim.firstFrame + 1}f)</small>
              </div>
            ))}
            {animations.length === 0 && <div style={{padding: 10, color: '#888'}}>No animations found</div>}
          </div>
        </div>

        <div className="model-inspector-viewport">
          <UniversalViewer
            parsedFile={parsedFile}
            pakService={pakService}
            filePath={filePath}
            onAdapterReady={handleAdapterReady}
            showControls={false}
          />
        </div>

        <div className="model-inspector-info">
          <h3>Frame Details</h3>
          <div className="model-inspector-prop">
            <label>Current Frame</label>
            <span>{Math.floor(frameInfo.interpolatedFrame)}</span>
          </div>
          <div className="model-inspector-prop">
            <label>Interpolation</label>
            <span>{frameInfo.interpolatedFrame.toFixed(2)}</span>
          </div>
          <div className="model-inspector-prop">
            <label>Total Frames</label>
            <span>{frameInfo.totalFrames}</span>
          </div>

          <h3>Model Info</h3>
          {parsedFile.type === 'md2' && (
            <>
               <div className="model-inspector-prop">
                  <label>Vertices</label>
                  <span>{parsedFile.model.header.numVertices}</span>
               </div>
               <div className="model-inspector-prop">
                  <label>Triangles</label>
                  <span>{parsedFile.model.header.numTriangles}</span>
               </div>
               <div className="model-inspector-prop">
                  <label>Skins</label>
                  <span>{parsedFile.model.header.numSkins}</span>
               </div>
            </>
          )}
          {parsedFile.type === 'md3' && (
             <>
               <div className="model-inspector-prop">
                  <label>Surfaces</label>
                  <span>{parsedFile.model.header.numSurfaces}</span>
               </div>
               <div className="model-inspector-prop">
                  <label>Tags</label>
                  <span>{parsedFile.model.header.numTags}</span>
               </div>
               <div className="model-inspector-prop">
                  <label>Frames</label>
                  <span>{parsedFile.model.header.numFrames}</span>
               </div>
             </>
          )}

          <h3>Animation Info</h3>
          {currentAnim ? (
             <>
                <div className="model-inspector-prop">
                   <label>Name</label>
                   <span>{currentAnim.name}</span>
                </div>
                <div className="model-inspector-prop">
                   <label>Range</label>
                   <span>{currentAnim.firstFrame} - {currentAnim.lastFrame}</span>
                </div>
                <div className="model-inspector-prop">
                   <label>FPS</label>
                   <span>{currentAnim.fps}</span>
                </div>
             </>
          ) : (
             <div style={{color: '#888'}}>No animation selected</div>
          )}
        </div>
      </div>

      <div className="model-inspector-timeline">
        <div className="model-inspector-controls">
          <button onClick={togglePlay}>{isPlaying ? 'Pause' : 'Play'}</button>
        </div>
        <div className="model-inspector-scrubber">
           <input
             type="range"
             min={minFrame}
             max={maxFrame}
             step="0.1"
             value={frameInfo.interpolatedFrame}
             onChange={handleScrub}
           />
        </div>
        <div className="model-inspector-frame-counter">
          {Math.floor(frameInfo.interpolatedFrame)} / {maxFrame}
        </div>
      </div>
    </div>
  );
}
