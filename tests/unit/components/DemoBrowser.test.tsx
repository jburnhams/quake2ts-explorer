// tests/unit/components/DemoBrowser.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DemoBrowser } from '../../../src/components/DemoBrowser';
import { demoStorageService } from '../../../src/services/demoStorageService';

// Mock demoStorageService
jest.mock('../../../src/services/demoStorageService', () => ({
  demoStorageService: {
    getDemos: jest.fn(),
    deleteDemo: jest.fn(),
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
    date: Date.now(),
  },
  {
    id: '2',
    name: 'demo2.dm2',
    blob: new Blob(['data']),
    size: 2048,
    date: Date.now() - 10000,
    mapName: 'q2dm1'
  }
];

describe('DemoBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (demoStorageService.getDemos as jest.Mock).mockResolvedValue(mockDemos);
  });

  it('renders loading state initially', async () => {
    // Delay resolution
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    (demoStorageService.getDemos as jest.Mock).mockReturnValue(promise);

    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Clean up promise to avoid act warning
    await React.act(async () => {
        resolvePromise([]);
    });
  });

  it('renders demo list', async () => {
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('demo1.dm2')).toBeInTheDocument();
      expect(screen.getByText('demo2.dm2')).toBeInTheDocument();
      expect(screen.getByText('q2dm1')).toBeInTheDocument();
    });
  });

  it('handles play action', async () => {
    const onPlay = jest.fn();
    render(<DemoBrowser onPlayDemo={onPlay} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText('demo1.dm2'));

    fireEvent.click(screen.getByText('demo1.dm2'));
    expect(onPlay).toHaveBeenCalledWith(mockDemos[0]);
  });

  it('handles delete action', async () => {
    (demoStorageService.deleteDemo as jest.Mock).mockResolvedValue(undefined);
    window.confirm = jest.fn(() => true);

    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => screen.getByText('demo1.dm2'));

    const deleteBtns = screen.getAllByTitle('Delete');
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(demoStorageService.deleteDemo).toHaveBeenCalledWith('1');

    await waitFor(() => {
        expect(screen.queryByText('demo1.dm2')).not.toBeInTheDocument();
    });
  });

  it('handles close action', () => {
    const onClose = jest.fn();
    render(<DemoBrowser onPlayDemo={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });
});
