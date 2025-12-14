import React, { useEffect, useRef, useState } from 'react';
import { DemoPlaybackController, DemoEvent, DemoEventType } from 'quake2ts/engine';
import './DemoTimeline.css';

interface DemoTimelineProps {
  controller: DemoPlaybackController;
}

export function DemoTimeline({ controller }: DemoTimelineProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [events, setEvents] = useState<DemoEvent[]>([]);

  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

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
      if (!isDragging) {
        setCurrentTime(controller.getCurrentTime());
        setCurrentFrame(controller.getCurrentFrame());
      }
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [controller, isDragging]);

  const handleSeek = (e: React.MouseEvent | MouseEvent) => {
    if (!trackRef.current || !controller) return;

    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = x / rect.width;
    const time = percent * controller.getDuration();

    if (isDragging) {
       // Just update UI while dragging
       setCurrentTime(time);
    } else {
       // Commit seek
       controller.seekToTime(time);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeek(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleSeek(e);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        if (trackRef.current) {
            const rect = trackRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percent = x / rect.width;
            const time = percent * controller.getDuration();
            controller.seekToTime(time);
        }
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, controller]);

  const handleMouseMoveTrack = (e: React.MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      setHoverTime(percent * duration);
  };

  const handleMouseLeaveTrack = () => {
      setHoverTime(null);
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="demo-timeline">
      {/* Thumbnails placeholder - shown when hovering */}
      {hoverTime !== null && (
          <div
             className="timeline-thumbnail-preview"
             style={{
                 left: `${(hoverTime / duration) * 100}%`,
                 transform: 'translate(-50%, -10px)'
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
        <div className="timeline-track">
          <div
            className="timeline-progress"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Markers */}
          {events.map((event, index) => {
              const left = (event.time / duration) * 100;
              return (
                  <div
                      key={index}
                      className="timeline-marker"
                      style={{
                          left: `${left}%`,
                          backgroundColor: getMarkerColor(event.type)
                      }}
                      title={`${event.description} (${formatTime(event.time)})`}
                  />
              );
          })}
        </div>
        <div
            className="timeline-scrubber"
            style={{ left: `${progressPercent}%` }}
        />
      </div>

      <div className="timeline-controls">
        <div className="time-display">
          <span className="time-current">{formatTime(currentTime)}</span>
          <span className="time-sep">/</span>
          <span className="time-total">{formatTime(duration)}</span>
        </div>
        <div className="frame-display">
          Frame: {currentFrame} / {totalFrames}
        </div>
      </div>
    </div>
  );
}
