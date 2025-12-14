import React, { useState } from 'react';

export interface BookmarkDialogProps {
  currentFrame: number;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export const BookmarkDialog: React.FC<BookmarkDialogProps> = ({
  currentFrame,
  currentTime,
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    }
  };

  return (
    <div className="bookmark-dialog-overlay" style={styles.overlay}>
      <div className="bookmark-dialog" style={styles.dialog}>
        <h3>Add Bookmark</h3>
        <p>Frame: {currentFrame} | Time: {currentTime.toFixed(2)}s</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label htmlFor="bookmark-name">Name:</label>
            <input
              id="bookmark-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Amazing Frag"
              autoFocus
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="bookmark-desc">Description (optional):</label>
            <textarea
              id="bookmark-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes about this moment..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.buttons}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" style={styles.saveBtn}>Save Bookmark</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  dialog: {
    backgroundColor: '#333',
    padding: '20px',
    borderRadius: '8px',
    width: '400px',
    color: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  field: {
    marginBottom: '15px'
  },
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#222',
    color: '#fff'
  },
  textarea: {
    width: '100%',
    padding: '8px',
    marginTop: '5px',
    borderRadius: '4px',
    border: '1px solid #555',
    backgroundColor: '#222',
    color: '#fff',
    minHeight: '60px'
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
  },
  saveBtn: {
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  cancelBtn: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  }
};
