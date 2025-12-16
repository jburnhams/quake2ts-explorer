import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NetChan } from 'quake2ts/shared';
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
            getData: jest.fn().mockReturnValue(new Uint8Array(0))
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
        // 2 = disconnect, string
        const payload = new Uint8Array(100);
        let p = 0;
        payload[p++] = 2; // ServerCommand.disconnect
        // String "Kick"
        // BinaryStream.readString usually reads until null or special char?
        // Assuming null term
        "Kick".split('').forEach(c => payload[p++] = c.charCodeAt(0));
        payload[p++] = 0;

        const data = payload.slice(0, p);
        mockProcess.mockReturnValue(data);

        (networkService as any).handleMessage(new ArrayBuffer(0));

        // Disconnect logic calls handleDisconnect('Server disconnected client')
        // OR parses string? Code: this.disconnect('Server disconnected client');
        // It does NOT read the string reason from packet in the code I read earlier?
        // Let's check code:
        // case ServerCommand.disconnect: this.disconnect('Server disconnected client'); break;
        // It ignores the reason in stream!

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
