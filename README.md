# Quake2TS Explorer

A web application to explore and view Quake II PAK file contents using the [quake2ts](https://www.npmjs.com/package/quake2ts) library.

## Overview

Quake2TS Explorer allows you to:

- **Load PAK files** via file picker or drag-and-drop
- **Browse contents** with an interactive file tree
- **Preview assets** including:
  - PCX and WAL images/textures
  - MD2 and MD3 3D models (metadata and frame info)
  - WAV audio playback
  - Text/config files
- **View metadata** for any file in the archive

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test:unit
npm run test:integration

# Build for production
npm run build
```

## Usage

1. Open the application in your browser
2. Click "Open PAK File" or drag-and-drop a `.pak` file onto the window
3. Browse the file tree on the left panel
4. Click a file to see its preview in the center and metadata on the right

## Architecture

- **React 19 + TypeScript** frontend with Vite
- **quake2ts** for PAK file parsing and asset decoding
- **Jest + jsdom** for unit and integration testing
- **Canvas** for image/texture rendering

## Project Structure

```
quake2ts-explorer/
├── src/
│   ├── components/     # React UI components
│   │   ├── Toolbar.tsx
│   │   ├── FileTree.tsx
│   │   ├── PreviewPanel.tsx
│   │   └── MetadataPanel.tsx
│   ├── hooks/          # Custom React hooks
│   ├── services/       # PAK file service layer
│   │   └── pakService.ts
│   ├── App.tsx
│   └── main.tsx
├── tests/
│   ├── unit/           # Fast isolated tests with mocks
│   ├── integration/    # Browser experience tests with canvas
│   └── utils/          # Shared test utilities
├── implementation.md   # Detailed implementation plan
└── package.json
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and build for production |
| `npm run test:unit` | Run unit tests with mocks |
| `npm run test:integration` | Run integration tests |
| `npm run test:coverage` | Run unit tests with coverage report |

## Supported File Types

| Extension | Type | Preview |
|-----------|------|---------|
| `.pcx` | Image | Canvas render |
| `.wal` | Texture | Canvas render |
| `.md2` | Model | Frame/animation info |
| `.md3` | Model | Surface/tag info |
| `.wav` | Audio | Playback controls |
| `.txt`, `.cfg` | Text | Text viewer |
| Other | Binary | Hex dump |

## Technology Stack

- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [quake2ts](https://www.npmjs.com/package/quake2ts)
- [Jest](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/)

## Development

See [implementation.md](implementation.md) for detailed implementation plan and progress tracking.

## License

MIT
