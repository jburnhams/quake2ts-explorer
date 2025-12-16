import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { predictionService } from '@/src/services/predictionService';
import { ClientPrediction } from 'quake2ts/client';

// Define mock functions
const mockSetPredictionEnabled = jest.fn();
const mockEnqueueCommand = jest.fn().mockReturnValue({});
const mockSetAuthoritative = jest.fn();
const mockGetPredictionError = jest.fn().mockReturnValue({x:10, y:0, z:0});
const mockDecayError = jest.fn();
const mockGetPredictedState = jest.fn().mockReturnValue({});

// Mock dependencies
jest.mock('quake2ts/client', () => ({
    ClientPrediction: jest.fn().mockImplementation(() => ({
        setPredictionEnabled: mockSetPredictionEnabled,
        enqueueCommand: mockEnqueueCommand,
        setAuthoritative: mockSetAuthoritative,
        getPredictionError: mockGetPredictionError,
        decayError: mockDecayError,
        getPredictedState: mockGetPredictedState
    }))
}));

describe('PredictionService Coverage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('initializes correctly', () => {
        predictionService.init({
            trace: jest.fn() as any,
            pointContents: jest.fn() as any
        });
        expect(ClientPrediction).toHaveBeenCalled();
    });

    it('setEnabled calls predictor', () => {
        predictionService.init({ trace: jest.fn() as any, pointContents: jest.fn() as any });
        predictionService.setEnabled(true);
        expect(mockSetPredictionEnabled).toHaveBeenCalledWith(true);
    });

    it('onServerFrame checks error threshold', () => {
        predictionService.init({ trace: jest.fn() as any, pointContents: jest.fn() as any });

        // Setup mock return for this test
        mockGetPredictionError.mockReturnValue({x:1, y:0, z:0});

        predictionService.onServerFrame({} as any, 1, 100);

        expect(mockSetAuthoritative).toHaveBeenCalled();
        expect(mockGetPredictionError).toHaveBeenCalled();
        expect(predictionService.getMispredictionCount()).toBeGreaterThan(0);
    });

    it('decayError delegates to predictor', () => {
        predictionService.init({ trace: jest.fn() as any, pointContents: jest.fn() as any });
        predictionService.decayError(16);
        expect(mockDecayError).toHaveBeenCalledWith(16);
    });

    it('getPredictedState delegates to predictor', () => {
        predictionService.init({ trace: jest.fn() as any, pointContents: jest.fn() as any });
        predictionService.getPredictedState();
        expect(mockGetPredictedState).toHaveBeenCalled();
    });
});
