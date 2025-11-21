// Mock for quake2ts/engine module

export class MockPakArchive {
  name: string;
  entries: Map<string, { name: string; offset: number; length: number }>;
  checksum: number;
  size: number;

  constructor(name: string, entries: Array<{ name: string; offset: number; length: number }>) {
    this.name = name;
    this.entries = new Map(entries.map(e => [e.name, e]));
    this.checksum = 12345;
    this.size = 1024;
  }

  static fromArrayBuffer(name: string, _buffer: ArrayBuffer) {
    return new MockPakArchive(name, [
      { name: 'test.txt', offset: 0, length: 100 },
      { name: 'pics/test.pcx', offset: 100, length: 200 },
      { name: 'models/test.md2', offset: 300, length: 500 },
    ]);
  }

  getEntry(path: string) {
    return this.entries.get(path);
  }

  listEntries() {
    return Array.from(this.entries.values());
  }

  readFile(path: string) {
    const entry = this.entries.get(path);
    if (!entry) throw new Error(`File not found: ${path}`);
    return new Uint8Array(entry.length);
  }
}

export class MockVirtualFileSystem {
  private files: Map<string, { path: string; size: number; sourcePak: string }> = new Map();
  private paks: MockPakArchive[] = [];

  mountPak(archive: MockPakArchive) {
    this.paks.push(archive);
    for (const entry of archive.listEntries()) {
      this.files.set(entry.name, {
        path: entry.name,
        size: entry.length,
        sourcePak: archive.name,
      });
    }
  }

  get mountedPaks() {
    return this.paks;
  }

  hasFile(path: string) {
    return this.files.has(path);
  }

  stat(path: string) {
    return this.files.get(path);
  }

  async readFile(path: string) {
    const file = this.files.get(path);
    if (!file) throw new Error(`File not found: ${path}`);
    return new Uint8Array(file.size);
  }

  list(_path?: string) {
    return {
      files: Array.from(this.files.values()),
      directories: [],
    };
  }

  findByExtension(ext: string) {
    return Array.from(this.files.values()).filter(f => f.path.endsWith(ext));
  }
}

export const mockPcxImage = {
  width: 64,
  height: 64,
  bitsPerPixel: 8,
  palette: new Uint8Array(768),
  data: new Uint8Array(64 * 64),
};

export const mockWalTexture = {
  name: 'test',
  width: 64,
  height: 64,
  mipmaps: [{ level: 0, width: 64, height: 64, data: new Uint8Array(64 * 64) }],
  animName: '',
  flags: 0,
  contents: 0,
  value: 0,
};

export const mockMd2Model = {
  header: {
    numFrames: 10,
    numVertices: 100,
    numTriangles: 50,
    numSkins: 1,
    numGlCommands: 200,
  },
  frames: [],
  skins: [],
  texCoords: [],
  triangles: [],
  glCommands: [],
};

export const mockMd3Model = {
  header: {
    numFrames: 5,
    numSurfaces: 2,
    numTags: 1,
  },
  frames: [],
  tags: [],
  surfaces: [],
};

export const mockWavData = {
  channels: 1,
  sampleRate: 22050,
  bitsPerSample: 16,
  samples: new Int16Array(22050),
};

export const parsePcx = jest.fn(() => mockPcxImage);
export const pcxToRgba = jest.fn(() => new Uint8Array(64 * 64 * 4));
export const parseWal = jest.fn(() => mockWalTexture);
export const walToRgba = jest.fn(() => ({
  levels: [{ level: 0, width: 64, height: 64, rgba: new Uint8Array(64 * 64 * 4) }],
}));
export const parseMd2 = jest.fn(() => mockMd2Model);
export const parseMd3 = jest.fn(() => mockMd3Model);
export const parseWav = jest.fn(() => mockWavData);

export const PakArchive = MockPakArchive;
export const VirtualFileSystem = MockVirtualFileSystem;
