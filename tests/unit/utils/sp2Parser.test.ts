import { describe, it, expect } from '@jest/globals';
import { parseSprite } from '@/src/utils/sp2Parser';

describe('sp2Parser', () => {
  it('parses a valid SP2 file', () => {
    const buffer = new ArrayBuffer(92);
    const view = new DataView(buffer);
    let offset = 0;

    // ident: 'IDS2' -> 0x32534449
    view.setInt32(offset, 0x32534449, true);
    offset += 4;

    // version: 2
    view.setInt32(offset, 2, true);
    offset += 4;

    // numFrames: 1
    view.setInt32(offset, 1, true);
    offset += 4;

    // Frame 1
    // width
    view.setInt32(offset, 32, true);
    offset += 4;
    // height
    view.setInt32(offset, 32, true);
    offset += 4;
    // originX
    view.setInt32(offset, 16, true);
    offset += 4;
    // originY
    view.setInt32(offset, 16, true);
    offset += 4;
    // name
    const name = 'test_frame';
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(name);
    for (let i = 0; i < nameBytes.length; i++) {
      view.setUint8(offset + i, nameBytes[i]);
    }
    offset += 64;

    const sprite = parseSprite(buffer);

    expect(sprite.ident).toBe(0x32534449);
    expect(sprite.version).toBe(2);
    expect(sprite.numFrames).toBe(1);
    expect(sprite.frames).toHaveLength(1);
    expect(sprite.frames[0].width).toBe(32);
    expect(sprite.frames[0].height).toBe(32);
    expect(sprite.frames[0].originX).toBe(16);
    expect(sprite.frames[0].originY).toBe(16);
    expect(sprite.frames[0].name).toBe('test_frame');
  });

  it('throws on invalid identifier', () => {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setInt32(0, 0x12345678, true); // Invalid ident

    expect(() => parseSprite(buffer)).toThrow('Invalid SP2 identifier');
  });

  it('throws on unsupported version', () => {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setInt32(0, 0x32534449, true); // Valid ident
    view.setInt32(4, 1, true); // Invalid version

    expect(() => parseSprite(buffer)).toThrow('Unsupported SP2 version: 1');
  });
});
