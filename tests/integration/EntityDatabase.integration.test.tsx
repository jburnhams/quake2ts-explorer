
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EntityDatabase } from '@/src/components/EntityDatabase';
import { PakService } from '@/src/services/pakService';
import { VirtualFileSystem } from '@quake2ts/engine';

// Mock AutoSizer to render children with fixed dimensions
vi.mock('react-virtualized-auto-sizer', () => {
  return {
    default: ({ children }: any) => {
      return children({ height: 500, width: 500 });
    }
  };
});

// Mock react-window (v2) to render all items
vi.mock('react-window', () => {
  const React = require('react');
  return {
    List: ({ rowComponent, rowProps, rowCount }: any) => {
      const Row = rowComponent;
      return (
        <div data-testid="virtual-list">
          {Array.from({ length: rowCount }).map((_, index) => (
            <Row key={index} index={index} style={{}} {...rowProps} />
          ))}
        </div>
      );
    },
  };
});

// Mock dependencies
vi.mock('@quake2ts/engine', () => {
  return {
    VirtualFileSystem: vi.fn().mockImplementation(() => ({
      mountPak: vi.fn(),
      findByExtension: vi.fn().mockReturnValue([
        { path: 'maps/demo1.bsp', size: 100, sourcePak: 'pak0' }
      ]),
      readFile: vi.fn().mockResolvedValue(new Uint8Array(100)),
      stat: vi.fn(),
    })),
    parseBsp: vi.fn().mockReturnValue({
      entities: {
        entities: [
          {
            classname: 'worldspawn',
            properties: { classname: 'worldspawn', message: 'Demo Map' }
          },
          {
            classname: 'info_player_start',
            properties: { classname: 'info_player_start', origin: '100 0 0' }
          }
        ]
      }
    })
  };
});

describe('EntityDatabase Integration', () => {
  let pakService: PakService;

  beforeEach(() => {
    vi.clearAllMocks();
    pakService = new PakService();
  });

  it('loads entities from mock PAK and displays them', async () => {
    render(<EntityDatabase pakService={pakService} />);

    // Wait for scanning
    await waitFor(() => {
      expect(screen.getByText('2 entities')).toBeInTheDocument();
    });

    // Check content
    expect(screen.getAllByText('worldspawn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('info_player_start').length).toBeGreaterThan(0);

    // Inspect
    // Because we use react-window mock, items are rendered.
    // However, info_player_start appears in dropdown AND list.
    // We want the list item. The list item has class "entity-cell cell-classname"
    const row = screen.getAllByText('info_player_start').find(el => el.classList.contains('cell-classname'));
    if (!row) throw new Error('Row not found');
    fireEvent.click(row);

    // Wait for inspector to update
    // The inspector header uses classname
    await waitFor(() => {
        expect(screen.getByText('origin')).toBeInTheDocument();
        // 100, 0, 0
        expect(screen.getByText(/100,\s*0,\s*0/)).toBeInTheDocument();
    });
  });

  it('exports entities as ENT file', async () => {
    // Mock URL.createObjectURL
    const mockCreateObjectURL = vi.fn();
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock HTMLAnchorElement.click to prevent navigation
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
        writable: true,
        value: vi.fn()
    });

    render(<EntityDatabase pakService={pakService} />);

    // Wait for load
    await waitFor(() => expect(screen.getByText('2 entities')).toBeInTheDocument());

    // Click Export ENT
    fireEvent.click(screen.getByText('Export ENT'));

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
