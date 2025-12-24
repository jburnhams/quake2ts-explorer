import { consoleService, LogLevel } from '../../../src/services/consoleService';


describe('ConsoleService Extra Coverage', () => {
    beforeEach(() => {
        consoleService.clearLogs();
    });

    it('unregisters commands', () => {
        const handler = vi.fn();
        consoleService.registerCommand('temp', handler);
        consoleService.executeCommand('temp');
        expect(handler).toHaveBeenCalled();

        consoleService.unregisterCommand('temp');
        consoleService.executeCommand('temp');
        const logs = consoleService.getLogs();
        expect(logs[logs.length - 1].message).toContain('Unknown command');
    });

    it('executes built-in echo', () => {
        consoleService.executeCommand('echo hello world');
        const logs = consoleService.getLogs();
        // logs[0] is command echoing
        // logs[1] is output
        expect(logs.some(l => l.message === 'hello world')).toBe(true);
    });

    it('executes built-in clear', () => {
        consoleService.log('msg 1');
        expect(consoleService.getLogs().length).toBeGreaterThan(0);
        consoleService.executeCommand('clear');
        // executeCommand logs the command first, then executes handler.
        // handler calls clearLogs(), which sets logs = [].
        expect(consoleService.getLogs().length).toBe(0);
    });

    it('executes built-in help', () => {
        consoleService.executeCommand('help');
        const logs = consoleService.getLogs();
        expect(logs.some(l => l.message.includes('Available commands'))).toBe(true);
    });
});
