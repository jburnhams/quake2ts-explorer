import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServerBrowser, ServerInfo } from '../../../src/components/ServerBrowser';

describe('ServerBrowser', () => {
  const mockConnect = jest.fn();
  const mockClose = jest.fn();
  const mockServers: ServerInfo[] = [
    {
      address: 'ws://test1.com',
      name: 'Test Server 1',
      map: 'q2dm1',
      players: 2,
      maxPlayers: 8,
      ping: 40,
      gamemode: 'DM'
    },
    {
      address: 'ws://test2.com',
      name: 'Test Server 2',
      map: 'q2dm2',
      players: 0,
      maxPlayers: 16,
      ping: 120,
      gamemode: 'CTF'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders server list correctly', () => {
    render(
      <ServerBrowser
        onConnect={mockConnect}
        onClose={mockClose}
        initialServers={mockServers}
      />
    );

    expect(screen.getByText('Test Server 1')).toBeInTheDocument();
    expect(screen.getByText('Test Server 2')).toBeInTheDocument();
    expect(screen.getByText('q2dm1')).toBeInTheDocument();

    // Check ping classes
    const ping40 = screen.getByText('40ms');
    expect(ping40).toHaveClass('ping-good');

    const ping120 = screen.getByText('120ms');
    expect(ping120).toHaveClass('ping-bad');
  });

  it('selects server on click', () => {
    render(
      <ServerBrowser
        onConnect={mockConnect}
        onClose={mockClose}
        initialServers={mockServers}
      />
    );

    const row = screen.getByTestId('server-row-ws://test1.com');
    fireEvent.click(row);

    expect(row).toHaveClass('selected');
    const input = screen.getByTestId('manual-address-input') as HTMLInputElement;
    expect(input.value).toBe('ws://test1.com');
  });

  it('connects to selected server', () => {
    render(
      <ServerBrowser
        onConnect={mockConnect}
        onClose={mockClose}
        initialServers={mockServers}
      />
    );

    const row = screen.getByTestId('server-row-ws://test1.com');
    fireEvent.click(row);

    const connectBtn = screen.getByTestId('connect-button');
    fireEvent.click(connectBtn);

    expect(mockConnect).toHaveBeenCalledWith('ws://test1.com');
  });

  it('connects to manual address', () => {
    render(
      <ServerBrowser
        onConnect={mockConnect}
        onClose={mockClose}
        initialServers={mockServers}
      />
    );

    const input = screen.getByTestId('manual-address-input');
    fireEvent.change(input, { target: { value: 'ws://manual.com' } });

    const connectBtn = screen.getByTestId('connect-button');
    fireEvent.click(connectBtn);

    expect(mockConnect).toHaveBeenCalledWith('ws://manual.com');
  });

  it('closes on close button click', () => {
    render(
        <ServerBrowser
          onConnect={mockConnect}
          onClose={mockClose}
          initialServers={mockServers}
        />
      );

      const closeBtn = screen.getByLabelText('Close');
      fireEvent.click(closeBtn);
      expect(mockClose).toHaveBeenCalled();
  });
});
