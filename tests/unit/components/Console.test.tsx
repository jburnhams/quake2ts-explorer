import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Console } from '../../../src/components/Console';
import { consoleService } from '../../../src/services/consoleService';

// Mock scrollIntoView since it's not supported in JSDOM
window.HTMLElement.prototype.scrollIntoView = jest.fn();

describe('Console Component', () => {
  beforeEach(() => {
    consoleService.clearLogs();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<Console isOpen={false} onClose={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders when open', () => {
    render(<Console isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('submits command on Enter', () => {
    const executeSpy = jest.spyOn(consoleService, 'executeCommand');
    render(<Console isOpen={true} onClose={jest.fn()} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'help' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(executeSpy).toHaveBeenCalledWith('help');
    expect(input).toHaveValue('');
  });

  it('navigates history with Up/Down arrows', () => {
    const prevSpy = jest.spyOn(consoleService, 'getHistoryPrevious').mockReturnValue('prev-cmd');
    const nextSpy = jest.spyOn(consoleService, 'getHistoryNext').mockReturnValue('next-cmd');

    render(<Console isOpen={true} onClose={jest.fn()} />);
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(prevSpy).toHaveBeenCalled();
    expect(input).toHaveValue('prev-cmd');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(nextSpy).toHaveBeenCalled();
    expect(input).toHaveValue('next-cmd');
  });

  it('closes on Escape or backtick', () => {
    const onClose = jest.fn();
    render(<Console isOpen={true} onClose={onClose} />);
    const input = screen.getByRole('textbox');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    fireEvent.keyDown(input, { key: '`' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('should display logs', () => {
    consoleService.log('Test Log Message');
    render(<Console isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText(/Test Log Message/)).toBeInTheDocument();
  });

  it('autocomplete on Tab', () => {
    // We mock consoleService.getSuggestions
    const suggestionsSpy = jest.spyOn(consoleService, 'getSuggestions').mockReturnValue(['foobar', 'foobaz']);
    render(<Console isOpen={true} onClose={jest.fn()} />);
    const input = screen.getByRole('textbox');

    // Type 'foo'
    fireEvent.change(input, { target: { value: 'foo' } });

    // Press Tab
    fireEvent.keyDown(input, { key: 'Tab', code: 'Tab' });

    // Should call getSuggestions with 'foo'
    expect(suggestionsSpy).toHaveBeenCalledWith('foo');

    // The logic we plan to implement:
    // If multiple matches, it might cycle or complete common prefix.
    // Let's assume for now it completes the first one or we can test the UI shows suggestions.
    // If the requirement is just "autocomplete", usually it completes the first match or cycles.
    // Let's update the test expectation based on implementation choice.
    // Simplest: fill with first match.
    expect(input).toHaveValue('foobar ');

    // If we press tab again, it might cycle to 'foobaz' (optional enhancement)
    // But for basic "autocomplete", first match is acceptable start.
  });

  it('shows suggestions when typing', () => {
    // Mock suggestions
    const suggestionsSpy = jest.spyOn(consoleService, 'getSuggestions').mockReturnValue(['help', 'history']);
    const helpSpy = jest.spyOn(consoleService, 'getHelpText').mockImplementation((cmd) => {
      if (cmd === 'help') return 'Show help';
      return undefined;
    });

    render(<Console isOpen={true} onClose={jest.fn()} />);
    const input = screen.getByRole('textbox');

    // Type 'h'
    fireEvent.change(input, { target: { value: 'h' } });

    expect(suggestionsSpy).toHaveBeenCalledWith('h');

    // Verify suggestion list is rendered
    expect(screen.getByText('help')).toBeInTheDocument();
    expect(screen.getByText('history')).toBeInTheDocument();

    // Verify help text
    expect(screen.getByText('- Show help')).toBeInTheDocument();

    // Click suggestion
    fireEvent.click(screen.getByText('help'));

    // Should fill input
    expect(input).toHaveValue('help ');

    // Suggestions should be cleared (removed from DOM)
    expect(screen.queryByText('history')).not.toBeInTheDocument();
  });
});
