import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoSettings } from '@/src/components/VideoSettings';
import { VideoRecordOptions } from '@/src/services/videoRecorder';

describe('VideoSettings', () => {
    const mockOnStart = jest.fn();
    const mockOnClose = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly when open', () => {
        render(<VideoSettings isOpen={true} onStart={mockOnStart} onClose={mockOnClose} />);
        expect(screen.getByText('Video Recording Settings')).toBeInTheDocument();
        expect(screen.getByText('Frame Rate:')).toBeInTheDocument();
        expect(screen.getByText('Quality (Bitrate):')).toBeInTheDocument();
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

        // Click Start
        fireEvent.click(screen.getByText('Start Recording'));

        expect(mockOnStart).toHaveBeenCalledWith({
            fps: 60,
            videoBitsPerSecond: 5000000,
            mimeType: 'video/webm;codecs=vp9'
        });
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when Cancel is clicked', () => {
        render(<VideoSettings isOpen={true} onStart={mockOnStart} onClose={mockOnClose} />);

        fireEvent.click(screen.getByText('Cancel'));

        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnStart).not.toHaveBeenCalled();
    });
});
