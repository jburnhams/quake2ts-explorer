import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { networkService } from '../../../src/services/networkService';
import { WebSocket, Server } from 'mock-socket';
import { NetChan, ServerCommand } from 'quake2ts/shared';

// Mock the global WebSocket
(global as any).WebSocket = WebSocket;

describe('NetworkService Integration', () => {
  let mockServer: Server;
  const serverUrl = 'ws://localhost:8080';
  let serverNetChan: NetChan;
  let activeSocket: any; // Capture the active socket connection

  beforeEach(() => {
    mockServer = new Server(serverUrl);
    serverNetChan = new NetChan();
    serverNetChan.setup(networkService.getQport());

    mockServer.on('connection', (socket) => {
      activeSocket = socket;
      socket.on('message', (data) => {
        serverNetChan.process(new Uint8Array(data as ArrayBuffer));
      });
    });
  });

  afterEach(() => {
    mockServer.stop();
    networkService.disconnect();
  });

  it('should successfully connect and disconnect', async () => {
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();

    networkService.setCallbacks({
      onConnect,
      onDisconnect,
    });

    await networkService.connect(serverUrl);
    expect(networkService.getState()).toBe('connected');
    expect(onConnect).toHaveBeenCalled();

    networkService.disconnect();
    expect(networkService.getState()).toBe('disconnected');
    expect(onDisconnect).toHaveBeenCalled();
  });

  it('should receive messages from server', async () => {
    const onPrint = jest.fn();
    networkService.setCallbacks({ onPrint });

    await networkService.connect(serverUrl);

    // Prepare a server packet
    // We use serverNetChan to create a reliable message
    serverNetChan.writeReliableByte(ServerCommand.print);
    serverNetChan.writeReliableByte(2); // level
    serverNetChan.writeReliableString('Hello from Server');

    // Transmit generates the packet with headers
    const packet = serverNetChan.transmit();

    // Send via mock socket
    if (activeSocket) {
      activeSocket.send(packet.buffer);
    } else {
      throw new Error('No active socket connection to send data to');
    }

    // Allow event loop to process
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(onPrint).toHaveBeenCalledWith(2, 'Hello from Server');
  });
});
