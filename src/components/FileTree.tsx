import React, { useState, useCallback, useMemo } from 'react';
import { List, RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import type { TreeNode } from '../services/pakService';

export interface FileTreeProps {
  root: TreeNode | null;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onRemovePak?: (pakId: string) => void;
}

interface FlatNode {
  node: TreeNode;
  depth: number;
}

interface RowData {
  items: FlatNode[];
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onRemovePak?: (pakId: string) => void;
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

const Row = ({ index, style, items, selectedPath, expandedPaths, onSelect, onToggle, onRemovePak }: RowComponentProps<RowData>) => {
  const { node, depth } = items[index];

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isDirectory) {
      onToggle(node.path);
    } else {
      onSelect(node.path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Simulate click
      if (node.isDirectory) {
        onToggle(node.path);
      } else {
        onSelect(node.path);
      }
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.pakId && onRemovePak) {
      onRemovePak(node.pakId);
    }
  };

  return (
    <div style={style} data-testid={`tree-node-${node.path || 'root'}`}>
      <div
        className={`tree-node ${isSelected ? 'tree-node-selected' : ''} ${
          node.isDirectory ? 'tree-node-directory' : 'tree-node-file'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px`, width: '100%', height: '100%' }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={node.isDirectory ? isExpanded : undefined}
        aria-selected={isSelected}
        data-testid={`tree-item-${node.path}`}
      >
        {node.isDirectory && (
          <span className="tree-expand-icon" style={{ marginRight: '4px', minWidth: '16px', textAlign: 'center' }}>
            {isExpanded ? '\u25BC' : '\u25B6'}
          </span>
        )}
        {!node.isDirectory && (
             <span style={{ minWidth: '20px' }} /> // Spacer for non-directory items alignment
        )}
        <span className="tree-icon" style={{ marginRight: '6px' }}>{getFileIcon(node.name, node.isDirectory)}</span>
        <span className="tree-name">{node.name}</span>

        {node.isPakRoot && node.isUserPak && (
          <button
            className="tree-node-remove"
            onClick={handleRemoveClick}
            title="Remove PAK"
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: '#ff4444',
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '0 8px'
            }}
            data-testid={`remove-pak-${node.pakId}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export function FileTree({ root, selectedPath, onSelect, onRemovePak }: FileTreeProps) {
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

  const flattenedItems = useMemo(() => {
    const result: FlatNode[] = [];
    if (!root || !root.children) return result;

    const traverse = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        result.push({ node, depth });
        if (node.isDirectory && expandedPaths.has(node.path) && node.children) {
          traverse(node.children, depth + 1);
        }
      }
    };

    traverse(root.children, 0);
    return result;
  }, [root, expandedPaths]);

  if (!root || !root.children || root.children.length === 0) {
    return (
      <div className="file-tree file-tree-empty" data-testid="file-tree">
        <p>No files loaded</p>
        <p>Add a PAK file to browse its contents</p>
      </div>
    );
  }

  const itemData: RowData = {
    items: flattenedItems,
    selectedPath,
    expandedPaths,
    onSelect,
    onToggle: handleToggle,
    onRemovePak
  };

  return (
    <div className="file-tree" role="tree" data-testid="file-tree" style={{ overflow: 'hidden' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List<RowData>
            style={{ width, height }}
            rowCount={flattenedItems.length}
            rowHeight={32}
            rowProps={itemData}
            rowComponent={Row}
            overscanCount={5}
          />
        )}
      </AutoSizer>
    </div>
  );
}
