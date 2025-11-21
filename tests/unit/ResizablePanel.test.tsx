import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResizablePanel } from '@/src/components/ResizablePanel';

describe('ResizablePanel', () => {
  describe('rendering', () => {
    it('renders children correctly', () => {
      render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="left">
          <div data-testid="child">Content</div>
        </ResizablePanel>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('applies default width', () => {
      const { container } = render(
        <ResizablePanel defaultWidth={300} minWidth={180} position="left">
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = container.querySelector('.resizable-panel');
      expect(panel).toHaveStyle({ width: '300px' });
    });

    it('renders with title', () => {
      render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="left" title="Files">
          <div>Content</div>
        </ResizablePanel>
      );

      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('renders resize handle', () => {
      const { container } = render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="left">
          <div>Content</div>
        </ResizablePanel>
      );

      const handle = container.querySelector('.resize-handle');
      expect(handle).toBeInTheDocument();
    });

    it('renders with correct position attribute', () => {
      const { container } = render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="right"
          testId="test-panel"
        >
          <div>Content</div>
        </ResizablePanel>
      );

      const panel = screen.getByTestId('test-panel');
      expect(panel).toHaveAttribute('data-position', 'right');
    });
  });

  describe('collapse functionality', () => {
    it('renders collapse button when not collapsed', () => {
      render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="left" title="Files">
          <div>Content</div>
        </ResizablePanel>
      );

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      expect(collapseButton).toBeInTheDocument();
    });

    it('renders expand button when collapsed', () => {
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          title="Files"
          collapsed={true}
        >
          <div>Content</div>
        </ResizablePanel>
      );

      const expandButton = screen.getByRole('button', { name: /expand/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('calls onCollapsedChange when collapse button clicked', () => {
      const onCollapsedChange = jest.fn();
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          title="Files"
          collapsed={false}
          onCollapsedChange={onCollapsedChange}
        >
          <div>Content</div>
        </ResizablePanel>
      );

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      fireEvent.click(collapseButton);

      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });

    it('calls onCollapsedChange when expand button clicked', () => {
      const onCollapsedChange = jest.fn();
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          title="Files"
          collapsed={true}
          onCollapsedChange={onCollapsedChange}
        >
          <div>Content</div>
        </ResizablePanel>
      );

      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.click(expandButton);

      expect(onCollapsedChange).toHaveBeenCalledWith(false);
    });

    it('shows collapsed title when collapsed', () => {
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          title="Files"
          collapsed={true}
        >
          <div>Content</div>
        </ResizablePanel>
      );

      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('hides children when collapsed', () => {
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          collapsed={true}
        >
          <div data-testid="child">Content</div>
        </ResizablePanel>
      );

      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });
  });

  describe('resize handle', () => {
    it('has correct class for left position', () => {
      const { container } = render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="left">
          <div>Content</div>
        </ResizablePanel>
      );

      const handle = container.querySelector('.resize-handle-left');
      expect(handle).toBeInTheDocument();
    });

    it('has correct class for right position', () => {
      const { container } = render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="right">
          <div>Content</div>
        </ResizablePanel>
      );

      const handle = container.querySelector('.resize-handle-right');
      expect(handle).toBeInTheDocument();
    });

    it('has separator role for accessibility', () => {
      const { container } = render(
        <ResizablePanel defaultWidth={280} minWidth={180} position="left">
          <div>Content</div>
        </ResizablePanel>
      );

      const handle = container.querySelector('[role="separator"]');
      expect(handle).toBeInTheDocument();
    });
  });

  describe('keyboard accessibility', () => {
    it('collapse button responds to Enter key', () => {
      const onCollapsedChange = jest.fn();
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          title="Files"
          onCollapsedChange={onCollapsedChange}
        >
          <div>Content</div>
        </ResizablePanel>
      );

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      fireEvent.keyDown(collapseButton, { key: 'Enter' });

      expect(onCollapsedChange).toHaveBeenCalledWith(true);
    });

    it('expand button responds to Space key', () => {
      const onCollapsedChange = jest.fn();
      render(
        <ResizablePanel
          defaultWidth={280}
          minWidth={180}
          position="left"
          title="Files"
          collapsed={true}
          onCollapsedChange={onCollapsedChange}
        >
          <div>Content</div>
        </ResizablePanel>
      );

      const expandButton = screen.getByRole('button', { name: /expand/i });
      fireEvent.keyDown(expandButton, { key: ' ' });

      expect(onCollapsedChange).toHaveBeenCalledWith(false);
    });
  });
});
