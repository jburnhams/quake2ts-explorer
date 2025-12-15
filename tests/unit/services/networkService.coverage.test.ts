
import { ClientCommand, ServerCommand } from 'quake2ts/shared';

const mockNetChanInstance = {
    setup: jest.fn(),
    reset: jest.fn(),
    transmit: jest.fn(),
    writeReliableByte: jest.fn(),
    writeReliableString: jest.fn(),
    process: jest.fn()
};

const mockBinaryStreamInstance = {
    hasMore: jest.fn(),
    readByte: jest.fn(),
    readShort: jest.fn(),
    readLong: jest.fn(),
    readString: jest.fn(),
    hasBytes: jest.fn().mockReturnValue(true)
};

jest.mock('quake2ts/shared', () => {
    return {
        NetChan: jest.fn().mockImplementation(() => mockNetChanInstance),
        BinaryStream: jest.fn().mockImplementation(() => mockBinaryStreamInstance),
        BinaryWriter: jest.fn().mockImplementation(() => ({
             writeByte: jest.fn(),
             getData: jest.fn().mockReturnValue(new Uint8Array([4, 5, 6]))
        })),
        writeUserCommand: jest.fn(),
        ClientCommand: {
            userinfo: 1,
            move: 2
        },
        ServerCommand: {
            nop: 0,
            print: 1,
            serverdata: 2,
            frame: 3,
            disconnect: 4,
            configstring: 5,
            centerprint: 6,
            stufftext: 7
        },
        MAX_MSGLEN: 1400
    };
});

describe('NetworkService Coverage', () => {
    let networkService: any;
    let mockWebSocket: any;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks(); // Clears call history

        // Reset implementations manually
        mockNetChanInstance.setup.mockReset();
        mockNetChanInstance.reset.mockReset();
        mockNetChanInstance.transmit.mockReset();
        mockNetChanInstance.writeReliableByte.mockReset();
        mockNetChanInstance.writeReliableString.mockReset();
        mockNetChanInstance.process.mockReset();

        mockBinaryStreamInstance.hasMore.mockReset();
        mockBinaryStreamInstance.readByte.mockReset();
        mockBinaryStreamInstance.readShort.mockReset();
        mockBinaryStreamInstance.readLong.mockReset();
        mockBinaryStreamInstance.readString.mockReset();
        mockBinaryStreamInstance.hasBytes.mockReset();

        // Defaults
        mockNetChanInstance.transmit.mockReturnValue(new Uint8Array([1, 2, 3]));
        mockBinaryStreamInstance.hasBytes.mockReturnValue(true);

        // Mock global WebSocket
        mockWebSocket = {
            binaryType: 'blob',
            send: jest.fn(),
            close: jest.fn(),
            readyState: 1, // OPEN
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null
        };

        global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket) as any;
        (global.WebSocket as any).OPEN = 1;

        const mod = require('@/src/services/networkService');
        networkService = mod.networkService;
    });

    it('should initialize with disconnected state', () => {
        expect(networkService.getState()).toBe('disconnected');
    });

    it('should connect successfully', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;
        expect(networkService.getState()).toBe('connected');
        expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should handle disconnect', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        const onDisconnect = jest.fn();
        networkService.setCallbacks({ onDisconnect });

        networkService.disconnect('User quit');

        expect(mockWebSocket.close).toHaveBeenCalled();
        expect(networkService.getState()).toBe('disconnected');
        expect(onDisconnect).toHaveBeenCalledWith('User quit');
    });

    it('should queue packets when not connected', async () => {
        networkService.disconnect();
        networkService.sendClientCommand(ClientCommand.move);

        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should send user command throttled', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        networkService.sendCommand({} as any);
        expect(mockWebSocket.send).toHaveBeenCalled();

        mockWebSocket.send.mockClear();
        networkService.sendCommand({} as any);
        expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should process server messages', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        const onPrint = jest.fn();
        const onServerCommand = jest.fn();
        networkService.setCallbacks({ onPrint, onServerCommand });

        mockNetChanInstance.process.mockReturnValue(new Uint8Array([1]));

        mockBinaryStreamInstance.hasMore
            .mockReturnValueOnce(true)
            .mockReturnValue(false);
        mockBinaryStreamInstance.readByte
            .mockReturnValueOnce(ServerCommand.print)
            .mockReturnValueOnce(0); // Level
        mockBinaryStreamInstance.readString.mockReturnValue("Hello");

        if (mockWebSocket.onmessage) mockWebSocket.onmessage({ data: new ArrayBuffer(10) });

        expect(onPrint).toHaveBeenCalledWith(0, "Hello");
        expect(onServerCommand).toHaveBeenCalled();
    });

    it('should handle server disconnect command', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        const onDisconnect = jest.fn();
        networkService.setCallbacks({ onDisconnect });

        mockNetChanInstance.process.mockReturnValue(new Uint8Array([1]));

        mockBinaryStreamInstance.hasMore.mockReturnValueOnce(true).mockReturnValue(false);
        mockBinaryStreamInstance.readByte.mockReturnValueOnce(ServerCommand.disconnect);

        if (mockWebSocket.onmessage) mockWebSocket.onmessage({ data: new ArrayBuffer(10) });

        expect(onDisconnect).toHaveBeenCalledWith('Server disconnected client');
    });

    it('should handle multiple server commands (centerprint, stufftext, configstring)', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        const onCenterPrint = jest.fn();
        const onStuffText = jest.fn();
        const onConfigString = jest.fn();
        networkService.setCallbacks({ onCenterPrint, onStuffText, onConfigString });

        mockNetChanInstance.process.mockReturnValue(new Uint8Array([1]));

        let callCount = 0;
        mockBinaryStreamInstance.hasMore.mockImplementation(() => callCount++ < 3);

        mockBinaryStreamInstance.readByte
                .mockReturnValueOnce(ServerCommand.centerprint)
                .mockReturnValueOnce(ServerCommand.stufftext)
                .mockReturnValueOnce(ServerCommand.configstring);

        mockBinaryStreamInstance.readString.mockReturnValue("data");
        mockBinaryStreamInstance.readShort.mockReturnValue(1);
        mockBinaryStreamInstance.readLong.mockReturnValue(1);

        if (mockWebSocket.onmessage) mockWebSocket.onmessage({ data: new ArrayBuffer(10) });

        expect(onCenterPrint).toHaveBeenCalledWith("data");
        expect(onStuffText).toHaveBeenCalledWith("data");
        expect(onConfigString).toHaveBeenCalledWith(1, "data");
    });

    it('should handle serverdata command', async () => {
        const connectPromise = networkService.connect('ws://localhost:8080');
        setTimeout(() => { if (mockWebSocket.onopen) mockWebSocket.onopen(); }, 0);
        await connectPromise;

        mockNetChanInstance.process.mockReturnValue(new Uint8Array([1]));

        mockBinaryStreamInstance.hasMore.mockReturnValueOnce(true).mockReturnValue(false);
        mockBinaryStreamInstance.readByte.mockReturnValueOnce(ServerCommand.serverdata);
        mockBinaryStreamInstance.readString.mockReturnValue("game");
        mockBinaryStreamInstance.readLong.mockReturnValue(1);
        mockBinaryStreamInstance.readShort.mockReturnValue(1);

        if (mockWebSocket.onmessage) mockWebSocket.onmessage({ data: new ArrayBuffer(10) });
    });
});
