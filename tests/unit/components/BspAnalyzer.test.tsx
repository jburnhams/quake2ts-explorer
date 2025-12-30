import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BspAnalyzer, BspAnalyzerProps } from '@/src/components/BspAnalyzer';
import { BspMap } from '@quake2ts/engine';
import { createMockBspMap } from '@quake2ts/test-utils';

// Mock UniversalViewer
vi.mock('@/src/components/UniversalViewer/UniversalViewer', () => ({
  UniversalViewer: () => <div data-testid="universal-viewer">Universal Viewer</div>
}));

describe('BspAnalyzer', () => {
  const mockMap = createMockBspMap({
    models: [{ firstFace: 0, numFaces: 10 }] as any,
    entities: {
      entities: [
        { classname: 'worldspawn' },
        { classname: 'info_player_start' }
      ]
    } as any,
    faces: [
       { texInfo: 0, numEdges: 4 },
       { texInfo: 0, numEdges: 4 },
       { texInfo: 1, numEdges: 4 }
    ] as any,
    texInfo: [
       { texture: 'wall1' },
       { texture: 'floor' }
    ] as any
  });

  const mockPakService = {} as any;

  const defaultProps: BspAnalyzerProps = {
    map: mockMap,
    pakService: mockPakService,
    filePath: 'maps/demo1.bsp',
  };

  it('renders overview tab by default', () => {
    render(<BspAnalyzer {...defaultProps} />);
    expect(screen.getByText('Map Overview')).toBeInTheDocument();
    expect(screen.getByText('demo1.bsp')).toBeInTheDocument();
    expect(screen.getByText('Universal Viewer')).toBeInTheDocument();
  });

  it('displays correct statistics in overview', () => {
    render(<BspAnalyzer {...defaultProps} />);

    // Models count (1)
    expect(screen.getByText('Models').nextElementSibling).toHaveTextContent('1');

    // Entities count (2)
    // There are 2 "Entities" texts: one in tab, one in stats
    // We want the label in stats
    const entityLabels = screen.getAllByText('Entities');
    // The label is inside a .bsp-stat-item, so we check which one has a sibling
    const entityLabel = entityLabels.find(el => el.tagName === 'LABEL');
    expect(entityLabel!.nextElementSibling).toHaveTextContent('2');

    // Textures count (2 unique: wall1, floor)
    expect(screen.getByText('Textures').nextElementSibling).toHaveTextContent('2');
  });

  it('switches tabs correctly', () => {
    render(<BspAnalyzer {...defaultProps} />);

    fireEvent.click(screen.getByText(/^Geometry$/));
    expect(screen.getByText('Geometry Analysis')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^Lightmaps$/));
    expect(screen.getByText('Lightmap Inspector')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^Visibility$/));
    expect(screen.getByText('Visibility (PVS) Statistics')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/^Entities$/));
    expect(screen.getByText('Entity Analysis')).toBeInTheDocument();
  });
});
