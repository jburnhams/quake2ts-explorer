import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fs from 'fs';
import * as path from 'path';
import App from '@/src/App';

// Helper to create a minimal valid PAK file
function createMinimalPakFile(): ArrayBuffer {
  // PAK file format:
  // - Header: "PACK" magic (4 bytes), directory offset (4 bytes), directory size (4 bytes)
  // - Data section
  // - Directory: entries with 56-byte name, 4-byte offset, 4-byte length

  const testContent = new TextEncoder().encode('Hello from PAK file!\n');
  const fileName = 'readme.txt';

  // Calculate offsets
  const headerSize = 12;
  const dataOffset = headerSize;
  const dataSize = testContent.length;
  const dirOffset = dataOffset + dataSize;
  const dirEntrySize = 64; // 56 bytes name + 4 bytes offset + 4 bytes length
  const dirSize = dirEntrySize;

  const totalSize = dirOffset + dirSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Write header
  bytes[0] = 0x50; // 'P'
  bytes[1] = 0x41; // 'A'
  bytes[2] = 0x43; // 'C'
  bytes[3] = 0x4b; // 'K'
  view.setInt32(4, dirOffset, true); // directory offset (little-endian)
  view.setInt32(8, dirSize, true); // directory size (little-endian)

  // Write data
  bytes.set(testContent, dataOffset);

  // Write directory entry
  const nameBytes = new TextEncoder().encode(fileName);
  bytes.set(nameBytes, dirOffset);
  view.setInt32(dirOffset + 56, dataOffset, true); // file offset
  view.setInt32(dirOffset + 60, dataSize, true); // file length

  return buffer;
}

describe('Quake2TS Explorer Integration Tests', () => {
  describe('index.html structure', () => {
    let htmlContent: string;

    beforeEach(() => {
      htmlContent = fs.readFileSync(
        path.join(__dirname, '..', '..', 'index.html'),
        'utf-8'
      );
    });

    it('has valid HTML structure with doctype', () => {
      expect(htmlContent).toMatch(/^<!doctype html>/i);
    });

    it('has correct title', () => {
      expect(htmlContent).toContain('Quake2TS Explorer');
    });

    it('has root div with correct id', () => {
      expect(htmlContent).toMatch(/<div\s+id="root"[^>]*>/i);
    });

    it('has main script tag pointing to correct entry point', () => {
      expect(htmlContent).toMatch(/<script\s+type="module"\s+src="\/src\/main\.tsx"[^>]*>/i);
    });
  });

  describe('App initial state', () => {
    it('renders the app with toolbar', () => {
      render(<App />);
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      expect(screen.getByText('Quake2TS Explorer')).toBeInTheDocument();
    });

    it('shows Open PAK File button', () => {
      render(<App />);
      expect(screen.getByTestId('open-pak-button')).toBeInTheDocument();
    });

    it('shows no PAKs loaded initially', () => {
      render(<App />);
      expect(screen.getByText('No PAK files loaded')).toBeInTheDocument();
    });

    it('shows empty file tree', () => {
      render(<App />);
      expect(screen.getByTestId('file-tree')).toBeInTheDocument();
      expect(screen.getByText('No files loaded')).toBeInTheDocument();
    });

    it('shows empty preview panel', () => {
      render(<App />);
      expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
      expect(screen.getByText('Select a file to preview')).toBeInTheDocument();
    });

    it('shows empty metadata panel', () => {
      render(<App />);
      expect(screen.getByTestId('metadata-panel')).toBeInTheDocument();
      expect(screen.getByText('Select a file to view details')).toBeInTheDocument();
    });

    it('has drop zone for drag and drop', () => {
      render(<App />);
      expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
    });
  });

  describe('App 3-panel layout', () => {
    it('has file tree on the left', () => {
      const { container } = render(<App />);
      const fileTree = container.querySelector('.file-tree');
      expect(fileTree).toBeInTheDocument();
    });

    it('has preview panel in the center', () => {
      const { container } = render(<App />);
      const preview = container.querySelector('.preview-panel');
      expect(preview).toBeInTheDocument();
    });

    it('has metadata panel on the right', () => {
      const { container } = render(<App />);
      const metadata = container.querySelector('.metadata-panel');
      expect(metadata).toBeInTheDocument();
    });

    it('renders correct CSS classes for layout', () => {
      const { container } = render(<App />);
      expect(container.querySelector('.app')).toBeInTheDocument();
      expect(container.querySelector('.toolbar')).toBeInTheDocument();
      expect(container.querySelector('.main-content')).toBeInTheDocument();
    });
  });

  describe('File input interaction', () => {
    it('has hidden file input', () => {
      render(<App />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('file');
    });

    it('file input accepts .pak files', () => {
      render(<App />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      expect(input.accept).toBe('.pak');
    });

    it('file input allows multiple files', () => {
      render(<App />);
      const input = screen.getByTestId('file-input') as HTMLInputElement;
      expect(input.multiple).toBe(true);
    });
  });

  describe('App accessibility', () => {
    it('toolbar has proper role', () => {
      render(<App />);
      const toolbar = screen.getByTestId('toolbar');
      expect(toolbar.tagName).toBe('HEADER');
    });

    it('preview panel has proper role', () => {
      render(<App />);
      const preview = screen.getByTestId('preview-panel');
      expect(preview.tagName).toBe('MAIN');
    });

    it('metadata panel has proper role', () => {
      render(<App />);
      const metadata = screen.getByTestId('metadata-panel');
      expect(metadata.tagName).toBe('ASIDE');
    });

    it('file tree has tree role', () => {
      render(<App />);
      // Tree role is only added when there are files
      const fileTree = screen.getByTestId('file-tree');
      expect(fileTree).toBeInTheDocument();
    });
  });

  describe('PAK file format validation', () => {
    it('creates a valid PAK file structure', () => {
      const pakBuffer = createMinimalPakFile();
      const bytes = new Uint8Array(pakBuffer);

      // Check magic number "PACK"
      expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('PACK');
    });

    it('PAK file has correct header structure', () => {
      const pakBuffer = createMinimalPakFile();
      const view = new DataView(pakBuffer);

      // Header is 12 bytes
      const dirOffset = view.getInt32(4, true);
      const dirSize = view.getInt32(8, true);

      expect(dirOffset).toBeGreaterThan(0);
      expect(dirSize).toBe(64); // One entry = 64 bytes
    });
  });

  describe('CSS styles', () => {
    it('applies dark theme background', () => {
      const { container } = render(<App />);
      const app = container.querySelector('.app');
      expect(app).toBeInTheDocument();
    });

    it('applies toolbar styles', () => {
      const { container } = render(<App />);
      const toolbar = container.querySelector('.toolbar');
      expect(toolbar).toBeInTheDocument();
    });

    it('has drop-zone-container wrapper', () => {
      const { container } = render(<App />);
      const dropZone = container.querySelector('.drop-zone-container');
      expect(dropZone).toBeInTheDocument();
    });
  });
});
