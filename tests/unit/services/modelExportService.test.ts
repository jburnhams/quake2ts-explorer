import { ModelExportService } from '@/src/services/modelExportService';
import { ParsedMd2, ParsedMd3 } from '@/src/services/pakService';

describe('ModelExportService', () => {
  describe('MD2 Export', () => {
    it('should export MD2 frame to OBJ', (done) => {
      const mockMd2: ParsedMd2 = {
        type: 'md2',
        animations: [],
        model: {
          header: {
            ident: 0, version: 8, skinWidth: 256, skinHeight: 256, frameSize: 0,
            numSkins: 1, numVertices: 3, numTexCoords: 3, numTriangles: 1, numGlCommands: 0, numFrames: 1,
            ofsSkins: 0, ofsTexCoords: 0, ofsTriangles: 0, ofsFrames: 0, ofsGlCommands: 0, ofsEnd: 0
          },
          skins: [],
          texCoords: [
            { s: 0, t: 0 },
            { s: 128, t: 0 },
            { s: 0, t: 128 }
          ],
          triangles: [
            { vertexIndices: [0, 1, 2], textureIndices: [0, 1, 2] }
          ],
          frames: [
            {
              scale: [1, 1, 1],
              translate: [0, 0, 0],
              name: 'frame1',
              vertices: [
                { v: [10, 0, 0], lightNormalIndex: 0 },
                { v: [0, 10, 0], lightNormalIndex: 0 },
                { v: [0, 0, 10], lightNormalIndex: 0 }
              ]
            } as any
          ]
        }
      };

      const blob = ModelExportService.exportModel(mockMd2, 0);
      expect(blob).not.toBeNull();

      const reader = new FileReader();
      reader.readAsText(blob!);
      reader.onload = () => {
        try {
          const text = reader.result as string;
          expect(text).toContain('o frame1');
          // Check vertices (uncompressed)
          expect(text).toContain('v 10.000000 0.000000 0.000000');
          expect(text).toContain('v 0.000000 10.000000 0.000000');
          expect(text).toContain('v 0.000000 0.000000 10.000000');

          // Check texcoords (normalized)
          expect(text).toContain('vt 0.000000 1.000000'); // flipped V
          expect(text).toContain('vt 0.500000 1.000000');
          expect(text).toContain('vt 0.000000 0.500000');

          // Check face
          expect(text).toContain('f 1/1 2/2 3/3');
          done();
        } catch (error) {
          done(error);
        }
      };
      reader.onerror = () => done(new Error('FileReader error'));
    });
  });

  describe('MD3 Export', () => {
    it('should export MD3 frame to OBJ', (done) => {
      const mockMd3: ParsedMd3 = {
        type: 'md3',
        model: {
          header: {
             ident: 0, version: 15, name: 'test', flags: 0,
             numFrames: 1, numTags: 0, numSurfaces: 1, numSkins: 0,
             ofsFrames: 0, ofsTags: 0, ofsSurfaces: 0, ofsEnd: 0
          },
          frames: [
             { minBounds: [0,0,0], maxBounds: [0,0,0], localOrigin: [0,0,0], radius: 0, name: 'frame1' } as any
          ],
          tags: [],
          surfaces: [
             {
               name: 'surface1',
               flags: 0, numFrames: 1, shaders: [],
               triangles: [{ indices: [0, 1, 2] }],
               texCoords: [{s: 0, t: 0}, {s: 1, t: 0}, {s: 0, t: 1}],
               vertices: [
                 // Frame 0 vertices
                 [
                   { position: [10, 0, 0], normal: [0,0,0], latLng: 0 },
                   { position: [0, 10, 0], normal: [0,0,0], latLng: 0 },
                   { position: [0, 0, 10], normal: [0,0,0], latLng: 0 }
                 ] as any
               ]
             } as any
          ]
        }
      };

      const blob = ModelExportService.exportModel(mockMd3, 0);
      expect(blob).not.toBeNull();

      const reader = new FileReader();
      reader.readAsText(blob!);
      reader.onload = () => {
        try {
          const text = reader.result as string;
          expect(text).toContain('g surface1');
          expect(text).toContain('v 10.000000 0.000000 0.000000');
          expect(text).toContain('vt 0.000000 1.000000');
          expect(text).toContain('f 1/1 2/2 3/3');
          done();
        } catch (error) {
          done(error);
        }
      };
      reader.onerror = () => done(new Error('FileReader error'));
    });
  });
});
