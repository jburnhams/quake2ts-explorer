# Implementation Plan

## Project Setup

- [x] Rename package.json to quake2ts-explorer
- [x] Update index.html title
- [x] Install quake2ts dependency
- [x] Install @wasm-audio-decoders/ogg-vorbis (quake2ts peer dep)

## Service Layer

- [x] Create PakService class
  - [x] Load PAK files from File objects
  - [x] Load PAK files from ArrayBuffer
  - [x] Mount PAKs to VirtualFileSystem
  - [x] List directory contents
  - [x] Read file contents
  - [x] Parse file types (PCX, WAL, MD2, MD3, WAV, text)
  - [x] Build file tree structure
  - [x] Get file metadata
  - [x] Auto-load palette from colormap.pcx for WAL textures

## Components

### Layout
- [x] Toolbar component (title, open button, pak info)
- [x] Main layout (3-panel: tree, preview, metadata)
- [x] Drop zone overlay for drag-and-drop
- [x] App.css with dark Quake-themed styling

### File Tree
- [x] FileTree component with TreeNode
- [x] Folder/file emoji icons
- [x] Expand/collapse directories
- [x] File selection highlighting
- [x] Keyboard navigation (Enter/Space)

### Preview Panel
- [x] ImagePreview (PCX, WAL) - render to canvas
- [x] ModelPreview (MD2, MD3) - placeholder with info
- [x] AudioPreview (WAV) - playback controls with WebAudio
- [x] TextPreview - preformatted text viewer
- [x] HexPreview - hex dump for unknown files
- [x] WAL no-palette fallback message

### Metadata Panel
- [x] FileInfo display (name, size, path, type, source PAK)
- [x] Format-specific details
  - [x] PCX: dimensions, bits per pixel
  - [x] WAL: dimensions, name, mip levels
  - [x] MD2: frames, vertices, triangles, skins, GL commands
  - [x] MD3: frames, surfaces, tags
  - [x] WAV: channels, sample rate, bits per sample, duration
  - [x] TXT: character count, line count
  - [x] Unknown: byte size

## Styling

- [x] CSS layout (flexbox 3-panel)
- [x] Tree styles (indentation, expand icons, emoji icons)
- [x] Preview area styling (centered content, scaling)
- [x] Dark theme (Quake aesthetic with red accent)
- [x] Custom scrollbars
- [x] Drop zone overlay animation

## Unit Tests (with mocks) - 52 tests

- [x] PakService tests
  - [x] loadPakFromBuffer creates archive
  - [x] mounts PAK to VFS
  - [x] listDirectory returns files
  - [x] hasFile checks existence
  - [x] getFileMetadata returns metadata
  - [x] parseFile for each type
  - [x] buildFileTree creates tree structure
  - [x] clear removes all PAKs
  - [x] singleton getPakService/resetPakService
- [x] Component tests
  - [x] Toolbar renders title, button, info
  - [x] FileTree shows empty state, renders nodes, expands, selects
  - [x] PreviewPanel renders each preview type
  - [x] MetadataPanel shows file info and type details

## Integration Tests (jsdom) - 27 tests

- [x] index.html structure validation
- [x] App initial state (toolbar, empty panels)
- [x] 3-panel layout structure
- [x] File input configuration
- [x] Accessibility roles
- [x] PAK file format validation
- [x] CSS class application

## Build & CI

- [x] npm run build passes
- [x] npm run test:unit passes (52 tests)
- [x] npm run test:integration passes (27 tests)
- [x] Jest config updated for ESM modules

---

## Current Status

**Complete:** Initial implementation finished with PAK browsing, file preview, and comprehensive tests.

## Notes

- Unit tests use mocked quake2ts modules for isolation
- Integration tests use real quake2ts library
- CSS mock added for Jest compatibility
- WAL textures require palette from colormap.pcx (auto-loaded if present)

## Possible Future Improvements

- [ ] 3D model preview with WebGL
- [ ] BSP map preview
- [ ] Multiple PAK file management (list, unmount)
- [ ] Search/filter files
- [ ] Export individual files
- [ ] OGG audio support (already imported in quake2ts)
