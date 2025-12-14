import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
