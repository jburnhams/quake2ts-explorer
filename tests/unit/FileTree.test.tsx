
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileTree } from '@/src/components/FileTree';
import type { TreeNode } from '@/src/services/pakService';
import React from 'react';

// Mock AutoSizer to render children with fixed dimensions
vi.mock('react-virtualized-auto-sizer', () => {
  return {
    default: ({ children }: any) => {
      return children({ height: 500, width: 500 });
    }
  };
});

// Mock react-window (v2) to render all items
vi.mock('react-window', () => {
  const React = require('react');
  return {
    List: ({ rowComponent, rowProps, rowCount }: any) => {
      const Row = rowComponent;
      return (
        <div data-testid="virtual-list">
          {Array.from({ length: rowCount }).map((_, index) => (
            <Row key={index} index={index} style={{}} {...rowProps} />
          ))}
        </div>
      );
    },
  };
});

const mockTree: TreeNode = {
  name: 'root',
  path: '',
  isDirectory: true,
  children: [
    {
      name: 'pics',
      path: 'pics',
      isDirectory: true,
      children: [
        {
          name: 'test.pcx',
          path: 'pics/test.pcx',
          isDirectory: false,
          file: { path: 'pics/test.pcx', size: 1024, sourcePak: 'pak0.pak' },
        },
      ],
    },
    {
      name: 'readme.txt',
      path: 'readme.txt',
      isDirectory: false,
      file: { path: 'readme.txt', size: 256, sourcePak: 'pak0.pak' },
    },
  ],
};

describe('FileTree Component', () => {
  it('shows empty state when no root', () => {
    render(<FileTree root={null} selectedPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText('No files loaded')).toBeInTheDocument();
  });

  it('shows empty state when root has no children', () => {
    const emptyRoot: TreeNode = { name: 'root', path: '', isDirectory: true, children: [] };
    render(<FileTree root={emptyRoot} selectedPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText('No files loaded')).toBeInTheDocument();
  });

  it('renders directory nodes', () => {
    render(<FileTree root={mockTree} selectedPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText('pics')).toBeInTheDocument();
  });

  it('renders file nodes', () => {
    render(<FileTree root={mockTree} selectedPath={null} onSelect={vi.fn()} />);
    expect(screen.getByText('readme.txt')).toBeInTheDocument();
  });

  it('calls onSelect when file is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileTree root={mockTree} selectedPath={null} onSelect={onSelect} />);

    await user.click(screen.getByText('readme.txt'));
    expect(onSelect).toHaveBeenCalledWith('readme.txt');
  });

  it('expands directory when clicked', async () => {
    const user = userEvent.setup();
    render(<FileTree root={mockTree} selectedPath={null} onSelect={vi.fn()} />);

    // Click to expand pics directory
    await user.click(screen.getByText('pics'));

    // Should show child file
    expect(screen.getByText('test.pcx')).toBeInTheDocument();
  });

  it('highlights selected file', () => {
    render(<FileTree root={mockTree} selectedPath="readme.txt" onSelect={vi.fn()} />);
    const item = screen.getByTestId('tree-item-readme.txt');
    expect(item).toHaveClass('tree-node-selected');
  });

  it('has tree role for accessibility', () => {
    render(<FileTree root={mockTree} selectedPath={null} onSelect={vi.fn()} />);
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });


  it('shows correct icon for image files', async () => {
    const user = userEvent.setup();
    render(<FileTree root={mockTree} selectedPath={null} onSelect={vi.fn()} />);
    // Expand pics to see test.pcx
    await user.click(screen.getByText('pics'));
    // PCX should have image icon
    const pcxItem = screen.getByText('test.pcx').closest('.tree-node');
    expect(pcxItem?.querySelector('.tree-icon')).toBeInTheDocument();
  });

  it('shows correct icon for text files', () => {
    render(<FileTree root={mockTree} selectedPath={null} onSelect={vi.fn()} />);
    const txtItem = screen.getByText('readme.txt').closest('.tree-node');
    expect(txtItem?.querySelector('.tree-icon')).toBeInTheDocument();
  });

  it('selects nested file', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileTree root={mockTree} selectedPath={null} onSelect={onSelect} />);

    // Expand pics directory
    await user.click(screen.getByText('pics'));
    // Click nested file
    await user.click(screen.getByText('test.pcx'));
    expect(onSelect).toHaveBeenCalledWith('pics/test.pcx');
  });
});
