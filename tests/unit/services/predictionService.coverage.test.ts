
import { predictionService } from '@/src/services/predictionService';
import { ClientPrediction } from 'quake2ts/client';

// Define mock functions
const mockSetPredictionEnabled = vi.fn();
const mockEnqueueCommand = vi.fn().mockReturnValue({});
const mockSetAuthoritative = vi.fn();
const mockGetPredictionError = vi.fn().mockReturnValue({x:10, y:0, z:0});
const mockDecayError = vi.fn();
const mockGetPredictedState = vi.fn().mockReturnValue({});

// Mock dependencies
vi.mock('quake2ts/client', () => ({
    ClientPrediction: vi.fn().mockImplementation(() => ({
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
        vi.clearAllMocks();
    });

    it('initializes correctly', () => {
        predictionService.init({
            trace: vi.fn() as any,
            pointContents: vi.fn() as any
        });
        expect(ClientPrediction).toHaveBeenCalled();
    });

    it('setEnabled calls predictor', () => {
        predictionService.init({ trace: vi.fn() as any, pointContents: vi.fn() as any });
        predictionService.setEnabled(true);
        expect(mockSetPredictionEnabled).toHaveBeenCalledWith(true);
    });

    it('onServerFrame checks error threshold', () => {
        predictionService.init({ trace: vi.fn() as any, pointContents: vi.fn() as any });

        // Setup mock return for this test
        mockGetPredictionError.mockReturnValue({x:1, y:0, z:0});

        predictionService.onServerFrame({} as any, 1, 100);

        expect(mockSetAuthoritative).toHaveBeenCalled();
        expect(mockGetPredictionError).toHaveBeenCalled();
        expect(predictionService.getMispredictionCount()).toBeGreaterThan(0);
    });

    it('decayError delegates to predictor', () => {
        predictionService.init({ trace: vi.fn() as any, pointContents: vi.fn() as any });
        predictionService.decayError(16);
        expect(mockDecayError).toHaveBeenCalledWith(16);
    });

    it('getPredictedState delegates to predictor', () => {
        predictionService.init({ trace: vi.fn() as any, pointContents: vi.fn() as any });
        predictionService.getPredictedState();
        expect(mockGetPredictedState).toHaveBeenCalled();
    });
});
