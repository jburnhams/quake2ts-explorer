import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DropZone } from '@/src/components/DropZone';

describe('DropZone Component', () => {
  let mockOnDrop: jest.Mock;

  beforeEach(() => {
    mockOnDrop = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div data-testid="child">Child content</div>
      </DropZone>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('has drop zone container', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );
    expect(screen.getByTestId('drop-zone')).toBeInTheDocument();
  });

  it('does not show overlay initially', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );
    expect(screen.queryByTestId('drop-zone-overlay')).not.toBeInTheDocument();
  });

  it('shows overlay on drag enter with files', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    const dragEvent = new Event('dragenter', { bubbles: true });
    Object.defineProperty(dragEvent, 'dataTransfer', {
      value: { types: ['Files'] },
    });
    Object.defineProperty(dragEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(dragEvent, 'stopPropagation', { value: jest.fn() });

    act(() => {
      document.dispatchEvent(dragEvent);
    });

    expect(screen.getByTestId('drop-zone-overlay')).toBeInTheDocument();
  });

  it('hides overlay on drag leave', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    // Drag enter
    const enterEvent = new Event('dragenter', { bubbles: true });
    Object.defineProperty(enterEvent, 'dataTransfer', {
      value: { types: ['Files'] },
    });
    Object.defineProperty(enterEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(enterEvent, 'stopPropagation', { value: jest.fn() });

    act(() => {
      document.dispatchEvent(enterEvent);
    });

    expect(screen.getByTestId('drop-zone-overlay')).toBeInTheDocument();

    // Drag leave
    const leaveEvent = new Event('dragleave', { bubbles: true });
    Object.defineProperty(leaveEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(leaveEvent, 'stopPropagation', { value: jest.fn() });

    act(() => {
      document.dispatchEvent(leaveEvent);
    });

    expect(screen.queryByTestId('drop-zone-overlay')).not.toBeInTheDocument();
  });

  it('prevents default on dragover', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    const dragOverEvent = new Event('dragover', { bubbles: true });
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    Object.defineProperty(dragOverEvent, 'preventDefault', { value: preventDefault });
    Object.defineProperty(dragOverEvent, 'stopPropagation', { value: stopPropagation });

    act(() => {
      document.dispatchEvent(dragOverEvent);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('calls onDrop with pak files on drop', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    // First enter to show overlay
    const enterEvent = new Event('dragenter', { bubbles: true });
    Object.defineProperty(enterEvent, 'dataTransfer', {
      value: { types: ['Files'] },
    });
    Object.defineProperty(enterEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(enterEvent, 'stopPropagation', { value: jest.fn() });
    act(() => {
      document.dispatchEvent(enterEvent);
    });

    // Create mock file
    const mockFile = new File(['content'], 'test.pak', { type: 'application/octet-stream' });
    const mockDataTransfer = {
      files: [mockFile],
    };

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer });
    Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(dropEvent, 'stopPropagation', { value: jest.fn() });

    act(() => {
      document.dispatchEvent(dropEvent);
    });

    expect(mockOnDrop).toHaveBeenCalled();
  });

  it('filters non-pak files on drop', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    // Create non-pak file
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const mockDataTransfer = {
      files: [mockFile],
    };

    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer });
    Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(dropEvent, 'stopPropagation', { value: jest.fn() });

    act(() => {
      document.dispatchEvent(dropEvent);
    });

    // Should not call onDrop since no pak files
    expect(mockOnDrop).not.toHaveBeenCalled();
  });

  it('hides overlay after drop', () => {
    render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    // Enter
    const enterEvent = new Event('dragenter', { bubbles: true });
    Object.defineProperty(enterEvent, 'dataTransfer', {
      value: { types: ['Files'] },
    });
    Object.defineProperty(enterEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(enterEvent, 'stopPropagation', { value: jest.fn() });
    act(() => {
      document.dispatchEvent(enterEvent);
    });

    expect(screen.getByTestId('drop-zone-overlay')).toBeInTheDocument();

    // Drop
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [] } });
    Object.defineProperty(dropEvent, 'preventDefault', { value: jest.fn() });
    Object.defineProperty(dropEvent, 'stopPropagation', { value: jest.fn() });
    act(() => {
      document.dispatchEvent(dropEvent);
    });

    expect(screen.queryByTestId('drop-zone-overlay')).not.toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <DropZone onDrop={mockOnDrop}>
        <div>Content</div>
      </DropZone>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('dragenter', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('dragleave', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('dragover', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('drop', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
