import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '@/src/components/Toolbar';

describe('Toolbar Component', () => {
  it('renders the title', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);
    expect(screen.getByText('Quake2TS Explorer')).toBeInTheDocument();
  });

  it('renders the Open PAK File button', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);
    expect(screen.getByTestId('open-pak-button')).toBeInTheDocument();
    expect(screen.getByText('Open PAK File')).toBeInTheDocument();
  });

  it('shows no PAKs loaded message when pakCount is 0', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);
    expect(screen.getByText('No PAK files loaded')).toBeInTheDocument();
  });

  it('shows PAK count and file count when loaded', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={2} fileCount={150} />);
    expect(screen.getByText('2 PAKs loaded (150 files)')).toBeInTheDocument();
  });

  it('shows singular PAK when count is 1', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={1} fileCount={50} />);
    expect(screen.getByText('1 PAK loaded (50 files)')).toBeInTheDocument();
  });

  it('has a hidden file input', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);
    const input = screen.getByTestId('file-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveStyle({ display: 'none' });
  });

  it('file input accepts .pak files', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.accept).toBe('.pak');
  });

  it('file input allows multiple files', () => {
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.multiple).toBe(true);
  });

  it('clicking Open button triggers file input click', async () => {
    const user = userEvent.setup();
    render(<Toolbar onFileSelect={jest.fn()} pakCount={0} fileCount={0} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const clickSpy = jest.spyOn(input, 'click');

    await user.click(screen.getByTestId('open-pak-button'));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('calls onFileSelect when file is selected', async () => {
    const onFileSelect = jest.fn();
    render(<Toolbar onFileSelect={onFileSelect} pakCount={0} fileCount={0} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['content'], 'test.pak', { type: 'application/octet-stream' });

    // Simulate file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });

    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onFileSelect).toHaveBeenCalled();
  });

  it('resets input value after file selection', async () => {
    const onFileSelect = jest.fn();
    render(<Toolbar onFileSelect={onFileSelect} pakCount={0} fileCount={0} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const file = new File(['content'], 'test.pak', { type: 'application/octet-stream' });

    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    });

    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Input value should be empty after the change handler resets it
    expect(input.value).toBe('');
  });

  it('does not call onFileSelect when no files selected', () => {
    const onFileSelect = jest.fn();
    render(<Toolbar onFileSelect={onFileSelect} pakCount={0} fileCount={0} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [],
      configurable: true,
    });

    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onFileSelect).not.toHaveBeenCalled();
  });
});
