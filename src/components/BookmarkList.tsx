import React from 'react';
import { Bookmark } from '@/src/services/bookmarkService';

export interface BookmarkListProps {
  bookmarks: Bookmark[];
  onJumpTo: (frame: number) => void;
  onDelete: (id: string) => void;
  onEdit: (bookmark: Bookmark) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onJumpTo,
  onDelete,
  onEdit
}) => {
  if (bookmarks.length === 0) {
    return <div style={styles.empty}>No bookmarks yet.</div>;
  }

  return (
    <div className="bookmark-list" style={styles.list}>
      {bookmarks.map(b => (
        <div key={b.id} className="bookmark-item" style={styles.item}>
          <div style={styles.info} onClick={() => onJumpTo(b.frame)}>
            <div style={styles.header}>
              <span style={styles.time}>{formatTime(b.timeSeconds)}</span>
              <span style={styles.name}>{b.name}</span>
            </div>
            {b.description && <div style={styles.desc}>{b.description}</div>}
          </div>
          <div style={styles.actions}>
             <button
              onClick={() => onEdit(b)}
              style={styles.actionBtn}
              title="Edit bookmark"
            >
              ✎
            </button>
             <button
              onClick={() => onDelete(b.id)}
              style={styles.actionBtn}
              title="Delete bookmark"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = {
  empty: {
    color: '#aaa',
    padding: '10px',
    textAlign: 'center' as const,
    fontStyle: 'italic'
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto' as const,
    padding: '5px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#444',
    borderRadius: '4px',
    padding: '8px',
    borderLeft: '4px solid #4CAF50'
  },
  info: {
    flex: 1,
    cursor: 'pointer'
  },
  header: {
    display: 'flex',
    gap: '10px',
    alignItems: 'baseline'
  },
  time: {
    color: '#4CAF50',
    fontWeight: 'bold' as const,
    fontSize: '0.9em'
  },
  name: {
    color: '#fff',
    fontWeight: 'bold' as const
  },
  desc: {
    color: '#ccc',
    fontSize: '0.85em',
    marginTop: '4px'
  },
  actions: {
    marginLeft: '10px',
    display: 'flex',
    gap: '5px'
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    color: '#aaa',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 5px'
  }
};
