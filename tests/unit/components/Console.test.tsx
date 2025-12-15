import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Console } from '../../../src/components/Console';
import { consoleService } from '../../../src/services/consoleService';

describe('Console Component', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    onClose.mockClear();
    consoleService.clearLogs();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('should not render when not open', () => {
    render(<Console isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<Console isOpen={true} onClose={onClose} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should focus input when opened', () => {
    render(<Console isOpen={true} onClose={onClose} />);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('should execute command on enter', () => {
    const handler = jest.fn();
    consoleService.registerCommand('testui', handler);

    render(<Console isOpen={true} onClose={onClose} />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'testui' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handler).toHaveBeenCalled();
    expect(input).toHaveValue('');
  });

  it('should navigate history with arrows', () => {
    consoleService.executeCommand('cmd1');
    consoleService.executeCommand('cmd2');

    render(<Console isOpen={true} onClose={onClose} />);
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });
    expect(input).toHaveValue('cmd2');

    fireEvent.keyDown(input, { key: 'ArrowUp', code: 'ArrowUp' });
    expect(input).toHaveValue('cmd1');

    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    expect(input).toHaveValue('cmd2');
  });

  it('should close on Escape', () => {
    render(<Console isOpen={true} onClose={onClose} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('should prevent backtick from closing', () => {
      render(<Console isOpen={true} onClose={onClose} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: '`', code: 'Backquote' });
      expect(onClose).toHaveBeenCalled();
  });

  it('should display logs', () => {
    consoleService.log('Test Log Message');
    render(<Console isOpen={true} onClose={onClose} />);
    expect(screen.getByText(/Test Log Message/)).toBeInTheDocument();
  });
});
