import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingScreen } from '../../../src/components/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders default message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingScreen message="Loading Level 1..." />);
    expect(screen.getByText('Loading Level 1...')).toBeInTheDocument();
  });
});
