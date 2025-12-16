import React, { useState, useEffect, useRef } from 'react';
import { consoleService, LogLevel, type ConsoleLog } from '../services/consoleService';
import './Console.css';

interface ConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Console: React.FC<ConsoleProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [inputValue, setInputValue] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to console service updates
  useEffect(() => {
    // Initial logs
    setLogs(consoleService.getLogs());

    const unsubscribe = consoleService.subscribe(() => {
      setLogs(consoleService.getLogs());
    });

    return unsubscribe;
  }, []);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      consoleService.executeCommand(inputValue);
      setInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = consoleService.getHistoryPrevious();
      if (prev !== null) setInputValue(prev);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = consoleService.getHistoryNext();
      if (next !== null) setInputValue(next);
    } else if (e.key === '`' || e.key === '~') {
      // Prevent typing backtick when closing
      e.preventDefault();
      onClose();
    } else if (e.key === 'Escape') {
        onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="console-overlay">
      <div className="console-logs">
        {logs.map((log) => (
          <div key={log.id} className={`console-log-entry ${log.level}`}>
            <span className="timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
      <div className="console-input-area">
        <span className="console-prompt">&gt;</span>
        <input
          ref={inputRef}
          className="console-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
};
