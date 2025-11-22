import { render, waitFor, act } from '@testing-library/react';
import { SpriteViewer } from '../../src/components/SpriteViewer';
import { SpriteModel } from 'quake2ts/engine';

// Mock quake2ts/engine
jest.mock('quake2ts/engine', () => ({
    parsePcx: jest.fn().mockReturnValue({ width: 10, height: 10, palette: new Uint8Array(0), pixels: new Uint8Array(0) }),
    pcxToRgba: jest.fn().mockReturnValue(new Uint8Array(10 * 10 * 4).fill(255)),
}));

const mockParsePcx = require('quake2ts/engine').parsePcx;
const mockPcxToRgba = require('quake2ts/engine').pcxToRgba;

describe('SpriteViewer', () => {
    const model: SpriteModel = {
        ident: 123,
        version: 2,
        numFrames: 2,
        frames: [
            { name: 'sprites/frame1.pcx', width: 10, height: 10, originX: 0, originY: 0 },
            { name: 'sprites/frame2.pcx', width: 10, height: 10, originX: 0, originY: 0 },
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        (console.warn as jest.Mock).mockRestore();
    });

    it('should load frames and render the first frame', async () => {
        const loadFile = jest.fn().mockResolvedValue(new Uint8Array(100));

        const { container } = render(<SpriteViewer model={model} loadFile={loadFile} />);

        // Wait for frames to load
        await waitFor(() => {
            expect(loadFile).toHaveBeenCalledTimes(2);
            expect(loadFile).toHaveBeenCalledWith('sprites/frame1.pcx');
            expect(loadFile).toHaveBeenCalledWith('sprites/frame2.pcx');
        });

        expect(mockParsePcx).toHaveBeenCalledTimes(2);
        expect(mockPcxToRgba).toHaveBeenCalledTimes(2);

        // Check if canvas has correct size
        const canvas = container.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas?.width).toBe(10);
        expect(canvas?.height).toBe(10);
    });

    it('should handle load errors gracefully', async () => {
        const loadFile = jest.fn()
            .mockResolvedValueOnce(new Uint8Array(100)) // Frame 1 ok
            .mockRejectedValueOnce(new Error('Failed')); // Frame 2 fail

        render(<SpriteViewer model={model} loadFile={loadFile} />);

        await waitFor(() => {
            expect(loadFile).toHaveBeenCalledTimes(2);
        });

        // Should still render frame 1 (assuming it was loaded first)
        // We verify that it didn't crash and attempted to load both
    });

    it('should cycle frames', async () => {
        jest.useFakeTimers();
        const loadFile = jest.fn().mockResolvedValue(new Uint8Array(100));

        const { container } = render(<SpriteViewer model={model} loadFile={loadFile} />);

        await waitFor(() => {
            expect(loadFile).toHaveBeenCalledTimes(2);
        });

        const initialText = container.textContent || '';

        // Advance time
        act(() => {
            jest.advanceTimersByTime(110);
        });

        const newText = container.textContent || '';
        expect(newText).not.toEqual(initialText);

        // It should have toggled between 1 and 2
        const hasFrame1 = newText.includes('Frame: 1 / 2');
        const hasFrame2 = newText.includes('Frame: 2 / 2');
        expect(hasFrame1 || hasFrame2).toBe(true);

        jest.useRealTimers();
    });
});
