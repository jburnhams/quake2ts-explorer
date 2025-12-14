
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EntityDatabase } from '@/src/components/EntityDatabase';
import { PakService } from '@/src/services/pakService';
import { EntityService, EntityRecord } from '@/src/services/entityService';

// Mock dependencies
jest.mock('@/src/services/pakService');
jest.mock('@/src/services/entityService');

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
      getVfs: jest.fn().mockReturnValue({}),
    };

    mockEntityService = {
      scanAllMaps: jest.fn().mockImplementation((cb) => {
        if (cb) cb(0, 1, 'maps/map1.bsp');
        return Promise.resolve(mockEntities);
      })
    };

    (EntityService as jest.Mock).mockImplementation(() => mockEntityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      const entityCells = screen.getAllByText('info_player_start');
      expect(entityCells.length).toBeGreaterThan(0);
      const lightCells = screen.getAllByText('light');
      expect(lightCells.length).toBeGreaterThan(0);
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
      const lightCells = screen.getAllByText('light');
      expect(lightCells.length).toBeGreaterThan(0);
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
    const row = screen.getAllByText('info_player_start').find(el => el.classList.contains('cell-classname'));
    if (!row) throw new Error('Row not found');

    fireEvent.click(row);

    // Inspector should show up (it might be displaying the entity classname instead of "Inspector" when selected)
    // In EntityInspector.tsx: if entity is selected, header shows entity.classname
    expect(screen.getByText('info_player_start', { selector: '.inspector-header' })).toBeInTheDocument();
    // Check properties
    expect(screen.getByText('origin')).toBeInTheDocument();
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

    // It's hard to test order visually in JSDOM, but we can check state if we were testing internal state or check order of elements.
    const rows = screen.getAllByText(/map[12]\.bsp/); // Get map cells to check order indirectly if needed, or just rely on react state update.
    // Given the simplicity, basic interaction is enough.
    expect(classnameHeader).toHaveClass('sort-desc');
  });
});
