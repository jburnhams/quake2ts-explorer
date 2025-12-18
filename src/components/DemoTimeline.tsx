import React, { useEffect, useRef, useState } from 'react';
import { DemoPlaybackController, DemoEvent, DemoEventType } from 'quake2ts/engine';
import { Bookmark } from '@/src/services/bookmarkService';
import './DemoTimeline.css';

interface DemoTimelineProps {
  controller: DemoPlaybackController;
  bookmarks: Bookmark[];
  onBookmarkClick?: (frame: number) => void;
  onExtractClip?: (start: number, end: number) => void;
}

const ThumbnailStrip = React.memo(({ duration, zoomLevel, zoomOffset, width }: { duration: number, zoomLevel: number, zoomOffset: number, width: number }) => {
  const visibleDuration = duration / zoomLevel;

  // Calculate interval to get roughly 100px per thumbnail
  let interval = 1;
  if (width > 0 && visibleDuration > 0) {
      const pixelsPerSecond = width / visibleDuration;
      const targetInterval = 100 / pixelsPerSecond;

      const intervals = [1, 2, 5, 10, 15, 30, 60];
      interval = intervals.find(i => i >= targetInterval) || 60;
  }

  const startIdx = Math.floor(zoomOffset / interval);
  const endIdx = Math.ceil((zoomOffset + visibleDuration) / interval);

  const thumbnails = [];
  for (let i = startIdx; i < endIdx; i++) {
      const time = i * interval;
      if (time > duration) break;

      const leftPercent = ((time - zoomOffset) / visibleDuration) * 100;
      const widthPercent = (interval / visibleDuration) * 100;

      // Don't render if completely out of view (sanity check)
      if (leftPercent + widthPercent < 0 || leftPercent > 100) continue;

      thumbnails.push(
          <div
            key={time}
            className="timeline-thumbnail"
            style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`
            }}
          >
              <div className="thumb-placeholder">
                  {Math.floor(time)}s
              </div>
          </div>
      );
  }

  return (
    <div className="thumbnail-strip">
        {thumbnails}
    </div>
  );
});

export function DemoTimeline({ controller, bookmarks = [], onBookmarkClick, onExtractClip }: DemoTimelineProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>([]);

  // Selection state
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100% (fit to width), 2 = 200%, etc.
  const [zoomOffset, setZoomOffset] = useState(0); // Offset in seconds

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [trackWidth, setTrackWidth] = useState(0);

  // Measure width
  useEffect(() => {
    const handleResize = () => {
        if (trackRef.current) {
            setTrackWidth(trackRef.current.clientWidth);
        }
    };
    window.addEventListener('resize', handleResize);
    // Initial measurement
    handleResize();
    // Also try slightly later in case layout shifts
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Format time as mm:ss.ms
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 100) % 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!controller) return;

    // Initial state
    setDuration(controller.getDuration());
    setTotalFrames(controller.getFrameCount());

    if (controller.getDemoEvents) {
        setEvents(controller.getDemoEvents());
    }

    const update = () => {
      if (!isDragging && !isSelecting) {
        setCurrentTime(controller.getCurrentTime());
        setCurrentFrame(controller.getCurrentFrame());
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [controller, isDragging, isSelecting]);

  // Adjust zoom offset to keep current time visible if moving out of view
  useEffect(() => {
      if (isDragging || isSelecting) return;

      const visibleDuration = duration / zoomLevel;
      if (currentTime < zoomOffset) {
          setZoomOffset(Math.max(0, currentTime - visibleDuration * 0.1));
      } else if (currentTime > zoomOffset + visibleDuration) {
          setZoomOffset(Math.min(duration - visibleDuration, currentTime - visibleDuration * 0.9));
      }
  }, [currentTime, zoomLevel, zoomOffset, duration, isDragging, isSelecting]);

  const getTimeFromClientX = (clientX: number, rect: DOMRect) => {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = x / rect.width;

      const visibleDuration = duration / zoomLevel;
      const time = zoomOffset + (percent * visibleDuration);
      return Math.max(0, Math.min(duration, time));
  };

  const handleSeek = (e: React.MouseEvent | MouseEvent) => {
    if (!trackRef.current || !controller) return;

    const rect = trackRef.current.getBoundingClientRect();
    const time = getTimeFromClientX(e.clientX, rect);

    if (isDragging) {
       // Just update UI while dragging
       setCurrentTime(time);
    } else {
       // Commit seek
       controller.seekToTime(time);
    }
  };

  const handleSelectionDrag = (e: React.MouseEvent | MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const time = getTimeFromClientX(e.clientX, rect);
      setSelectionEnd(time);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      // Only seek on left click
      if (e.button !== 0) return;

      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const time = getTimeFromClientX(e.clientX, rect);

      if (e.shiftKey) {
          // Start selection
          setIsSelecting(true);
          setSelectionStart(time);
          setSelectionEnd(time);
      } else {
          // Normal seek
          setIsDragging(true);
          handleSeek(e);

          // Clear selection on normal click unless shift is held
          if (selectionStart !== null) {
              setSelectionStart(null);
              setSelectionEnd(null);
          }
      }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSeek(e);
      } else if (isSelecting) {
          handleSelectionDrag(e);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        if (trackRef.current) {
            const rect = trackRef.current.getBoundingClientRect();
            const time = getTimeFromClientX(e.clientX, rect);
            controller.seekToTime(time);
        }
        setIsDragging(false);
      } else if (isSelecting) {
          setIsSelecting(false);
          // Ensure start < end
          if (selectionStart !== null && selectionEnd !== null) {
              if (selectionStart > selectionEnd) {
                  setSelectionStart(selectionEnd);
                  setSelectionEnd(selectionStart);
              }
          }
      }
    };

    if (isDragging || isSelecting) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isSelecting, controller, zoomLevel, zoomOffset, duration, selectionStart, selectionEnd]);

  const handleMouseMoveTrack = (e: React.MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const time = getTimeFromClientX(e.clientX, rect);
      setHoverTime(time);
  };

  const handleMouseLeaveTrack = () => {
      setHoverTime(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      // Check if Ctrl key is pressed for zooming
      if (e.ctrlKey) {
          e.preventDefault();
          const zoomDelta = e.deltaY * -0.01;
          const newZoom = Math.min(Math.max(1, zoomLevel + zoomDelta), 20); // Max 20x zoom

          // Calculate mouse position relative to track to zoom towards mouse
          if (trackRef.current) {
              const rect = trackRef.current.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mousePercent = mouseX / rect.width;

              const oldVisibleDuration = duration / zoomLevel;
              const newVisibleDuration = duration / newZoom;

              const mouseTime = zoomOffset + (mousePercent * oldVisibleDuration);

              const newOffset = Math.max(0, Math.min(duration - newVisibleDuration, mouseTime - (mousePercent * newVisibleDuration)));

              setZoomLevel(newZoom);
              setZoomOffset(newOffset);
          } else {
              setZoomLevel(newZoom);
          }
      } else if (zoomLevel > 1) {
           // Pan with horizontal scroll or vertical scroll if not zooming
           e.preventDefault();
           const visibleDuration = duration / zoomLevel;
           // Pan speed relative to visible area
           const panAmount = (e.deltaY + e.deltaX) * 0.001 * visibleDuration;

           setZoomOffset(Math.max(0, Math.min(duration - visibleDuration, zoomOffset + panAmount)));
      }
  };

  const getMarkerColor = (type: DemoEventType) => {
    switch (type) {
      case DemoEventType.Death: return '#ff4444';
      case DemoEventType.WeaponFire: return '#ffaa00';
      case DemoEventType.Pickup: return '#44ff44';
      case DemoEventType.Spawn: return '#4444ff';
      case DemoEventType.DamageDealt: return '#ff8800';
      case DemoEventType.DamageReceived: return '#ff0000';
      default: return '#cccccc';
    }
  };

  // Rendering helpers
  const visibleDuration = duration > 0 ? duration / zoomLevel : 1;
  const getLeftPercent = (time: number) => {
      return ((time - zoomOffset) / visibleDuration) * 100;
  };

  const handleExtractClip = () => {
      if (selectionStart !== null && selectionEnd !== null && onExtractClip) {
          onExtractClip(Math.min(selectionStart, selectionEnd), Math.max(selectionStart, selectionEnd));
      }
  };

  return (
    <div className="demo-timeline" onWheel={handleWheel}>
      {/* Thumbnails placeholder - shown when hovering */}
      {hoverTime !== null && (
          <div
             className="timeline-thumbnail-preview"
             style={{
                 left: `${getLeftPercent(hoverTime)}%`,
                 transform: 'translate(-50%, -10px)',
                 // Hide if out of bounds
                 display: (hoverTime < zoomOffset || hoverTime > zoomOffset + visibleDuration) ? 'none' : 'block'
             }}
          >
              <div className="thumbnail-content">
                  <span className="thumbnail-time">{formatTime(hoverTime)}</span>
              </div>
          </div>
      )}

      <div
        className="timeline-track-container"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveTrack}
        onMouseLeave={handleMouseLeaveTrack}
        title={hoverTime !== null ? formatTime(hoverTime) : ''}
      >
        <ThumbnailStrip duration={duration} zoomLevel={zoomLevel} zoomOffset={zoomOffset} width={trackWidth} />

        <div className="timeline-track">
            {/* Selection Range */}
            {selectionStart !== null && selectionEnd !== null && (
                <div
                    className="timeline-selection"
                    style={{
                        left: `${getLeftPercent(Math.min(selectionStart, selectionEnd))}%`,
                        width: `${Math.abs(getLeftPercent(selectionEnd) - getLeftPercent(selectionStart))}%`
                    }}
                />
            )}

            {/* Progress Bar */}
            <div
                className="timeline-progress"
                style={{
                    width: `${Math.min(100, Math.max(0, getLeftPercent(currentTime)))}%`,
                    // Hide if completely off screen? Or clamp
                    display: (currentTime < zoomOffset && getLeftPercent(currentTime) < 0) ? 'none' : 'block'
                }}
            />

          {/* Event Markers */}
          {events.map((event, index) => {
              const left = getLeftPercent(event.time);
              if (left < 0 || left > 100) return null;

              return (
                  <div
                      key={`evt-${index}`}
                      className="timeline-marker"
                      style={{
                          left: `${left}%`,
                          backgroundColor: getMarkerColor(event.type)
                      }}
                      title={`${event.description} (${formatTime(event.time)})`}
                  />
              );
          })}

          {/* Bookmark Markers */}
          {bookmarks.map((bookmark, index) => {
             const left = getLeftPercent(bookmark.timeSeconds);
             if (left < 0 || left > 100) return null;

             return (
               <div
                  key={`bm-${bookmark.id}`}
                  className="timeline-marker timeline-marker-bookmark"
                  style={{
                    left: `${left}%`,
                    backgroundColor: '#4CAF50', // Green for bookmarks
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    top: '-4px', // Sit slightly above track
                    cursor: 'pointer',
                    zIndex: 5
                  }}
                  title={`Bookmark: ${bookmark.name} (${formatTime(bookmark.timeSeconds)})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onBookmarkClick) onBookmarkClick(bookmark.frame);
                  }}
               />
             );
          })}
        </div>

        {/* Scrubber handle */}
        {(currentTime >= zoomOffset && currentTime <= zoomOffset + visibleDuration) && (
            <div
                className="timeline-scrubber"
                style={{ left: `${getLeftPercent(currentTime)}%` }}
            />
        )}
      </div>

      <div className="timeline-controls">
        <div className="time-display">
          <span className="time-current">{formatTime(currentTime)}</span>
          <span className="time-sep">/</span>
          <span className="time-total">{formatTime(duration)}</span>
        </div>

        {/* Clip Extraction Controls */}
        {selectionStart !== null && selectionEnd !== null && (
            <div className="clip-controls">
                <span className="selection-info">
                    {formatTime(Math.min(selectionStart, selectionEnd))} - {formatTime(Math.max(selectionStart, selectionEnd))}
                </span>
                <button
                    className="extract-btn"
                    onClick={handleExtractClip}
                    title="Extract clip from selected range"
                >
                    Extract Clip
                </button>
            </div>
        )}

        {/* Zoom controls */}
        <div className="zoom-display">
             <button
                className="zoom-btn"
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                disabled={zoomLevel <= 1}
             >-</button>
             <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
             <button
                className="zoom-btn"
                onClick={() => setZoomLevel(Math.min(20, zoomLevel + 0.5))}
                disabled={zoomLevel >= 20}
             >+</button>
        </div>

        <div className="frame-display">
          Frame: {currentFrame} / {totalFrames}
        </div>
      </div>
    </div>
  );
}
