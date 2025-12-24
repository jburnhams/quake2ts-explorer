import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { TreeNode } from '../../services/pakService';
import './FileSearch.css';

export interface FileSearchProps {
  files: TreeNode[];
  onSelect: (path: string) => void;
}

function getFileIcon(name: string): string {
  const ext = name.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'pcx':
    case 'wal':
      return '\uD83D\uDDBC'; // image
    case 'md2':
    case 'md3':
      return '\uD83D\uDC7E'; // model (alien)
    case 'wav':
      return '\uD83D\uDD0A'; // audio
    case 'bsp':
      return '\uD83D\uDDFA'; // map
    case 'txt':
    case 'cfg':
      return '\uD83D\uDCDD'; // text
    default:
      return '\uD83D\uDCC4'; // file
  }
}

export const FileSearch: React.FC<FileSearchProps> = ({ files, onSelect }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten the searchable items (only files, not directories)
  // We expect 'files' to be a flat list of file nodes passed from parent
  // If parent passes the tree root, we'd need to flatten here.
  // Assuming parent passes a flat list of searchable nodes.

  const filteredFiles = useMemo(() => {
    if (!query || query.length < 2) return [];

    const lowerQuery = query.toLowerCase();
    return files
      .filter(file => !file.isDirectory && file.name.toLowerCase().includes(lowerQuery))
      .slice(0, 50); // Limit results
  }, [files, query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (filteredFiles.length > 0 && isOpen) {
        // Reset active index when results change
        setActiveIndex(-1);
    }
  }, [filteredFiles, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (path: string) => {
    onSelect(path);
    setIsOpen(false);
    // Optionally keep query or clear it
    // setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredFiles.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredFiles.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredFiles.length) {
        handleSelect(filteredFiles[activeIndex].path);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="file-search-container" ref={containerRef} data-testid="file-search-container">
      <input
        type="text"
        className="file-search-input"
        placeholder="Find file..."
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        data-testid="file-search-input"
      />

      {isOpen && filteredFiles.length > 0 && (
        <div className="file-search-dropdown" data-testid="file-search-dropdown">
          {filteredFiles.map((file, index) => (
            <div
              key={file.path}
              className={`file-search-item ${index === activeIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(file.path)}
              data-testid={`search-result-${file.path}`}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="file-search-item-icon">{getFileIcon(file.name)}</span>
              <span className="file-search-item-name">{file.name}</span>
              <span className="file-search-item-path">{file.path}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
