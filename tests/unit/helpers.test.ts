
import {
  formatBytes,
  getFileIcon,
  generateHexDump,
  calculateImageScale,
  calculateAudioDuration,
  getFileType,
  getExtension,
  getFileName,
  toArrayBuffer,
} from '@/src/utils/helpers';

describe('helpers', () => {
  describe('formatBytes', () => {
    it('formats bytes under 1KB', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(100)).toBe('100 B');
      expect(formatBytes(1023)).toBe('1023 B');
    });

    it('formats bytes as KB', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(2048)).toBe('2.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('formats bytes as MB', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.50 MB');
    });
  });

  describe('getFileIcon', () => {
    it('returns folder icon for directories', () => {
      expect(getFileIcon('pics', true)).toBe('\uD83D\uDCC1');
    });

    it('returns image icon for pcx and wal', () => {
      expect(getFileIcon('test.pcx', false)).toBe('\uD83D\uDDBC');
      expect(getFileIcon('test.wal', false)).toBe('\uD83D\uDDBC');
    });

    it('returns model icon for md2 and md3', () => {
      expect(getFileIcon('test.md2', false)).toBe('\uD83D\uDC7E');
      expect(getFileIcon('test.md3', false)).toBe('\uD83D\uDC7E');
    });

    it('returns audio icon for wav', () => {
      expect(getFileIcon('test.wav', false)).toBe('\uD83D\uDD0A');
    });

    it('returns map icon for bsp', () => {
      expect(getFileIcon('test.bsp', false)).toBe('\uD83D\uDDFA');
    });

    it('returns text icon for txt and cfg', () => {
      expect(getFileIcon('readme.txt', false)).toBe('\uD83D\uDCDD');
      expect(getFileIcon('config.cfg', false)).toBe('\uD83D\uDCDD');
    });

    it('returns generic file icon for unknown types', () => {
      expect(getFileIcon('file.xyz', false)).toBe('\uD83D\uDCC4');
      expect(getFileIcon('noext', false)).toBe('\uD83D\uDCC4');
    });
  });

  describe('generateHexDump', () => {
    it('generates hex dump for small data', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
      const lines = generateHexDump(data);
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('48 65 6c 6c 6f');
      expect(lines[0]).toContain('Hello');
    });

    it('handles non-printable characters', () => {
      const data = new Uint8Array([0x00, 0x1f, 0x7f, 0x80]);
      const lines = generateHexDump(data);
      expect(lines[0]).toContain('....');
    });

    it('truncates data at maxBytes', () => {
      const data = new Uint8Array(1000);
      const lines = generateHexDump(data, 32);
      expect(lines.length).toBe(2); // 32 bytes = 2 lines of 16
    });

    it('generates multiple lines for larger data', () => {
      const data = new Uint8Array(48);
      const lines = generateHexDump(data);
      expect(lines.length).toBe(3); // 48 bytes = 3 lines of 16
    });
  });

  describe('calculateImageScale', () => {
    it('returns 1 for large images', () => {
      expect(calculateImageScale(800, 600)).toBe(1);
      expect(calculateImageScale(400, 400)).toBe(1);
    });

    it('scales up small images', () => {
      expect(calculateImageScale(64, 64)).toBe(4);
      expect(calculateImageScale(100, 100)).toBe(4);
      expect(calculateImageScale(128, 128)).toBe(3);
      expect(calculateImageScale(200, 200)).toBe(2);
    });

    it('respects maxSize parameter', () => {
      expect(calculateImageScale(64, 64, 128)).toBe(2);
      expect(calculateImageScale(64, 64, 64)).toBe(1);
    });

    it('uses the larger dimension', () => {
      expect(calculateImageScale(64, 32)).toBe(4);
      expect(calculateImageScale(32, 64)).toBe(4);
    });
  });

  describe('calculateAudioDuration', () => {
    it('calculates duration for mono audio', () => {
      expect(calculateAudioDuration(22050, 1, 22050)).toBe(1);
      expect(calculateAudioDuration(44100, 1, 22050)).toBe(2);
    });

    it('calculates duration for stereo audio', () => {
      expect(calculateAudioDuration(44100, 2, 22050)).toBe(1);
    });

    it('handles different sample rates', () => {
      expect(calculateAudioDuration(44100, 1, 44100)).toBe(1);
      expect(calculateAudioDuration(48000, 1, 48000)).toBe(1);
    });
  });

  describe('getFileType', () => {
    it('identifies image types', () => {
      expect(getFileType('test.pcx')).toBe('pcx');
      expect(getFileType('test.wal')).toBe('wal');
    });

    it('identifies model types', () => {
      expect(getFileType('test.md2')).toBe('md2');
      expect(getFileType('test.md3')).toBe('md3');
    });

    it('identifies audio types', () => {
      expect(getFileType('test.wav')).toBe('wav');
    });

    it('identifies map types', () => {
      expect(getFileType('test.bsp')).toBe('bsp');
    });

    it('identifies text types', () => {
      expect(getFileType('readme.txt')).toBe('txt');
      expect(getFileType('config.cfg')).toBe('txt');
      expect(getFileType('map.ent')).toBe('txt');
    });

    it('returns unknown for unrecognized types', () => {
      expect(getFileType('file.xyz')).toBe('unknown');
      expect(getFileType('noext')).toBe('unknown');
    });

    it('is case insensitive', () => {
      expect(getFileType('test.PCX')).toBe('pcx');
      expect(getFileType('test.WAL')).toBe('wal');
    });
  });

  describe('getExtension', () => {
    it('returns lowercase extension', () => {
      expect(getExtension('test.pcx')).toBe('pcx');
      expect(getExtension('test.PCX')).toBe('pcx');
    });

    it('returns empty string for no extension', () => {
      expect(getExtension('noext')).toBe('');
    });

    it('returns last extension for multiple dots', () => {
      expect(getExtension('file.backup.txt')).toBe('txt');
    });
  });

  describe('getFileName', () => {
    it('returns filename from path', () => {
      expect(getFileName('pics/test.pcx')).toBe('test.pcx');
      expect(getFileName('models/monsters/soldier/tris.md2')).toBe('tris.md2');
    });

    it('returns full string if no path', () => {
      expect(getFileName('test.pcx')).toBe('test.pcx');
    });

    it('handles empty path', () => {
      expect(getFileName('')).toBe('');
    });
  });

  describe('toArrayBuffer', () => {
    it('converts Uint8Array to ArrayBuffer', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const buffer = toArrayBuffer(data);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBe(5);
    });

    it('copies data correctly', () => {
      const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const buffer = toArrayBuffer(data);
      const view = new Uint8Array(buffer);
      expect(Array.from(view)).toEqual([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    });

    it('handles empty array', () => {
      const data = new Uint8Array(0);
      const buffer = toArrayBuffer(data);
      expect(buffer.byteLength).toBe(0);
    });
  });
});
