export const MIME_TYPES: Record<string, string> = {
  'bsp': 'application/octet-stream',
  'wal': 'application/octet-stream',
  'pcx': 'image/x-pcx',
  'tga': 'image/tga',
  'md2': 'application/octet-stream',
  'md3': 'application/octet-stream',
  'sp2': 'application/octet-stream',
  'wav': 'audio/wav',
  'txt': 'text/plain',
  'cfg': 'text/plain',
  'pak': 'application/octet-stream',
  'dm2': 'application/octet-stream',
  'ent': 'text/plain',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'json': 'application/json'
};

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return (ext && MIME_TYPES[ext]) || 'application/octet-stream';
}
