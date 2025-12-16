import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DemoBrowser } from '../../../src/components/DemoBrowser';
import { demoStorageService } from '../../../src/services/demoStorageService';
import { demoMetadataService } from '../../../src/services/demoMetadataService';

// Mock dependencies
jest.mock('../../../src/services/demoStorageService', () => ({
  demoStorageService: {
    getDemos: jest.fn(),
    deleteDemo: jest.fn(),
  }
}));

jest.mock('../../../src/services/demoMetadataService', () => ({
  demoMetadataService: {
    getAllMetadata: jest.fn(),
    deleteMetadata: jest.fn(),
  }
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

const mockDemos = [
  {
    id: '1',
    name: 'demo1.dm2',
    blob: new Blob(['data']),
    size: 1024,
    date: 1000,
    mapName: 'q2dm1',
    duration: 60 // 1 min
  },
  {
    id: '2',
    name: 'demo2.dm2',
    blob: new Blob(['data']),
    size: 2048,
    date: 2000,
    mapName: 'q2dm2',
    duration: 125 // 2 min 5 sec
  },
  {
    id: '3',
    name: 'tourney_final.dm2',
    blob: new Blob(['data']),
    size: 512,
    date: 3000,
    mapName: 'q2dm1',
    duration: 30 // 30 sec
  }
];

const mockMetadata = [
  {
    id: '1',
    tags: ['ranked', 'win'],
    customName: 'My Best Game',
    duration: 65 // Metadata overrides stored duration if present
  },
  {
    id: '3',
    tags: ['tournament'],
    description: 'Grand finals'
  }
];

describe('DemoBrowser Search and Filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (demoStorageService.getDemos as jest.Mock).mockResolvedValue(mockDemos);
    (demoMetadataService.getAllMetadata as jest.Mock).mockReturnValue(mockMetadata);
  });

  it('renders search input and sort controls', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => screen.getByPlaceholderText(/search/i));
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /sort/i })).toBeInTheDocument();
  });

  it('filters demos by name', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'tourney' } });

    expect(screen.queryByText('demo2.dm2')).not.toBeInTheDocument();
    expect(screen.getByText('tourney_final.dm2')).toBeInTheDocument();
  });

  it('filters demos by map name', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'q2dm2' } });

    expect(screen.queryByText('My Best Game')).not.toBeInTheDocument(); // demo1
    expect(screen.getByText('demo2.dm2')).toBeInTheDocument();
  });

  it('filters demos by tags from metadata', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'ranked' } });

    expect(screen.getByText('My Best Game')).toBeInTheDocument(); // Has 'ranked' tag
    expect(screen.queryByText('demo2.dm2')).not.toBeInTheDocument();
  });

  it('filters demos by custom name from metadata', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Best Game' } });

    expect(screen.getByText('My Best Game')).toBeInTheDocument(); // Custom name 'My Best Game'
    expect(screen.queryByText('demo2.dm2')).not.toBeInTheDocument();
  });

  it('sorts demos by date (default: newest first)', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const rows = screen.getAllByRole('row');
    // Row 0 is header.
    // Default sort is newest first (date desc).
    // demo3 (3000), demo2 (2000), demo1 (1000)
    expect(rows[1]).toHaveTextContent('tourney_final.dm2');
    expect(rows[2]).toHaveTextContent('demo2.dm2');
    expect(rows[3]).toHaveTextContent('My Best Game'); // demo1
  });

  it('sorts demos by size', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const sortSelect = screen.getByRole('combobox', { name: /sort/i });
    fireEvent.change(sortSelect, { target: { value: 'size' } });

    const rows = screen.getAllByRole('row');
    // Sort by size desc: demo2 (2048), demo1 (1024), demo3 (512)
    expect(rows[1]).toHaveTextContent('demo2.dm2');
    expect(rows[2]).toHaveTextContent('My Best Game'); // demo1
    expect(rows[3]).toHaveTextContent('tourney_final.dm2');
  });

  it('sorts demos by duration', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const sortSelect = screen.getByRole('combobox', { name: /sort/i });
    fireEvent.change(sortSelect, { target: { value: 'duration' } });

    const rows = screen.getAllByRole('row');
    // Sort by duration desc:
    // demo2: 125s (2:05)
    // demo1: 65s (metadata override) (1:05)
    // demo3: 30s (0:30)

    expect(rows[1]).toHaveTextContent('demo2.dm2');
    expect(rows[1]).toHaveTextContent('2:05');

    expect(rows[2]).toHaveTextContent('My Best Game');
    expect(rows[2]).toHaveTextContent('1:05');

    expect(rows[3]).toHaveTextContent('tourney_final.dm2');
    expect(rows[3]).toHaveTextContent('0:30');
  });

  it('sorts demos by name', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    await waitFor(() => screen.getByText('demo2.dm2'));

    const sortSelect = screen.getByRole('combobox', { name: /sort/i });
    fireEvent.change(sortSelect, { target: { value: 'name' } });

    const rows = screen.getAllByRole('row');
    // Sort by name asc: demo2, My Best Game (demo1), tourney
    expect(rows[1]).toHaveTextContent('demo2.dm2');
    expect(rows[2]).toHaveTextContent('My Best Game');
    expect(rows[3]).toHaveTextContent('tourney_final.dm2');
  });
});
