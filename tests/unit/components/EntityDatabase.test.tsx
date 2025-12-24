import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EntityDatabase } from '@/src/components/EntityDatabase';
import { PakService } from '@/src/services/pakService';
import { EntityService, EntityRecord } from '@/src/services/entityService';

// Mock dependencies
vi.mock('@/src/services/pakService');
vi.mock('@/src/services/entityService');

// Mock AutoSizer to render children with fixed dimensions
vi.mock('react-virtualized-auto-sizer', () => {
  return ({ children }: any) => {
    return children({ height: 500, width: 500 });
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

describe('EntityDatabase Component', () => {
  let mockPakService: any;
  let mockEntityService: any;
  let mockEntities: EntityRecord[];

  beforeEach(() => {
    mockEntities = [
      {
        id: 'map1_0',
        mapName: 'maps/map1.bsp',
        index: 0,
        classname: 'worldspawn',
        properties: { message: 'Test Map 1' },
        raw: {} as any
      },
      {
        id: 'map1_1',
        mapName: 'maps/map1.bsp',
        index: 1,
        classname: 'info_player_start',
        origin: { x: 100, y: 0, z: 0 },
        properties: { origin: '100 0 0' },
        raw: {} as any
      },
      {
        id: 'map2_0',
        mapName: 'maps/map2.bsp',
        index: 0,
        classname: 'light',
        targetname: 'light1',
        origin: { x: 0, y: 0, z: 100 },
        properties: { light: '200' },
        raw: {} as any
      }
    ];

    mockPakService = {
      getVfs: vi.fn().mockReturnValue({}),
    };

    mockEntityService = {
      scanAllMaps: vi.fn().mockImplementation((cb) => {
        if (cb) cb(0, 1, 'maps/map1.bsp');
        return Promise.resolve(mockEntities);
      }),
      generateEntFile: vi.fn().mockReturnValue('mock-ent-content')
    };

    (EntityService as vi.Mock).mockImplementation(() => mockEntityService);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    // @ts-ignore
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    // @ts-ignore
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders and loads entities', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={mockPakService} />);
    });

    // Check loading state handled (might be too fast to see in test without manual promise control, but we check final state)
    expect(mockEntityService.scanAllMaps).toHaveBeenCalled();

    // Check if entities are displayed
    await waitFor(() => {
      expect(screen.getByText('3 entities')).toBeInTheDocument();
      // Use querySelector to ensure we are finding the rendered cells
      expect(screen.getAllByText('info_player_start').length).toBeGreaterThan(0);
      expect(screen.getAllByText('light').length).toBeGreaterThan(0);
    });
  });

  it('filters by search query', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={mockPakService} />);
    });

    const searchInput = screen.getByPlaceholderText('Search entities...');
    fireEvent.change(searchInput, { target: { value: 'light' } });

    await waitFor(() => {
      // Should show light, but hide info_player_start
      expect(screen.queryByTitle('info_player_start')).not.toBeInTheDocument();
      expect(screen.getAllByText('light').length).toBeGreaterThan(0);
    });
  });

  it('filters by map', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={mockPakService} />);
    });

    const mapSelect = screen.getAllByRole('combobox')[0]; // First select is map
    fireEvent.change(mapSelect, { target: { value: 'maps/map2.bsp' } });

    await waitFor(() => {
      expect(screen.queryByTitle('maps/map1.bsp')).not.toBeInTheDocument();
      expect(screen.getAllByText('maps/map2.bsp').length).toBeGreaterThan(0);
    });
  });

  it('selects an entity and shows inspector', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={mockPakService} />);
    });

    // We use getAllByText because it appears in dropdown and in list. We want the list item.
    // The list item has class "entity-cell cell-classname"
    // Wait for render
    await waitFor(() => expect(screen.getAllByText('info_player_start').length).toBeGreaterThan(0));

    const rows = screen.getAllByText('info_player_start').filter(el => el.classList.contains('cell-classname'));
    expect(rows.length).toBeGreaterThan(0);

    fireEvent.click(rows[0]);

    // Inspector should show up
    const elements = screen.getAllByText('info_player_start');
    expect(screen.getByText('100 0 0')).toBeInTheDocument();
  });

  it('sorts entities', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={mockPakService} />);
    });

    const classnameHeader = screen.getByText('Classname');

    // Default sort is asc classname. 'info_player_start', 'light', 'worldspawn'
    // Let's reverse it
    fireEvent.click(classnameHeader); // desc

    expect(classnameHeader).toHaveClass('sort-desc');
  });

  it('triggers ENT export when button is clicked', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={mockPakService} />);
    });

    const exportBtn = screen.getByText('Export ENT');
    fireEvent.click(exportBtn);

    expect(mockEntityService.generateEntFile).toHaveBeenCalled();
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});
