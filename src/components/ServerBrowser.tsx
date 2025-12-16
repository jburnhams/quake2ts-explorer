import React, { useState, useEffect } from 'react';
import './ServerBrowser.css';
import { networkService } from '../services/networkService';

export interface ServerInfo {
  address: string;
  name: string;
  map: string;
  players: number;
  maxPlayers: number;
  ping: number;
  gamemode: string;
}

interface ServerBrowserProps {
  onConnect: (address: string) => void;
  onClose: () => void;
  initialServers?: ServerInfo[]; // For testing or defaults
}

export function ServerBrowser({ onConnect, onClose, initialServers = [] }: ServerBrowserProps) {
  const [servers, setServers] = useState<ServerInfo[]>(initialServers);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // If no servers are provided, maybe load some defaults or mock data
    if (servers.length === 0 && !initialServers.length) {
      setServers([
        {
          address: 'ws://localhost:27910',
          name: 'Local Server',
          map: 'q2dm1',
          players: 0,
          maxPlayers: 8,
          ping: 5,
          gamemode: 'Deathmatch'
        },
        {
           address: 'wss://quake2.example.com',
           name: 'Public Demo Server',
           map: 'q2dm1',
           players: 4,
           maxPlayers: 16,
           ping: 45,
           gamemode: 'CTF'
        }
      ]);
    }
  }, [initialServers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Update pings for existing servers
    const updatedServers = await Promise.all(servers.map(async (server) => {
        try {
            const newPing = await networkService.ping(server.address);
            return { ...server, ping: newPing };
        } catch (e) {
            return { ...server, ping: 999 };
        }
    }));
    setServers(updatedServers);
    setIsRefreshing(false);
  };

  const handleConnect = async () => {
    const address = selectedAddress || manualAddress;
    if (address) {
        setIsConnecting(true);
        // Wait a small amount to show the "Connecting..." state before the parent handles it
        // The parent onConnect will likely trigger the actual networkService.connect
        // which might take time.
        // Actually, onConnect is void, so we rely on parent.
        // But for better UX, we can await it if we change the prop signature,
        // or just show it until the component unmounts.
        onConnect(address);
        // If onConnect fails immediately (sync), we might want to reset, but here we assume async flow
    }
  };

  const handleRowClick = (address: string) => {
    setSelectedAddress(address);
    setManualAddress(address);
  };

  const getPingClass = (ping: number) => {
    if (ping < 50) return 'ping-good';
    if (ping < 100) return 'ping-medium';
    return 'ping-bad';
  };

  return (
    <div className="server-browser-overlay" data-testid="server-browser">
      <div className="server-browser">
        <div className="server-browser-header">
          <h2>Server Browser</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        {isConnecting ? (
            <div className="connecting-dialog" data-testid="connecting-dialog" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#fff' }}>
                <h3>Connecting to server...</h3>
                <p>{selectedAddress || manualAddress}</p>
                <button onClick={() => setIsConnecting(false)} style={{ marginTop: '20px' }}>Cancel</button>
            </div>
        ) : (
        <>
            <div className="server-browser-content">
            <div className="server-list-container">
                {servers.length > 0 ? (
                <table className="server-table">
                    <thead>
                    <tr>
                        <th style={{ width: '40%' }}>Server Name</th>
                        <th style={{ width: '20%' }}>Map</th>
                        <th style={{ width: '15%' }}>Game Mode</th>
                        <th style={{ width: '15%' }}>Players</th>
                        <th style={{ width: '10%' }}>Ping</th>
                    </tr>
                    </thead>
                    <tbody>
                    {servers.map((server) => (
                        <tr
                        key={server.address}
                        className={selectedAddress === server.address ? 'selected' : ''}
                        onClick={() => handleRowClick(server.address)}
                        data-testid={`server-row-${server.address}`}
                        >
                        <td>{server.name}</td>
                        <td>{server.map}</td>
                        <td>{server.gamemode}</td>
                        <td>{server.players}/{server.maxPlayers}</td>
                        <td className={getPingClass(server.ping)}>{server.ping}ms</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                ) : (
                <div className="empty-state">
                    <p>No servers found.</p>
                    <button onClick={handleRefresh}>Refresh List</button>
                </div>
                )}
            </div>
            </div>

            <div className="server-browser-footer">
            <div className="manual-connect">
                <input
                type="text"
                placeholder="ws://server:port"
                value={manualAddress}
                onChange={(e) => {
                    setManualAddress(e.target.value);
                    setSelectedAddress(null); // Deselect list if typing manually
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                data-testid="manual-address-input"
                />
            </div>
            <div className="server-browser-actions">
                <button onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button
                className="primary"
                onClick={handleConnect}
                disabled={!selectedAddress && !manualAddress}
                data-testid="connect-button"
                >
                Connect
                </button>
            </div>
            </div>
        </>
        )}
      </div>
    </div>
  );
}
