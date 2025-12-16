
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { EntityDatabase } from '@/src/components/EntityDatabase';
import { PakService } from '@/src/services/pakService';
import { VirtualFileSystem } from 'quake2ts/engine';

// Mock engine dependencies
jest.mock('quake2ts/engine', () => ({
  VirtualFileSystem: jest.fn().mockImplementation(() => ({
    findByExtension: jest.fn().mockReturnValue(['maps/test.bsp']),
    readFile: jest.fn().mockResolvedValue(new Uint8Array(100)), // Dummy buffer
    mountPak: jest.fn(),
  })),
  parseBsp: jest.fn().mockReturnValue({
    entities: {
      entities: [
        { classname: 'worldspawn', properties: { classname: 'worldspawn', message: 'Integration Test Map' } },
        { classname: 'info_player_start', properties: { classname: 'info_player_start', origin: '100 0 0' } }
      ]
    }
  }),
}));

describe('EntityDatabase Integration', () => {
  let pakService: PakService;

  beforeEach(() => {
    jest.clearAllMocks();
    pakService = new PakService();
    // Mock URL object
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();
  });

  it('loads entities from mock PAK and displays them', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={pakService} />);
    });

    // Should see loading or entities eventually
    await waitFor(() => {
      const worldspawns = screen.getAllByText('worldspawn');
      expect(worldspawns.length).toBeGreaterThan(0);
      const playerStarts = screen.getAllByText('info_player_start');
      expect(playerStarts.length).toBeGreaterThan(0);
    });

    // Inspect
    const row = screen.getAllByText('info_player_start').find(el => el.classList.contains('cell-classname'));
    if (!row) throw new Error('Row not found');
    fireEvent.click(row);

    // Wait for inspector to update
    await waitFor(() => {
        expect(screen.getByText('info_player_start', { selector: '.inspector-header' })).toBeInTheDocument();
    });

    // Check properties
    expect(screen.getByText('origin')).toBeInTheDocument();
    expect(screen.getByText('100 0 0')).toBeInTheDocument();
  });

  it('exports entities as ENT file', async () => {
    await act(async () => {
      render(<EntityDatabase pakService={pakService} />);
    });

    await waitFor(() => {
       expect(screen.getByText('2 entities')).toBeInTheDocument();
    });

    const exportBtn = screen.getByText('Export ENT');
    fireEvent.click(exportBtn);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    const blob = (global.URL.createObjectURL as jest.Mock).mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);

    // Read blob content manually since jsdom's Blob might not support .text() or FileReader is safer
    const reader = new FileReader();
    const promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
    });
    reader.readAsText(blob);
    const text = await promise;

    expect(text).toContain('"classname" "worldspawn"');
    expect(text).toContain('"message" "Integration Test Map"');
    expect(text).toContain('"classname" "info_player_start"');
  });
});
