import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoSettings } from '@/src/components/VideoSettings';
import { VideoRecordOptions } from '@/src/services/videoRecorder';

describe('VideoSettings', () => {
    const mockOnStart = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly when open', () => {
        render(<VideoSettings isOpen={true} onStart={mockOnStart} onClose={mockOnClose} />);
        expect(screen.getByText('Video Recording Settings')).toBeInTheDocument();
        expect(screen.getByText('Frame Rate:')).toBeInTheDocument();
        expect(screen.getByText('Quality (Bitrate):')).toBeInTheDocument();
        expect(screen.getByText('Resolution:')).toBeInTheDocument();
        expect(screen.getByText('Time Limit:')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<VideoSettings isOpen={false} onStart={mockOnStart} onClose={mockOnClose} />);
        expect(screen.queryByText('Video Recording Settings')).not.toBeInTheDocument();
    });

    it('calls onStart with correct options when Start Recording is clicked', () => {
        render(<VideoSettings isOpen={true} onStart={mockOnStart} onClose={mockOnClose} />);

        // Change Frame Rate to 60
        fireEvent.change(screen.getByLabelText('Frame Rate:'), { target: { value: '60' } });

        // Change Bitrate to High (5 Mbps)
        fireEvent.change(screen.getByLabelText('Quality (Bitrate):'), { target: { value: '5000000' } });

        // Change Resolution to 720p
        fireEvent.change(screen.getByLabelText('Resolution:'), { target: { value: '720p' } });

        // Change Time Limit to 10 minutes
        fireEvent.change(screen.getByLabelText('Time Limit:'), { target: { value: '600' } });

        // Click Start
        fireEvent.click(screen.getByText('Start Recording'));

        expect(mockOnStart).toHaveBeenCalledWith({
            fps: 60,
            videoBitsPerSecond: 5000000,
            mimeType: 'video/webm;codecs=vp9',
            width: 1280,
            height: 720,
            timeLimit: 600,
            audio: false
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles Match Canvas resolution', () => {
        render(<VideoSettings isOpen={true} onStart={mockOnStart} onClose={mockOnClose} />);

        fireEvent.change(screen.getByLabelText('Resolution:'), { target: { value: 'match' } });
        fireEvent.click(screen.getByText('Start Recording'));

        expect(mockOnStart).toHaveBeenCalledWith(expect.objectContaining({
            width: undefined,
            height: undefined
        }));
    });

    it('calls onClose when Cancel is clicked', () => {
        render(<VideoSettings isOpen={true} onStart={mockOnStart} onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('Cancel'));

        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnStart).not.toHaveBeenCalled();
    });
});
