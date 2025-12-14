import React, { useState, useEffect } from 'react';
import { DemoPlaybackController } from 'quake2ts/engine';
import { Bookmark, bookmarkService } from '@/src/services/bookmarkService';
import { BookmarkList } from './BookmarkList';
import { BookmarkDialog } from './BookmarkDialog';

interface DemoBookmarksProps {
  controller: DemoPlaybackController;
  demoId: string; // Used for storage key
  onBookmarksChange?: (bookmarks: Bookmark[]) => void;
}

export const DemoBookmarks: React.FC<DemoBookmarksProps> = ({ controller, demoId, onBookmarksChange }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showList, setShowList] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);

  const loadBookmarks = () => {
    const loaded = bookmarkService.getBookmarks(demoId);
    setBookmarks(loaded);
    if (onBookmarksChange) {
      onBookmarksChange(loaded);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, [demoId]);

  // Update time for dialog (only when adding new)
  useEffect(() => {
    const update = () => {
       if (showDialog && !editingBookmark) {
         setCurrentTime(controller.getCurrentTime());
         setCurrentFrame(controller.getCurrentFrame());
       }
    };
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [controller, showDialog, editingBookmark]);

  const handleAddClick = () => {
    controller.pause();
    setEditingBookmark(null);
    setCurrentTime(controller.getCurrentTime());
    setCurrentFrame(controller.getCurrentFrame());
    setShowDialog(true);
  };

  const handleEdit = (bookmark: Bookmark) => {
      setEditingBookmark(bookmark);
      // For editing, we keep the original frame/time
      setCurrentFrame(bookmark.frame);
      setCurrentTime(bookmark.timeSeconds);
      setShowDialog(true);
  };

  const handleSave = (name: string, description: string) => {
    if (editingBookmark) {
        bookmarkService.updateBookmark(demoId, editingBookmark.id, {
            name,
            description
        });
    } else {
        bookmarkService.addBookmark(demoId, {
            name,
            description,
            frame: currentFrame,
            timeSeconds: currentTime
        });
    }
    loadBookmarks();
    setShowDialog(false);
    setEditingBookmark(null);
  };

  const handleJumpTo = (frame: number) => {
    controller.seekToFrame(frame);
  };

  const handleDelete = (id: string) => {
    bookmarkService.deleteBookmark(demoId, id);
    loadBookmarks();
  };

  return (
    <div className="demo-bookmarks-container">
      <div className="bookmark-controls" style={{ display: 'flex', gap: '5px' }}>
        <button
          onClick={handleAddClick}
          title="Add Bookmark at current time"
          style={styles.btn}
        >
          🔖 Add Bookmark
        </button>
        <button
          onClick={() => setShowList(!showList)}
          title="Toggle Bookmark List"
          style={{ ...styles.btn, backgroundColor: showList ? '#555' : '#333' }}
        >
          📂 List
        </button>
      </div>

      {showList && (
        <div className="bookmark-list-popup" style={styles.popup}>
           <BookmarkList
             bookmarks={bookmarks}
             onJumpTo={handleJumpTo}
             onDelete={handleDelete}
             onEdit={handleEdit}
           />
        </div>
      )}

      <BookmarkDialog
        isOpen={showDialog}
        currentFrame={currentFrame}
        currentTime={currentTime}
        initialName={editingBookmark?.name}
        initialDescription={editingBookmark?.description}
        isEditing={!!editingBookmark}
        onClose={() => { setShowDialog(false); setEditingBookmark(null); }}
        onSave={handleSave}
      />
    </div>
  );
};

const styles = {
  btn: {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    padding: '5px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9em'
  },
  popup: {
    position: 'absolute' as const,
    bottom: '60px', // Above timeline
    right: '10px',
    width: '300px',
    backgroundColor: '#222',
    border: '1px solid #444',
    borderRadius: '6px',
    boxShadow: '0 -4px 10px rgba(0,0,0,0.5)',
    zIndex: 90
  }
};
