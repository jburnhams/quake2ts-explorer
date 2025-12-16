import { consoleService, LogLevel } from '../../../src/services/consoleService';

describe('ConsoleService', () => {
  beforeEach(() => {
    consoleService.clearLogs();
  });

  it('should register and execute commands', () => {
    const handler = jest.fn();
    consoleService.registerCommand('test', handler);

    consoleService.executeCommand('test arg1 arg2');
    expect(handler).toHaveBeenCalledWith(['arg1', 'arg2']);
  });

  it('should handle case insensitivity', () => {
    const handler = jest.fn();
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
    const subscriber = jest.fn();
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
    const handler = jest.fn(() => {
      throw new Error('oops');
    });
    consoleService.registerCommand('fail', handler);

    consoleService.executeCommand('fail');
    const logs = consoleService.getLogs();
    expect(logs[logs.length - 1].level).toBe(LogLevel.ERROR);
    expect(logs[logs.length - 1].message).toContain('oops');
  });
});
