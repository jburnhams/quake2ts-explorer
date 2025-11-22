import React, { useEffect, useRef, useState } from 'react';
import {
  Md2Model,
  Md2Animation,
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
  mat4,
  vec3,
  Md2FrameBlend
} from 'quake2ts';
import { Md2AnimationControls } from './Md2AnimationControls';
import { Md2CameraControls } from './Md2CameraControls';
import { computeCameraPosition, OrbitState } from '../utils/cameraUtils';

export interface Md2ViewerProps {
  model: Md2Model;
  animations: Md2Animation[];
  skinPath?: string;
  hasFile: (path: string) => boolean;
  loadFile: (path: string) => Promise<Uint8Array>;
}

export function Md2Viewer({ model, animations, skinPath, hasFile, loadFile }: Md2ViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [glContext, setGlContext] = useState<{ gl: WebGL2RenderingContext; state: any } | null>(null);
  const [pipeline, setPipeline] = useState<Md2Pipeline | null>(null);
  const [meshBuffers, setMeshBuffers] = useState<Md2MeshBuffers | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [skinTexture, setSkinTexture] = useState<Texture2D | null>(null);

  const [orbit, setOrbit] = useState<OrbitState>({
    radius: 100,
    theta: 0,
    phi: Math.PI / 4,
    target: [0, 0, 24] as vec3,
  });
  const [autoRotate, setAutoRotate] = useState(false);

  const [animState, setAnimState] = useState(() => createAnimationState(animations[0], 0));
  const [isPlaying, setIsPlaying] = useState(true);
  const [animSpeed, setAnimSpeed] = useState(1.0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const context = createWebGLContext(canvasRef.current, {
      alpha: false,
      depth: true,
      antialias: true,
      preserveDrawingBuffer: false
    });
    setGlContext(context);

    const { gl } = context;
    setPipeline(new Md2Pipeline(gl));

    const initialBlend: Md2FrameBlend = { currentFrame: 0, nextFrame: 0, lerp: 0.0 };
    setMeshBuffers(new Md2MeshBuffers(gl, model, initialBlend));

    const newCamera = new Camera();
    newCamera.setFov(60);
    newCamera.setNear(0.1);
    newCamera.setFar(1000);
    setCamera(newCamera);

  }, [model]);

  useEffect(() => {
    if (!skinPath || !glContext || !hasFile(skinPath)) return;

    let isCancelled = false;
    const { gl } = glContext;

    async function loadSkin() {
      const data = await loadFile(skinPath);
      if (isCancelled) return;

      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const pcx = parsePcx(buffer);
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
        generateMipmaps: true
      });
      setSkinTexture(texture);
    }

    loadSkin();

    return () => { isCancelled = true; };
  }, [skinPath, glContext, hasFile, loadFile]);

  useEffect(() => {
    if (!isPlaying) return;
    let lastTime = performance.now();
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      const deltaSeconds = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      setAnimState(prevState => advanceAnimation(prevState, deltaSeconds * animSpeed));
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, animSpeed]);

  useEffect(() => {
    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const delta = currentTime - lastTime;
      lastTime = currentTime;

      if (autoRotate) {
        setOrbit(prev => ({ ...prev, theta: (prev.theta + delta * 0.0005) % (Math.PI * 2) }));
      }

      if (!glContext || !pipeline || !meshBuffers || !camera) return;
      const { gl } = glContext;

      gl.clearColor(0.15, 0.15, 0.2, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);

      const frameBlend = computeFrameBlend(animState);
      meshBuffers.update(model, frameBlend);

      const eye = computeCameraPosition(orbit);
      const view = mat4.lookAt(eye, orbit.target, [0, 1, 0] as vec3);
      const projection = camera.getProjectionMatrix();
      const mvp = mat4.multiply(projection, view);

      if (skinTexture) {
        gl.activeTexture(gl.TEXTURE0);
        skinTexture.bind();
      }

      pipeline.bind({
        modelViewProjection: mvp,
        lightDirection: [0.5, 1.0, 0.3],
        tint: [1.0, 1.0, 1.0, 1.0],
        diffuseSampler: 0
      });

      meshBuffers.bind();
      gl.drawElements(gl.TRIANGLES, meshBuffers.indexCount, gl.UNSIGNED_SHORT, 0);
    };

    const frameId = requestAnimationFrame(function loop(currentTime: number) {
      render(currentTime);
      requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(frameId);
  }, [glContext, pipeline, meshBuffers, camera, orbit, animState, skinTexture, model, autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !camera) return;

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      glContext?.gl.viewport(0, 0, canvas.width, canvas.height);
      camera.setAspect(canvas.width / canvas.height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef, camera, glContext]);

  return (
    <div className="md2-viewer">
      <div className="md2-canvas-container">
        <canvas ref={canvasRef} className="md2-viewer-canvas" />
      </div>
      <div className="md2-controls-panel">
        <Md2AnimationControls
            animations={animations}
            animState={animState}
            setAnimState={setAnimState}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            animSpeed={animSpeed}
            setAnimSpeed={setAnimSpeed}
        />
        <Md2CameraControls
            orbit={orbit}
            setOrbit={setOrbit}
            autoRotate={autoRotate}
            setAutoRotate={setAutoRotate}
        />
      </div>
    </div>
  );
}