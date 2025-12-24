
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '@/src/components/Toolbar';

describe('Toolbar Component', () => {
  const defaultProps = {
    onFileSelect: vi.fn(),
    pakCount: 0,
    fileCount: 0,
    viewMode: 'merged' as const,
    onViewModeChange: vi.fn(),
  };

  it('renders the title', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByText('Quake2TS Explorer')).toBeInTheDocument();
  });

  it('renders the Add PAK Files button', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByTestId('add-pak-button')).toBeInTheDocument();
    expect(screen.getByText('Add PAK Files')).toBeInTheDocument();
  });

  it('renders the view mode toggle', () => {
    render(<Toolbar {...defaultProps} />);
    expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
    expect(screen.getByText('Group by PAK')).toBeInTheDocument();
  });

  it('toggles view mode when checkbox clicked', async () => {
    const onViewModeChange = vi.fn();
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} onViewModeChange={onViewModeChange} />);

    const toggle = screen.getByTestId('view-mode-toggle');
    await user.click(toggle);

    // It was merged (false), clicking makes it by-pak (true)
    expect(onViewModeChange).toHaveBeenCalledWith('by-pak');
  });

  it('reflects checked state based on viewMode prop', () => {
    render(<Toolbar {...defaultProps} viewMode="by-pak" />);
    const toggle = screen.getByTestId('view-mode-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);

    // Re-render with merged
    render(<Toolbar {...defaultProps} viewMode="merged" />);
    // Note: re-rendering with same component in testing-library appends to body, better to cleanup or use rerender
    // But here we are making a new render call.
    // Let's just check the last one or better, separate tests.
  });

  it('shows no PAKs loaded message when pakCount is 0', () => {
    render(<Toolbar {...defaultProps} pakCount={0} fileCount={0} />);
    expect(screen.getByText('No PAK files loaded')).toBeInTheDocument();
  });

  it('shows PAK count and file count when loaded', () => {
    render(<Toolbar {...defaultProps} pakCount={2} fileCount={150} />);
    expect(screen.getByText('2 PAKs loaded (150 files)')).toBeInTheDocument();
  });

  it('shows singular PAK when count is 1', () => {
    render(<Toolbar {...defaultProps} pakCount={1} fileCount={50} />);
    expect(screen.getByText('1 PAK loaded (50 files)')).toBeInTheDocument();
  });

  it('has a hidden file input', () => {
    render(<Toolbar {...defaultProps} />);
    const input = screen.getByTestId('file-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveStyle({ display: 'none' });
  });

  it('file input accepts .pak files', () => {
    render(<Toolbar {...defaultProps} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.accept).toBe('.pak');
  });

  it('file input allows multiple files', () => {
    render(<Toolbar {...defaultProps} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.multiple).toBe(true);
  });

  it('clicking Add button triggers file input click', async () => {
    const user = userEvent.setup();
    render(<Toolbar {...defaultProps} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, 'click');

    await user.click(screen.getByTestId('add-pak-button'));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('calls onFileSelect when file is selected', async () => {
    const onFileSelect = vi.fn();
    render(<Toolbar {...defaultProps} onFileSelect={onFileSelect} />);

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
    const onFileSelect = vi.fn();
    render(<Toolbar {...defaultProps} onFileSelect={onFileSelect} />);

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
    const onFileSelect = vi.fn();
    render(<Toolbar {...defaultProps} onFileSelect={onFileSelect} />);

    const input = screen.getByTestId('file-input') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [],
      configurable: true,
    });

    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onFileSelect).not.toHaveBeenCalled();
  });
});
