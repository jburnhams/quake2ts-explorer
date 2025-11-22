// Utility functions extracted for testability

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get file icon emoji based on file type
 */
export function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return '\uD83D\uDCC1'; // folder
  const ext = name.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pcx':
    case 'wal':
      return '\uD83D\uDDBC'; // image
    case 'md2':
    case 'md3':
    case 'sp2':
      return '\uD83D\uDC7E'; // model (alien)
    case 'wav':
      return '\uD83D\uDD0A'; // audio
    case 'bsp':
      return '\uD83D\uDDFA'; // map
    case 'txt':
    case 'cfg':
      return '\uD83D\uDCDD'; // text
    default:
      return '\uD83D\uDCC4'; // file
  }
}

/**
 * Generate hex dump lines from binary data
 */
export function generateHexDump(data: Uint8Array, maxBytes: number = 512): string[] {
  const displayData = data.slice(0, maxBytes);
  const lines: string[] = [];

  for (let i = 0; i < displayData.length; i += 16) {
    const hex = Array.from(displayData.slice(i, i + 16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const ascii = Array.from(displayData.slice(i, i + 16))
      .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(48)}  ${ascii}`);
  }

  return lines;
}

/**
 * Calculate display scale for small images
 */
export function calculateImageScale(width: number, height: number, maxSize: number = 400): number {
  return Math.max(1, Math.min(4, Math.floor(maxSize / Math.max(width, height))));
}

/**
 * Calculate audio duration from samples
 */
export function calculateAudioDuration(samplesLength: number, channels: number, sampleRate: number): number {
  return samplesLength / channels / sampleRate;
}

/**
 * Get file type from path
 */
export type FileType = 'pcx' | 'wal' | 'md2' | 'md3' | 'sp2' | 'wav' | 'bsp' | 'txt' | 'unknown';

export function getFileType(path: string): FileType {
  const ext = path.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pcx': return 'pcx';
    case 'wal': return 'wal';
    case 'md2': return 'md2';
    case 'md3': return 'md3';
    case 'sp2': return 'sp2';
    case 'wav': return 'wav';
    case 'bsp': return 'bsp';
    case 'txt':
    case 'cfg':
    case 'ent':
      return 'txt';
    default: return 'unknown';
  }
}

/**
 * Get file extension from path
 */
export function getExtension(path: string): string {
  const parts = path.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Get file name from path
 */
export function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Convert Uint8Array to ArrayBuffer for parsers
 */
export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(data.byteLength);
  new Uint8Array(buffer).set(data);
  return buffer;
}
