import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { networkService, NetworkCallbacks } from '../../../src/services/networkService';
import { NetChan, ClientCommand, ServerCommand, BinaryWriter } from 'quake2ts/shared';

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: ((event: { reason: string }) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessage: ((event: { data: ArrayBuffer }) => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  binaryType = 'blob';

  constructor(public url: string) {}
}

(global as any).WebSocket = MockWebSocket;

// Mock NetChan
jest.mock('quake2ts/shared', () => {
  const actual = jest.requireActual('quake2ts/shared') as any;
  return {
    ...actual,
    NetChan: jest.fn().mockImplementation(() => ({
      setup: jest.fn(),
      reset: jest.fn(),
      transmit: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      process: jest.fn(),
      writeReliableByte: jest.fn(),
      writeReliableString: jest.fn(),
    })),
  };
});

describe('NetworkService', () => {
  let callbacks: NetworkCallbacks;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    callbacks = {
      onConnect: jest.fn(),
      onDisconnect: jest.fn(),
      onError: jest.fn(),
      onSnapshot: jest.fn(),
      onServerCommand: jest.fn(),
      onPrint: jest.fn(),
      onCenterPrint: jest.fn(),
      onStuffText: jest.fn(),
      onConfigString: jest.fn(),
    };
    networkService.setCallbacks(callbacks);
    // Force reset state
    (networkService as any).state = 'disconnected';
    (networkService as any).ws = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start disconnected', () => {
    expect(networkService.getState()).toBe('disconnected');
  });

  it('should connect to websocket', async () => {
    const connectPromise = networkService.connect('ws://localhost:8080');

    // Simulate connection open
    const ws = (networkService as any).ws;
    expect(ws).toBeDefined();
    ws.onopen();

    await connectPromise;
    expect(networkService.getState()).toBe('connected');
    expect(callbacks.onConnect).toHaveBeenCalled();
  });

  it('should handle connection failure with retries', async () => {
    const connectPromise = networkService.connect('ws://localhost:8080', 1);

    // Initial attempt
    await Promise.resolve(); // Yield to allow constructor to run
    let ws = (networkService as any).ws;
    expect(ws).toBeDefined();

    // Fail first attempt
    ws.onclose({ reason: 'Connection error 1' });

    // Advance time to trigger retry (1000ms delay)
    await jest.advanceTimersByTimeAsync(1000);

    // Second attempt (Retry 1)
    ws = (networkService as any).ws;
    expect(ws).toBeDefined();

    // Fail second attempt
    ws.onclose({ reason: 'Connection error 2' });

    // Expect failure after max retries exceeded
    await expect(connectPromise).rejects.toThrow('Connection error 2');
    expect(callbacks.onError).toHaveBeenCalled();
  });

  it('should handle incoming messages', async () => {
    const connectPromise = networkService.connect('ws://localhost:8080');
    const ws = (networkService as any).ws;
    ws.onopen();
    await connectPromise;

    // Mock NetChan process to return a buffer with NOP command
    const mockNetChan = (networkService as any).netchan;
    const writer = new BinaryWriter();
    writer.writeByte(ServerCommand.nop);
    mockNetChan.process.mockReturnValue(writer.getData());

    ws.onmessage({ data: new ArrayBuffer(1) });

    // Check if onServerCommand was called with NOP
    expect(callbacks.onServerCommand).toHaveBeenCalledWith(ServerCommand.nop, expect.anything());
  });

  it('should send client commands', async () => {
    const connectPromise = networkService.connect('ws://localhost:8080');
    const ws = (networkService as any).ws;
    ws.onopen();
    await connectPromise;

    networkService.sendClientCommand(ClientCommand.stringcmd, 'say hello');

    const mockNetChan = (networkService as any).netchan;
    expect(mockNetChan.writeReliableByte).toHaveBeenCalledWith(ClientCommand.stringcmd);
    expect(mockNetChan.writeReliableString).toHaveBeenCalledWith('say hello');
    expect(mockNetChan.transmit).toHaveBeenCalled();
    expect(ws.send).toHaveBeenCalled();
  });

  it('should parse various server commands', () => {
    const mockNetChan = (networkService as any).netchan;

    // Helper to inject command into netchan mock
    const injectCommand = (writerFn: (w: BinaryWriter) => void) => {
        const writer = new BinaryWriter();
        writerFn(writer);
        // Force process to return our data
        mockNetChan.process.mockReturnValueOnce(writer.getData());
        // Trigger message handling (data content doesn't matter as we mocked process result)
        (networkService as any).handleMessage(new ArrayBuffer(0));
    };

    // Test print
    injectCommand(w => {
        w.writeByte(ServerCommand.print);
        w.writeByte(1); // level
        w.writeString("Hello Console");
    });
    expect(callbacks.onPrint).toHaveBeenCalledWith(1, "Hello Console");

    // Test centerprint
    injectCommand(w => {
        w.writeByte(ServerCommand.centerprint);
        w.writeString("Center Message");
    });
    expect(callbacks.onCenterPrint).toHaveBeenCalledWith("Center Message");

    // Test stufftext
    injectCommand(w => {
        w.writeByte(ServerCommand.stufftext);
        w.writeString("cmd");
    });
    expect(callbacks.onStuffText).toHaveBeenCalledWith("cmd");

    // Test configstring
    injectCommand(w => {
        w.writeByte(ServerCommand.configstring);
        w.writeShort(10);
        w.writeString("cfg");
    });
    expect(callbacks.onConfigString).toHaveBeenCalledWith(10, "cfg");

    // Test serverdata
    injectCommand(w => {
        w.writeByte(ServerCommand.serverdata);
        w.writeLong(123); // protocol
        w.writeLong(1); // servercount
        w.writeByte(0); // attract
        w.writeString("baseq2"); // gamedir
        w.writeShort(0); // playernum
    });
    // No callback for serverdata, but ensures code path is covered

    // Test frame
    injectCommand(w => {
        w.writeByte(ServerCommand.frame);
        w.writeLong(100); // serverFrame
        w.writeLong(10); // deltaFrame
    });
    expect(callbacks.onSnapshot).toHaveBeenCalled();
 });

  it('should return qport', () => {
      expect(networkService.getQport()).toBeDefined();
  });

  it('should ping address', async () => {
      const pPromise = networkService.ping('localhost');
      await jest.advanceTimersByTimeAsync(200);
      const p = await pPromise;
      expect(p).toBeGreaterThanOrEqual(20);
  });
});
