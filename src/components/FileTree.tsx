import React, { useState, useCallback } from 'react';
import type { TreeNode } from '../services/pakService';

export interface FileTreeProps {
  root: TreeNode | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}

function getFileIcon(name: string, isDirectory: boolean): string {
  if (isDirectory) return '\uD83D\uDCC1'; // folder
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

function TreeNodeItem({
  node,
  depth,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
}: TreeNodeItemProps) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.isDirectory) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div data-testid={`tree-node-${node.path || 'root'}`}>
      <div
        className={`tree-node ${isSelected ? 'tree-node-selected' : ''} ${
          node.isDirectory ? 'tree-node-directory' : 'tree-node-file'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={node.isDirectory ? isExpanded : undefined}
        aria-selected={isSelected}
        data-testid={`tree-item-${node.path}`}
      >
        {node.isDirectory && (
          <span className="tree-expand-icon">
            {isExpanded ? '\u25BC' : '\u25B6'}
          </span>
        )}
        <span className="tree-icon">{getFileIcon(node.name, node.isDirectory)}</span>
        <span className="tree-name">{node.name}</span>
      </div>
      {node.isDirectory && isExpanded && node.children && (
        <div className="tree-children" role="group">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ root, selectedPath, onSelect }: FileTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']));

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  if (!root || !root.children || root.children.length === 0) {
    return (
      <div className="file-tree file-tree-empty" data-testid="file-tree">
        <p>No files loaded</p>
        <p>Open a PAK file to browse its contents</p>
      </div>
    );
  }

  return (
    <div className="file-tree" role="tree" data-testid="file-tree">
      {root.children.map((child) => (
        <TreeNodeItem
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onSelect={onSelect}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
