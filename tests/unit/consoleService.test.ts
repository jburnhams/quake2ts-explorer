import { getConsoleService, resetConsoleService } from '../../src/services/consoleService';

describe('ConsoleService', () => {
  let consoleService: any;

  beforeEach(() => {
    resetConsoleService();
    consoleService = getConsoleService();
  });

  it('should register and execute commands', () => {
    const handler = jest.fn();
    consoleService.registerCommand('test', handler);

    consoleService.executeCommand('test arg1 arg2');

    expect(handler).toHaveBeenCalledWith(['arg1', 'arg2']);
  });

  it('should handle unknown commands', () => {
    consoleService.executeCommand('unknown');

    const messages = consoleService.getMessages();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[messages.length - 1].text).toContain('Unknown command');
    expect(messages[messages.length - 1].type).toBe('warning');
  });

  it('should maintain history', () => {
    consoleService.executeCommand('cmd1');
    consoleService.executeCommand('cmd2');

    const history = consoleService.getHistory();
    expect(history).toEqual(['cmd1', 'cmd2']);
  });

  it('should log messages and notify listeners', () => {
    const listener = jest.fn();
    consoleService.subscribe(listener);

    consoleService.log('Hello');

    expect(listener).toHaveBeenCalled();
    const msgs = consoleService.getMessages();
    expect(msgs[msgs.length - 1].text).toBe('Hello');
  });

  it('should clear messages', () => {
      consoleService.log('test');
      expect(consoleService.getMessages().length).toBe(1);

      consoleService.clear();
      expect(consoleService.getMessages().length).toBe(0);
  });
});
