import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SurfaceFlags, SurfaceFlagsProps } from '@/src/components/SurfaceFlags';
import { SURF_LIGHT, SURF_SKY } from '@/src/utils/surfaceFlagParser';


describe('SurfaceFlags', () => {
  it('renders empty state when no properties', () => {
    render(<SurfaceFlags properties={null} />);
    expect(screen.getByTestId('surface-flags-empty')).toBeInTheDocument();
    expect(screen.getByText('Hover over a surface to see details')).toBeInTheDocument();
  });

  it('renders surface properties', () => {
    const props: SurfaceFlagsProps = {
      properties: {
        textureName: 'textures/base_wall/wall1',
        flags: SURF_LIGHT,
        value: 100,
        contents: 0
      }
    };

    render(<SurfaceFlags {...props} />);
    expect(screen.getByTestId('surface-flags')).toBeInTheDocument();
    expect(screen.getByText('textures/base_wall/wall1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('LIGHT')).toBeInTheDocument();
  });

  it('renders multiple flags', () => {
    const props: SurfaceFlagsProps = {
      properties: {
        textureName: 'sky',
        flags: SURF_LIGHT | SURF_SKY,
        value: 0
      }
    };

    render(<SurfaceFlags {...props} />);
    expect(screen.getByText('LIGHT')).toBeInTheDocument();
    expect(screen.getByText('SKY')).toBeInTheDocument();
  });

  it('renders "None" for 0 flags', () => {
    const props: SurfaceFlagsProps = {
        properties: {
          textureName: 'wall',
          flags: 0,
          value: 0
        }
      };

      render(<SurfaceFlags {...props} />);
      expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('calls onFilterByFlag when flag clicked', () => {
    const onFilter = vi.fn();
    const props: SurfaceFlagsProps = {
      properties: {
        textureName: 'sky',
        flags: SURF_LIGHT,
        value: 0
      },
      onFilterByFlag: onFilter
    };

    render(<SurfaceFlags {...props} />);
    fireEvent.click(screen.getByText('LIGHT'));
    expect(onFilter).toHaveBeenCalledWith('LIGHT');
  });

  it('renders active filter state and clears it', () => {
      const onFilter = vi.fn();
      render(<SurfaceFlags properties={null} activeFilter="LIGHT" onFilterByFlag={onFilter} />);

      expect(screen.getByText('Filtering by:')).toBeInTheDocument();
      expect(screen.getByText('LIGHT')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear'));
      expect(onFilter).toHaveBeenCalledWith('LIGHT');
  });
});
