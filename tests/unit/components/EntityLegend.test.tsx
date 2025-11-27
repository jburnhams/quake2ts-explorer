import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityLegend } from '../../../src/components/EntityLegend';
import '@testing-library/jest-dom';

describe('EntityLegend', () => {
  it('does not render when classnames are empty', () => {
    const { container } = render(
      <EntityLegend classnames={[]} hiddenClassnames={new Set()} onToggle={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a list of entities', () => {
    const classnames = ['player_start', 'ammo_shells'];
    render(
      <EntityLegend
        classnames={classnames}
        hiddenClassnames={new Set()}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText('Entities (2)')).toBeInTheDocument();
    expect(screen.getByText('player_start')).toBeInTheDocument();
    expect(screen.getByText('ammo_shells')).toBeInTheDocument();
  });

  it('toggles checkboxes correctly', () => {
    const onToggle = jest.fn();
    const classnames = ['item_health'];
    const hidden = new Set<string>();

    render(
      <EntityLegend
        classnames={classnames}
        hiddenClassnames={hidden}
        onToggle={onToggle}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked(); // Not hidden

    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('item_health');
  });

  it('shows unchecked box for hidden entities', () => {
    const classnames = ['item_health'];
    const hidden = new Set(['item_health']);

    render(
      <EntityLegend
        classnames={classnames}
        hiddenClassnames={hidden}
        onToggle={jest.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });
});
