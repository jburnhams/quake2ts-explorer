import { type SpriteModel, type SpriteFrame } from 'quake2ts/engine';

export function parseSprite(buffer: ArrayBuffer): SpriteModel {
    const view = new DataView(buffer);
    let offset = 0;

    const ident = view.getInt32(offset, true);
    offset += 4;

    // Check magic 'IDS2' (0x32534449)
    if (ident !== 0x32534449) {
        throw new Error(`Invalid SP2 identifier: 0x${ident.toString(16)}`);
    }

    const version = view.getInt32(offset, true);
    offset += 4;

    if (version !== 2) {
        throw new Error(`Unsupported SP2 version: ${version}`);
    }

    const numFrames = view.getInt32(offset, true);
    offset += 4;

    const frames: SpriteFrame[] = [];
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < numFrames; i++) {
        const width = view.getInt32(offset, true);
        offset += 4;
        const height = view.getInt32(offset, true);
        offset += 4;
        const originX = view.getInt32(offset, true);
        offset += 4;
        const originY = view.getInt32(offset, true);
        offset += 4;

        // Name is 64 bytes, null terminated
        const nameBytes = new Uint8Array(buffer, offset, 64);
        let nameLength = 0;
        while (nameLength < 64 && nameBytes[nameLength] !== 0) {
            nameLength++;
        }
        const name = decoder.decode(nameBytes.slice(0, nameLength));
        offset += 64;

        frames.push({
            width,
            height,
            originX,
            originY,
            name
        });
    }

    return {
        ident,
        version,
        numFrames,
        frames
    };
}
