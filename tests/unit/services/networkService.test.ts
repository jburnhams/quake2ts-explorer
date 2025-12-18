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
  // We can't import strictly from test-utils here easily if it's not a standard module,
  // but we set up the alias in jest config.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createNetChanMock } = require('quake2ts/test-utils');
  return {
    ...actual,
    NetChan: jest.fn().mockImplementation(() => {
        const mock = createNetChanMock();
        // Override default transmit to match test expectations
        mock.transmit.mockReturnValue(new Uint8Array([1, 2, 3]));
        return mock;
    }),
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

  it('should query server info successfully', async () => {
    // Setup a mock WebSocket for the query
    const ws = new MockWebSocket('ws://localhost:27910');
    (global as any).WebSocket = jest.fn(() => ws);

    // Mock NetChan for the query specifically
    // Since queryServer creates its own NetChan internally, we rely on the jest.mock above
    // to intercept it.

    // We need to access the NetChan instance created inside queryServer.
    // The jest.mock implementation returns a new mock object each time NetChan is instantiated.
    // We can capture it if we spy on it, or we can just mock process return value globally
    // since we control when onmessage fires.

    const queryPromise = networkService.queryServer('ws://localhost:27910');

    // Simulate connection open
    ws.onopen!();

    // Construct a mock server packet with serverdata and configstrings
    // CS_NAME=0, CS_MAPNAME=31, CS_MAXCLIENTS=30

    // We need to inject data that the MockNetChan.process returns
    // Since our mock implementation of process returns [1, 2, 3] by default (see top of file),
    // we need to override it for this test case. But `process` is a method on the instance.
    // We can use mockImplementationOnce on the class mock constructor?
    // The current mock setup is: NetChan: jest.fn().mockImplementation(() => ({ ... }))

    // Let's grab the last created NetChan mock instance
    const MockNetChan = require('quake2ts/shared').NetChan;
    const mockQueryNetChan = MockNetChan.mock.results[MockNetChan.mock.calls.length - 1].value;

    // Prepare response packet data
    const writer = new BinaryWriter();

    // ServerData
    writer.writeByte(ServerCommand.serverdata);
    writer.writeLong(34); // protocol
    writer.writeLong(1); // serverCount
    writer.writeByte(0); // attractLoop
    writer.writeString('baseq2'); // gameDir
    writer.writeShort(0); // playerNum

    // ConfigStrings - Order matches standard protocol (global first, then players)
    // CS_MAXCLIENTS (30)
    writer.writeByte(ServerCommand.configstring);
    writer.writeShort(30);
    writer.writeString('16');

    // CS_NAME (0)
    writer.writeByte(ServerCommand.configstring);
    writer.writeShort(0);
    writer.writeString('My Server');

    // CS_MAPNAME (31)
    writer.writeByte(ServerCommand.configstring);
    writer.writeShort(31);
    writer.writeString('q2dm1');

    // CS_PLAYERSKINS (1312 + i) - Simulate 2 players
    // Player 1
    writer.writeByte(ServerCommand.configstring);
    writer.writeShort(1312 + 0);
    writer.writeString('male/grunt');

    // Player 2
    writer.writeByte(ServerCommand.configstring);
    writer.writeShort(1312 + 1);
    writer.writeString('female/athena');

    // Frame (signals end of gamestate)
    writer.writeByte(ServerCommand.frame);
    writer.writeLong(1); // serverFrame
    writer.writeLong(0); // deltaFrame

    // Mock process to return this data
    mockQueryNetChan.process.mockReturnValue(writer.getData());

    // Simulate receiving message
    ws.onmessage!({ data: new ArrayBuffer(0) });

    // Assert
    const info = await queryPromise;
    expect(info).toMatchObject({
        address: 'ws://localhost:27910',
        name: 'My Server',
        map: 'q2dm1',
        maxPlayers: 16,
        gamemode: 'baseq2',
        players: 2
    });

    expect(ws.close).toHaveBeenCalled();
  });

  it('should handle query timeout', async () => {
    const ws = new MockWebSocket('ws://localhost:27910');
    (global as any).WebSocket = jest.fn(() => ws);

    const queryPromise = networkService.queryServer('ws://localhost:27910');

    // Simulate connection but no message
    // Note: If we don't await this, the advanceTimers might run before onopen in real loop,
    // but in jest fake timers environment, sync callbacks should be fine.
    // However, if the promise rejection happens inside a timeout callback,
    // we must ensure that rejection is caught by the test expectation.

    ws.onopen!();

    // Advance timers past timeout (5000ms)
    // We use a try-catch block or .catch to handle the promise if we want to suppress the unhandled rejection warning
    // but expect(...).rejects should handle it.
    // The issue might be that advanceTimersByTimeAsync triggers the rejection
    // which happens *before* we await `expect(queryPromise)`.
    // Wait, queryPromise is a pending promise. When we advance time, it rejects.
    // If nothing has a .catch on it YET, node might complain about unhandled rejection?
    // But we attach the handler in the next line.

    // Let's try wrapping the advance and expect together or ensure order is correct.
    // Actually, advanceTimersByTimeAsync is async. The timeout callback fires.
    // The promise rejects.

    const timerPromise = jest.advanceTimersByTimeAsync(6000);
    await expect(queryPromise).rejects.toThrow('Query timeout');
    await timerPromise;

    expect(ws.close).toHaveBeenCalled();
  });
});
