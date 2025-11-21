import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  createWebGLContext,
  Md2Pipeline,
  buildMd2Geometry,
  Md2MeshBuffers,
  Camera,
  createAnimationState,
  advanceAnimation,
  computeFrameBlend,
  parsePcx,
  pcxToRgba,
  Texture2D,
} from 'quake2ts';
import type { Md2Model, Md2Animation, AnimationState } from 'quake2ts';
import { mat4 as mat4Utils } from 'quake2ts';
import type { vec3 } from 'quake2ts';
import { Md2CameraControls } from './Md2CameraControls';
import { Md2AnimationControls } from './Md2AnimationControls';
import { computeCameraPosition } from '../utils/cameraUtils';
import '../styles/md2Viewer.css';

interface Md2ViewerProps {
  model: Md2Model;
  animations: Md2Animation[];
  skinPath?: string;
  hasFile: (path: string) => boolean;
  loadFile: (path: string) => Promise<Uint8Array>;
}

interface OrbitState {
  radius: number;
  theta: number;
  phi: number;
  target: vec3;
  panOffset: vec3;
}

const initialOrbitState: OrbitState = {
  radius: 100,
  theta: 0,
  phi: Math.PI / 4,
  target: [0, 0, 0],
  panOffset: [0, 0, 0],
};

export function Md2Viewer({
  model,
  animations,
  skinPath: initialSkinPath,
  hasFile,
  loadFile,
}: Md2ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [orbit, setOrbit] = useState<OrbitState>(initialOrbitState);
  const [isDragging, setIsDragging] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [skinTexture, setSkinTexture] = useState<Texture2D | null>(null);
  const [skinPath, setSkinPath] = useState(initialSkinPath);
  const [skinIndex, setSkinIndex] = useState(0);

  const [currentAnimIndex, setCurrentAnimIndex] = useState(0);
  const [animState, setAnimState] = useState<AnimationState>(() =>
    createAnimationState(animations[currentAnimIndex], 0)
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [animSpeed, setAnimSpeed] = useState(1.0);

  const stateRef = useRef({
    orbit,
    isDragging,
    autoRotate,
    animState,
    isPlaying,
    animSpeed,
    skinTexture,
  });
  stateRef.current = {
    orbit,
    isDragging,
    autoRotate,
    animState,
    isPlaying,
    animSpeed,
    skinTexture,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const { gl, state } = createWebGLContext(canvas, {
      alpha: false,
      depth: true,
      antialias: true,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    const camera = new Camera();
    camera.fov = 60;
    camera.aspect = canvas.width / canvas.height;
    camera.near = 0.1;
    camera.far = 1000;

    const pipeline = new Md2Pipeline(gl);
    const geometry = buildMd2Geometry(model);
    const meshBuffers = new Md2MeshBuffers(gl, model, {
      currentFrame: 0,
      nextFrame: 0,
      lerp: 0,
    });

    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDragging) return;
      setOrbit((prev) => ({
        ...prev,
        theta: prev.theta + e.movementX * 0.01,
        phi: Math.max(
          0.1,
          Math.min(Math.PI - 0.1, prev.phi - e.movementY * 0.01)
        ),
      }));
    };
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setOrbit((prev) => ({
        ...prev,
        radius: Math.max(10, Math.min(500, prev.radius + e.deltaY * 0.1)),
      }));
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel);

    let animationFrameId: number;
    let lastTime = performance.now();
    const render = (currentTime: number) => {
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (stateRef.current.isPlaying) {
        setAnimState((prev) => advanceAnimation(prev, deltaSeconds * stateRef.current.animSpeed));
      }

      if (stateRef.current.autoRotate) {
        setOrbit((prev) => ({
          ...prev,
          theta: (prev.theta + 0.5 * deltaSeconds) % (Math.PI * 2),
        }));
      }

      gl.clearColor(0.15, 0.15, 0.2, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      const frameBlend = computeFrameBlend(stateRef.current.animState);
      meshBuffers.update(model, frameBlend);

      const eye = computeCameraPosition(stateRef.current.orbit);
      mat4Utils.lookAt(camera.viewMatrix, eye, stateRef.current.orbit.target, [0, 1, 0]);

      const projection = camera.projectionMatrix;
      const view = camera.viewMatrix;
      const mvp = mat4Utils.create();
      mat4Utils.multiply(mvp, projection, view);

      if (stateRef.current.skinTexture) {
        gl.activeTexture(gl.TEXTURE0);
        stateRef.current.skinTexture.bind();
      }

      pipeline.bind({
        modelViewProjection: mvp,
        lightDirection: [0.5, 1.0, 0.3],
        tint: [1.0, 1.0, 1.0, 1.0],
        diffuseSampler: 0,
      });

      meshBuffers.bind();
      gl.drawElements(gl.TRIANGLES, geometry.indices.length, gl.UNSIGNED_SHORT, 0);

      animationFrameId = requestAnimationFrame(render);
    };
    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [model, hasFile, loadFile]);

  useEffect(() => {
    async function loadSkin() {
      if (!skinPath || !hasFile(skinPath)) {
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const { gl } = createWebGLContext(canvas);
      if (!gl) {
        return;
      }
      const data = await loadFile(skinPath);
      const pcx = parsePcx(data.buffer);
      const rgba = pcxToRgba(pcx);
      const texture = new Texture2D(gl);
      texture.upload({
        width: pcx.width,
        height: pcx.height,
        data: rgba,
        format: gl.RGBA,
        type: gl.UNSIGNED_BYTE,
        minFilter: gl.LINEAR_MIPMAP_LINEAR,
        magFilter: gl.LINEAR,
        wrapS: gl.REPEAT,
        wrapT: gl.REPEAT,
        generateMipmaps: true,
      });
      setSkinTexture(texture);
    }
    loadSkin();
  }, [skinPath, hasFile, loadFile]);

  const handleResetCamera = () => {
    setOrbit(initialOrbitState);
  };

  const handleRadiusChange = (radius: number) => {
    setOrbit((prev) => ({ ...prev, radius }));
  };

  const handleAnimationChange = (index: number) => {
    setCurrentAnimIndex(index);
    setAnimState(createAnimationState(animations[index], 0));
  };

  const handleScrub = (time: number) => {
    setAnimState((prev) => ({ ...prev, time }));
  };

  const handleSkinChange = (index: number) => {
    setSkinIndex(index);
    setSkinPath(model.skins[index].name);
  };

  return (
    <div className="md2-viewer">
      <div className="md2-canvas-container">
        <canvas ref={canvasRef} className="md2-viewer-canvas" />
      </div>
      <div className="md2-controls-panel">
        <Md2AnimationControls
          animations={animations}
          currentAnimIndex={currentAnimIndex}
          animState={animState}
          isPlaying={isPlaying}
          animSpeed={animSpeed}
          onAnimationChange={handleAnimationChange}
          onPlayingChange={setIsPlaying}
          onAnimSpeedChange={setAnimSpeed}
          onScrub={handleScrub}
        />
        <Md2CameraControls
          radius={orbit.radius}
          autoRotate={autoRotate}
          onReset={handleResetCamera}
          onRadiusChange={handleRadiusChange}
          onAutoRotateChange={setAutoRotate}
        />
        {model.skins.length > 1 && (
          <div className="md2-skin-controls">
            <select
              value={skinIndex}
              onChange={(e) => handleSkinChange(parseInt(e.target.value))}
            >
              {model.skins.map((skin, i) => (
                <option key={i} value={i}>
                  {skin.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
