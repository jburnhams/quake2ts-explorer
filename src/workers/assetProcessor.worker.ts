import {
  Md2Model,
  Md3Model,
  Texture2D,
  parseMd2,
  parseMd3,
  parsePcx,
  pcxToRgba,
  parseWal,
  walToRgba,
  parseTga,
  parseWav,
  parseBsp,
  type TextureLevel,
  groupMd2Animations
} from '@quake2ts/engine';
import { parseSprite } from '../utils/sp2Parser';
import { expose, transfer } from 'comlink';

/**
 * Worker to process assets off the main thread.
 * This handles parsing textures, models, and sounds.
 */

const processor = {
  processPcx(buffer: ArrayBuffer) {
      const image = parsePcx(buffer as ArrayBuffer);
      const rgba = pcxToRgba(image);
      const tList: ArrayBuffer[] = [];
      if (!(rgba.buffer instanceof SharedArrayBuffer)) {
          tList.push(rgba.buffer as ArrayBuffer);
      }
      return transfer({
          type: 'pcx',
          width: image.width,
          height: image.height,
          rgba,
          image // raw image struct if needed
      }, tList);
  },

  processWal(buffer: ArrayBuffer, palette: Uint8Array | null) {
      const texture = parseWal(buffer as ArrayBuffer);
      let rgba: Uint8Array | null = null;
      let mipmaps: TextureLevel[] = [];
      const transferList: ArrayBuffer[] = [];

      if (palette) {
          const prepared = walToRgba(texture, palette);
          rgba = prepared.levels[0]?.rgba ?? null;
          // Create mutable copy of readonly array if needed, or cast if Comlink handles it.
          mipmaps = [...prepared.levels];

          if (rgba && !(rgba.buffer instanceof SharedArrayBuffer)) {
             transferList.push(rgba.buffer as ArrayBuffer);
          }
          mipmaps.forEach(level => {
              if (level.rgba && !(level.rgba.buffer instanceof SharedArrayBuffer)) {
                  transferList.push(level.rgba.buffer as ArrayBuffer);
              }
          });
      }

      return transfer({
          type: 'wal',
          texture,
          rgba,
          width: texture.width,
          height: texture.height,
          mipmaps
      }, transferList);
  },

  processTga(buffer: ArrayBuffer) {
      // engine.parseTga expects ArrayBuffer.
      const image = parseTga(buffer as ArrayBuffer);

      // image.pixels is Uint8Array RGBA
      const isShared = image.pixels.buffer instanceof SharedArrayBuffer;
      const tList = isShared ? [] : [image.pixels.buffer as ArrayBuffer];

      return transfer({
          type: 'tga',
          image,
          rgba: image.pixels,
          width: image.width,
          height: image.height
      }, tList);
  },

  processMd2(buffer: ArrayBuffer) {
      const model = parseMd2(buffer as ArrayBuffer);
      // Attempt to group animations
      const animations = groupMd2Animations(model.frames);
      return {
          type: 'md2',
          model,
          animations
      };
  },

  processMd3(buffer: ArrayBuffer) {
      const model = parseMd3(buffer as ArrayBuffer);
      return {
          type: 'md3',
          model
      };
  },

  processSp2(buffer: ArrayBuffer) {
      const model = parseSprite(buffer);
      return {
          type: 'sp2',
          model
      };
  },

  processWav(buffer: ArrayBuffer) {
      const audio = parseWav(buffer as ArrayBuffer);
      // Audio samples are in audio.samples (TypedArray).
      const isShared = audio.samples.buffer instanceof SharedArrayBuffer;
      const tList = isShared ? [] : [audio.samples.buffer as ArrayBuffer];

      return transfer({
          type: 'wav',
          audio
      }, tList);
  },

  processBsp(buffer: ArrayBuffer) {
      const map = parseBsp(buffer as ArrayBuffer);
      return {
          type: 'bsp',
          map
      };
  }
};

expose(processor);

export type AssetProcessor = typeof processor;
