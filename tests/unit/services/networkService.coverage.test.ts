import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WebSocket as MockWebSocket } from 'mock-socket';

// Define mocks
const mockProcess = jest.fn().mockReturnValue(new Uint8Array(0));
const mockTransmit = jest.fn().mockReturnValue(new Uint8Array(0));
const mockSetup = jest.fn();
const mockReset = jest.fn();
const mockWriteReliableByte = jest.fn();
const mockWriteReliableString = jest.fn();

// Mock dependencies
jest.mock('quake2ts/shared', () => {
    const original = jest.requireActual('quake2ts/shared') as any;
    return {
        ...original,
        NetChan: jest.fn().mockImplementation(() => ({
            setup: mockSetup,
            transmit: mockTransmit,
            reset: mockReset,
            process: mockProcess,
            writeReliableByte: mockWriteReliableByte,
            writeReliableString: mockWriteReliableString
        })),
        BinaryWriter: jest.fn().mockImplementation(() => ({
            writeByte: jest.fn(),
            writeShort: jest.fn(),
            writeLong: jest.fn(),
            writeString: jest.fn(),
            writeAngle16: jest.fn(),
            writeFloat: jest.fn(),
            getData: jest.fn().mockReturnValue(new Uint8Array(0))
        })),
        BinaryStream: jest.fn().mockImplementation(() => ({
            readByte: jest.fn().mockReturnValue(original.ServerCommand.disconnect),
            readShort: jest.fn().mockReturnValue(0),
            readLong: jest.fn().mockReturnValue(0),
            readString: jest.fn().mockReturnValue(""),
            hasMore: jest.fn()
                .mockReturnValueOnce(true)
                .mockReturnValue(false),
            hasBytes: jest.fn().mockReturnValue(true)
        }))
    };
});

describe('NetworkService Coverage', () => {
    let networkService: any;
    let mockCallbacks: any;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.resetModules();

        // Mock global WebSocket
        (global as any).WebSocket = MockWebSocket;

        // Re-import service
        const module = await import('@/src/services/networkService');
        networkService = module.networkService;

        mockCallbacks = {
            onDisconnect: jest.fn()
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
        jest.useFakeTimers();
        jest.advanceTimersByTime(1000);

        const cmd = {
            msec: 0, buttons: 0, angles: {x:0,y:0,z:0},
            forwardmove: 0, sidemove: 0, upmove: 0, impulse: 0, lightlevel: 0
        };

        networkService.sendCommand(cmd); // First send
        expect(mockTransmit).toHaveBeenCalledTimes(1);

        networkService.sendCommand(cmd); // Throttled
        expect(mockTransmit).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(20);
        networkService.sendCommand(cmd);
        expect(mockTransmit).toHaveBeenCalledTimes(2);

        jest.useRealTimers();
    });
});
