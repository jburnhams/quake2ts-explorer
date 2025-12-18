/// <reference lib="webworker" />
import { expose, transfer } from 'comlink';
import {
  parsePcx,
  pcxToRgba,
  parseWal,
  walToRgba,
  parseMd2,
  groupMd2Animations,
  parseMd3,
  parseTga,
  parseWav,
  parseBsp,
} from 'quake2ts/engine';
import { parseSprite } from '../utils/sp2Parser';

const processPcx = (buffer: ArrayBuffer) => {
  const image = parsePcx(buffer);
  const rgba = pcxToRgba(image);
  return transfer({
    type: 'pcx',
    image,
    rgba,
    width: image.width,
    height: image.height
  }, [rgba.buffer as ArrayBuffer]);
};

const processWal = (buffer: ArrayBuffer, palette: Uint8Array | null) => {
  const texture = parseWal(buffer);
  let rgba: Uint8Array | null = null;
  let mipmaps: { width: number; height: number; rgba: Uint8Array }[] = [];
  const transferables: ArrayBuffer[] = [];

  if (palette) {
    const prepared = walToRgba(texture, palette);
    if (prepared.levels && prepared.levels.length > 0) {
        rgba = prepared.levels[0].rgba;
        mipmaps = [...prepared.levels]; // Create mutable copy

        for (const level of prepared.levels) {
            if (level.rgba && level.rgba.buffer) {
                // Cast to ArrayBuffer (quake2ts uses ArrayBuffer, not SharedArrayBuffer)
                transferables.push(level.rgba.buffer as ArrayBuffer);
            }
        }
    }
  }

  return transfer({
    type: 'wal',
    texture,
    rgba,
    width: texture.width,
    height: texture.height,
    mipmaps
  }, transferables);
};

const processTga = (buffer: ArrayBuffer) => {
  const image = parseTga(buffer);
  return transfer({
    type: 'tga',
    image,
    rgba: image.pixels,
    width: image.width,
    height: image.height
  }, [image.pixels.buffer as ArrayBuffer]);
};

const processMd2 = (buffer: ArrayBuffer) => {
  const model = parseMd2(buffer);
  const animations = groupMd2Animations(model.frames);
  return {
    type: 'md2',
    model,
    animations
  };
};

const processMd3 = (buffer: ArrayBuffer) => {
  const model = parseMd3(buffer);
  return {
    type: 'md3',
    model
  };
};

const processSp2 = (buffer: ArrayBuffer) => {
  const model = parseSprite(buffer);
  return {
    type: 'sp2',
    model
  };
};

const processWav = (buffer: ArrayBuffer) => {
  const audio = parseWav(buffer);
  return {
    type: 'wav',
    audio
  };
};

const processBsp = (buffer: ArrayBuffer) => {
  const map = parseBsp(buffer);
  return {
    type: 'bsp',
    map
  };
};

const api = {
  processPcx,
  processWal,
  processTga,
  processMd2,
  processMd3,
  processSp2,
  processWav,
  processBsp
};

export type AssetProcessorApi = typeof api;

expose(api);
