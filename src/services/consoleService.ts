
export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

export interface ConsoleLog {
  id: string;
  timestamp: number;
  message: string;
  level: LogLevel;
}

export type CommandHandler = (args: string[]) => void;

class ConsoleService {
  private commands = new Map<string, CommandHandler>();
  private logs: ConsoleLog[] = [];
  private history: string[] = [];
  private historyIndex = -1;
  private listeners = new Set<() => void>();
  private maxLogs = 500;
  private maxHistory = 50;

  constructor() {
    // Register basic built-in commands
    this.registerCommand('help', this.handleHelp.bind(this));
    this.registerCommand('clear', this.clearLogs.bind(this));
    this.registerCommand('echo', (args) => this.log(args.join(' ')));
  }

  // --- Command Management ---

  registerCommand(name: string, handler: CommandHandler): void {
    this.commands.set(name.toLowerCase(), handler);
  }

  unregisterCommand(name: string): void {
    this.commands.delete(name.toLowerCase());
  }

  executeCommand(input: string): void {
    const trimmed = input.trim();
    if (!trimmed) return;

    this.addToHistory(trimmed);
    this.log(`] ${trimmed}`, LogLevel.INFO);

    const parts = trimmed.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.commands.get(commandName);
    if (handler) {
      try {
        handler(args);
      } catch (err) {
        this.log(`Error executing '${commandName}': ${err instanceof Error ? err.message : String(err)}`, LogLevel.ERROR);
      }
    } else {
      this.log(`Unknown command: ${commandName}`, LogLevel.WARNING);
    }
  }

  // --- Logging ---

  log(message: string, level: LogLevel = LogLevel.INFO): void {
    const logEntry: ConsoleLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      message,
      level
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    this.notifyListeners();
  }

  clearLogs(): void {
    this.logs = [];
    this.notifyListeners();
  }

  getLogs(): ConsoleLog[] {
    return [...this.logs];
  }

  // --- History ---

  private addToHistory(command: string): void {
    // Remove duplication if same as last
    if (this.history.length > 0 && this.history[this.history.length - 1] === command) {
        return;
    }
    this.history.push(command);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length;
  }

  getHistoryPrevious(): string | null {
    if (this.history.length === 0) return null;
    if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    return this.history[this.historyIndex];
  }

  getHistoryNext(): string | null {
    if (this.history.length === 0) return null;
    if (this.historyIndex < this.history.length) {
      this.historyIndex++;
    }
    if (this.historyIndex === this.history.length) {
      return ''; // Blank line at end
    }
    return this.history[this.historyIndex];
  }

  // --- Subscriptions ---

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // --- Built-in Handlers ---

  private handleHelp(args: string[]): void {
    const commands = Array.from(this.commands.keys()).sort();
    this.log('Available commands:', LogLevel.INFO);
    this.log(commands.join(', '), LogLevel.INFO);
  }
}

export const consoleService = new ConsoleService();
