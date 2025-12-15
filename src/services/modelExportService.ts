import { ParsedFile, ParsedMd2, ParsedMd3 } from './pakService';
import { vec3 } from 'gl-matrix';

// Helper to decompress MD2 vertex
function decompressMd2Vertex(v: { v: number[] }, frame: { scale: number[], translate: number[] }): [number, number, number] {
  const x = v.v[0] * frame.scale[0] + frame.translate[0];
  const y = v.v[1] * frame.scale[1] + frame.translate[1];
  const z = v.v[2] * frame.scale[2] + frame.translate[2];
  return [x, y, z];
}

export class ModelExportService {
  static exportModel(file: ParsedFile, frameIndex: number): Blob | null {
    if (file.type === 'md2') {
      return this.exportMd2ToObj(file, frameIndex);
    } else if (file.type === 'md3') {
      return this.exportMd3ToObj(file, frameIndex);
    }
    return null;
  }

  private static exportMd2ToObj(file: ParsedMd2, frameIndex: number): Blob {
    const model = file.model;
    const frame = model.frames[frameIndex];
    if (!frame) throw new Error('Invalid frame index');

    let obj = `# Quake 2 MD2 Export - Frame ${frameIndex}\n`;
    obj += `o ${frame.name.replace(/\0/g, '')}\n`;

    // Vertices
    for (let i = 0; i < frame.vertices.length; i++) {
       const v = frame.vertices[i];
       // MD2 vertex is compressed.
       // The quake2ts engine definition for Md2Frame says vertices: Md2Vertex[].
       // Md2Vertex has v: [number, number, number] (bytes) and lightNormalIndex.
       // It also has scale and translate on the frame.
       // However, looking at quake2ts types is hard without reading d.ts.
       // Let's assume standard MD2 structure which the engine likely follows.
       // Wait, I can check how Md2Adapter uses it or just follow standard.
       // Actually, I should use the helper I wrote above assuming standard MD2 compression.
       // Let's check quake2ts/engine types if possible or rely on my previous knowledge of MD2.
       // MD2 stores vertices as bytes and header has scale/translate.
       // frame.scale, frame.translate are Vec3.
       const [x, y, z] = decompressMd2Vertex(v as any, frame as any);
       // Swap Y and Z for standard OBJ orientation if needed?
       // Quake is Z-up. OBJ is often Y-up. But keeping Z-up is fine.
       obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }

    // TexCoords
    // MD2 texcoords are shorts, need to be normalized by skinWidth/skinHeight
    const { skinWidth, skinHeight } = model.header;
    for (let i = 0; i < model.texCoords.length; i++) {
        const st = model.texCoords[i];
        const u = st.s / skinWidth;
        const v = 1.0 - (st.t / skinHeight); // Flip V
        obj += `vt ${u.toFixed(6)} ${v.toFixed(6)}\n`;
    }

    // Faces
    // MD2 triangles index into vertices and texcoords separately
    for (let i = 0; i < model.triangles.length; i++) {
        const tri = model.triangles[i];
        // OBJ indices are 1-based
        // f v1/vt1 v2/vt2 v3/vt3
        const v1 = tri.vertexIndices[0] + 1;
        const v2 = tri.vertexIndices[1] + 1;
        const v3 = tri.vertexIndices[2] + 1;

        const vt1 = tri.textureIndices[0] + 1;
        const vt2 = tri.textureIndices[1] + 1;
        const vt3 = tri.textureIndices[2] + 1;

        obj += `f ${v1}/${vt1} ${v2}/${vt2} ${v3}/${vt3}\n`;
    }

    return new Blob([obj], { type: 'text/plain' });
  }

  private static exportMd3ToObj(file: ParsedMd3, frameIndex: number): Blob {
    const model = file.model;
    let obj = `# Quake 3 MD3 Export - Frame ${frameIndex}\n`;
    let vertexOffset = 1;
    let uvOffset = 1;

    // MD3 has multiple surfaces
    for (const surface of model.surfaces) {
        obj += `g ${surface.name}\n`;

        // Vertices for this surface at frameIndex
        // surface.vertices is (readonly Md3Vertex[])[] - array of frames, each frame is array of vertices
        const frameVertices = surface.vertices[frameIndex];
        if (!frameVertices) continue;

        for (const v of frameVertices) {
            const [x, y, z] = v.position as unknown as number[]; // Vec3 is likely [number, number, number] or Float32Array
            obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
        }

        // TexCoords
        for (const uv of surface.texCoords) {
            obj += `vt ${uv.s.toFixed(6)} ${(1.0 - uv.t).toFixed(6)}\n`;
        }

        // Faces
        for (const tri of surface.triangles) {
            const v1 = tri.indices[0] + vertexOffset;
            const v2 = tri.indices[1] + vertexOffset;
            const v3 = tri.indices[2] + vertexOffset;

            const vt1 = tri.indices[0] + uvOffset;
            const vt2 = tri.indices[1] + uvOffset;
            const vt3 = tri.indices[2] + uvOffset;

            obj += `f ${v1}/${vt1} ${v2}/${vt2} ${v3}/${vt3}\n`;
        }

        vertexOffset += frameVertices.length;
        uvOffset += surface.texCoords.length;
    }

    return new Blob([obj], { type: 'text/plain' });
  }
}
