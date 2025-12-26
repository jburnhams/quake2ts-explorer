
import { WebSocket as MockWebSocket } from 'mock-socket';

// Define mocks
const mockProcess = vi.fn().mockReturnValue(new Uint8Array(0));
const mockTransmit = vi.fn().mockReturnValue(new Uint8Array(0));
const mockSetup = vi.fn();
const mockReset = vi.fn();
const mockWriteReliableByte = vi.fn();
const mockWriteReliableString = vi.fn();

// Mock dependencies
vi.mock('@quake2ts/shared', async () => {
    const original = await vi.importActual('@quake2ts/shared') as any;
    return {
        ...original,
        NetChan: vi.fn().mockImplementation(() => ({
            setup: mockSetup,
            transmit: mockTransmit,
            reset: mockReset,
            process: mockProcess,
            writeReliableByte: mockWriteReliableByte,
            writeReliableString: mockWriteReliableString
        })),
        BinaryWriter: vi.fn().mockImplementation(() => ({
            writeByte: vi.fn(),
            writeShort: vi.fn(),
            writeLong: vi.fn(),
            writeString: vi.fn(),
            writeAngle16: vi.fn(),
            writeFloat: vi.fn(),
            getData: vi.fn().mockReturnValue(new Uint8Array(0))
        })),
        BinaryStream: vi.fn().mockImplementation(() => ({
            readByte: vi.fn().mockReturnValue(original.ServerCommand.disconnect),
            readShort: vi.fn().mockReturnValue(0),
            readLong: vi.fn().mockReturnValue(0),
            readString: vi.fn().mockReturnValue(""),
            hasMore: vi.fn()
                .mockReturnValueOnce(true)
                .mockReturnValue(false),
            hasBytes: vi.fn().mockReturnValue(true)
        }))
    };
});

describe('NetworkService Coverage', () => {
    let networkService: any;
    let mockCallbacks: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        // Mock global WebSocket
        (global as any).WebSocket = MockWebSocket;

        // Re-import service
        const module = await import('@/src/services/networkService');
        networkService = module.networkService;

        mockCallbacks = {
            onDisconnect: vi.fn()
        };
        networkService.setCallbacks(mockCallbacks);
    });

    afterEach(() => {
        if (networkService) networkService.disconnect();
    });

    it('handles disconnect server command', () => {
        (networkService as any).state = 'connected';

        const payload = new Uint8Array([2]);
        mockProcess.mockReturnValue(payload);

        (networkService as any).handleMessage(new ArrayBuffer(0));

        expect(mockCallbacks.onDisconnect).toHaveBeenCalledWith('Server disconnected client');
    });

    it('throttles sendCommand', () => {
        vi.useFakeTimers();
        vi.advanceTimersByTime(1000);

        const cmd = {
            msec: 0, buttons: 0, angles: {x:0,y:0,z:0},
            forwardmove: 0, sidemove: 0, upmove: 0, impulse: 0, lightlevel: 0
        };

        networkService.sendCommand(cmd); // First send
        expect(mockTransmit).toHaveBeenCalledTimes(1);

        networkService.sendCommand(cmd); // Throttled
        expect(mockTransmit).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(20);
        networkService.sendCommand(cmd);
        expect(mockTransmit).toHaveBeenCalledTimes(2);

        vi.useRealTimers();
    });
});
