import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth?: number;
  position: 'left' | 'right';
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  title?: string;
  testId?: string;
}

export function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth = 600,
  position,
  collapsed = false,
  onCollapsedChange,
  className = '',
  title,
  testId,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const delta = position === 'left'
        ? e.clientX - startXRef.current
        : startXRef.current - e.clientX;

      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, position, minWidth, maxWidth]);

  const toggleCollapse = useCallback(() => {
    onCollapsedChange?.(!collapsed);
  }, [collapsed, onCollapsedChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCollapse();
    }
  }, [toggleCollapse]);

  if (collapsed) {
    return (
      <div
        ref={panelRef}
        className={`resizable-panel resizable-panel-collapsed ${className}`}
        data-testid={testId}
        data-position={position}
      >
        <button
          className="panel-expand-button"
          onClick={toggleCollapse}
          onKeyDown={handleKeyDown}
          title={`Expand ${title || 'panel'}`}
          aria-label={`Expand ${title || 'panel'}`}
        >
          {position === 'left' ? '\u25B6' : '\u25C0'}
        </button>
        {title && <span className="panel-collapsed-title">{title}</span>}
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={`resizable-panel ${className}`}
      style={{ width: `${width}px` }}
      data-testid={testId}
      data-position={position}
    >
      <div className="panel-header">
        {title && <span className="panel-title">{title}</span>}
        <button
          className="panel-collapse-button"
          onClick={toggleCollapse}
          onKeyDown={handleKeyDown}
          title={`Collapse ${title || 'panel'}`}
          aria-label={`Collapse ${title || 'panel'}`}
        >
          {position === 'left' ? '\u25C0' : '\u25B6'}
        </button>
      </div>
      <div className="panel-content">
        {children}
      </div>
      <div
        className={`resize-handle resize-handle-${position}`}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        aria-label="Resize panel"
      />
    </div>
  );
}
