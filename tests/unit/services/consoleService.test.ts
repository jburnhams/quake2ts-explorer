import { consoleService, LogLevel } from '../../../src/services/consoleService';

describe('ConsoleService', () => {
  beforeEach(() => {
    consoleService.clearLogs();
  });

  it('should register and execute commands', () => {
    const handler = vi.fn();
    consoleService.registerCommand('test', handler);

    consoleService.executeCommand('test arg1 arg2');
    expect(handler).toHaveBeenCalledWith(['arg1', 'arg2']);
  });

  it('should handle case insensitivity', () => {
    const handler = vi.fn();
    consoleService.registerCommand('Test', handler);

    consoleService.executeCommand('TEST');
    expect(handler).toHaveBeenCalled();
  });

  it('should log messages', () => {
    consoleService.log('test message', LogLevel.INFO);
    const logs = consoleService.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].message).toBe('test message');
    expect(logs[0].level).toBe(LogLevel.INFO);
  });

  it('should notify subscribers', () => {
    const subscriber = vi.fn();
    const unsubscribe = consoleService.subscribe(subscriber);

    consoleService.log('test');
    expect(subscriber).toHaveBeenCalled();

    unsubscribe();
    consoleService.log('test 2');
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('should manage history', () => {
    consoleService.executeCommand('cmd1');
    consoleService.executeCommand('cmd2');

    expect(consoleService.getHistoryPrevious()).toBe('cmd2');
    expect(consoleService.getHistoryPrevious()).toBe('cmd1');
    expect(consoleService.getHistoryNext()).toBe('cmd2');
    expect(consoleService.getHistoryNext()).toBe('');
  });

  it('should handle errors gracefully', () => {
    const handler = vi.fn(() => {
      throw new Error('oops');
    });
    consoleService.registerCommand('fail', handler);

    consoleService.executeCommand('fail');
    const logs = consoleService.getLogs();
    expect(logs[logs.length - 1].level).toBe(LogLevel.ERROR);
    expect(logs[logs.length - 1].message).toContain('oops');
  });

  it('should return command suggestions', () => {
    consoleService.registerCommand('foobar', () => {});
    consoleService.registerCommand('foobaz', () => {});
    consoleService.registerCommand('football', () => {});

    // Exact match prefix
    const suggestions1 = consoleService.getSuggestions('foo');
    expect(suggestions1).toContain('foobar');
    expect(suggestions1).toContain('foobaz');
    expect(suggestions1).toContain('football');

    // Partial match
    const suggestions2 = consoleService.getSuggestions('foob');
    expect(suggestions2).toContain('foobar');
    expect(suggestions2).toContain('foobaz');
    expect(suggestions2).not.toContain('football');

    // Case insensitive
    const suggestions3 = consoleService.getSuggestions('FOO');
    expect(suggestions3).toContain('foobar');

    // No match
    const suggestions4 = consoleService.getSuggestions('xyz');
    expect(suggestions4).toEqual([]);

    // Empty string
    const suggestions5 = consoleService.getSuggestions('');
    expect(suggestions5).toEqual([]);
  });

  it('should register and retrieve help text', () => {
    consoleService.registerCommand('help-cmd', () => {}, 'This is help text');
    expect(consoleService.getHelpText('help-cmd')).toBe('This is help text');
    expect(consoleService.getHelpText('HELP-CMD')).toBe('This is help text');
    expect(consoleService.getHelpText('unknown')).toBeUndefined();
  });
});
