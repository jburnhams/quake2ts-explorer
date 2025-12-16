export type CommandHandler = (args: string[]) => void;

export enum LogLevel {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    SUCCESS = 'info' // Map success to info for now
}

interface ConsoleMessage {
    text: string;
    type: 'info' | 'warning' | 'error';
    timestamp: number;
}

class ConsoleService {
    private commands: Map<string, CommandHandler> = new Map();
    private history: string[] = [];
    private messages: ConsoleMessage[] = [];
    private listeners: (() => void)[] = [];

    registerCommand(name: string, handler: CommandHandler): void {
        this.commands.set(name.toLowerCase(), handler);
    }

    unregisterCommand(name: string): void {
        this.commands.delete(name.toLowerCase());
    }

    executeCommand(input: string): void {
        if (!input.trim()) return;

        this.history.push(input);
        this.log(`] ${input}`, 'info');

        const parts = input.trim().split(/\s+/);
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        const handler = this.commands.get(commandName);
        if (handler) {
            try {
                handler(args);
            } catch (e) {
                this.log(`Error executing '${commandName}': ${e}`, 'error');
            }
        } else {
            this.log(`Unknown command: ${commandName}`, 'warning');
        }
    }

    log(text: string, type: 'info' | 'warning' | 'error' = 'info'): void {
        this.messages.push({
            text,
            type,
            timestamp: Date.now()
        });
        this.notifyListeners();
    }

    getMessages(): ConsoleMessage[] {
        return this.messages;
    }

    getHistory(): string[] {
        return this.history;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        this.listeners.forEach(l => l());
    }

    clear(): void {
        this.messages = [];
        this.notifyListeners();
    }

    clearLogs(): void {
        this.clear();
    }
}

let consoleServiceInstance: ConsoleService | null = null;

export function getConsoleService(): ConsoleService {
    if (!consoleServiceInstance) {
        consoleServiceInstance = new ConsoleService();
    }
    return consoleServiceInstance;
}

export function resetConsoleService(): void {
    consoleServiceInstance = null;
}

export const consoleService = getConsoleService();
