import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Console } from '../../src/components/Console';
import { getConsoleService, resetConsoleService } from '../../src/services/consoleService';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('Console Component', () => {
  beforeEach(() => {
    resetConsoleService();
  });

  it('should be hidden by default', () => {
    const { container } = render(<Console />);
    expect(container.firstChild).toBeNull();
  });

  it('should toggle visibility on Backquote', () => {
    const { container } = render(<Console />);

    fireEvent.keyDown(window, { code: 'Backquote' });
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    fireEvent.keyDown(window, { code: 'Backquote' });
    // In React testing library, components unmount/disappear immediately if state changes.
    // We check if it is gone.
    // Query by role should fail or container should be empty.
    expect(container.firstChild).toBeNull();
  });

  it('should submit commands', () => {
    const service = getConsoleService();
    const executeSpy = jest.spyOn(service, 'executeCommand');

    render(<Console />);
    fireEvent.keyDown(window, { code: 'Backquote' }); // Open

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test command' } });
    fireEvent.submit(input);

    expect(executeSpy).toHaveBeenCalledWith('test command');
    expect(input).toHaveValue('');
  });

  it('should navigate history with arrows', () => {
    const service = getConsoleService();
    service.executeCommand('cmd1');
    service.executeCommand('cmd2');

    render(<Console />);
    fireEvent.keyDown(window, { code: 'Backquote' }); // Open

    const input = screen.getByRole('textbox');

    // Up arrow -> cmd2
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('cmd2');

    // Up arrow -> cmd1
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input).toHaveValue('cmd1');

    // Down arrow -> cmd2
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('cmd2');

    // Down arrow -> empty
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('');
  });
});
