import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EntityMetadata } from '../../../src/components/EntityMetadata';
import '@testing-library/jest-dom';

describe('EntityMetadata', () => {
  it('renders nothing when entity is null', () => {
    const { container } = render(<EntityMetadata entity={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders entity details', () => {
    const entity = {
        classname: 'info_player_start',
        properties: {
            origin: '0 0 0',
            angle: '90'
        }
    };

    render(<EntityMetadata entity={entity as any} />);

    expect(screen.getByText('Selection: info_player_start')).toBeInTheDocument();
    expect(screen.getByText('origin:')).toBeInTheDocument();
    expect(screen.getByText('0 0 0')).toBeInTheDocument();
    expect(screen.getByText('angle:')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });
});
