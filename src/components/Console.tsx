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
  const [suggestions, setSuggestions] = useState<string[]>([]);
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
      setSuggestions([]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const currentSuggestions = consoleService.getSuggestions(inputValue);
      if (currentSuggestions.length > 0) {
        setInputValue(currentSuggestions[0] + ' ');
        setSuggestions([]);
      }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      setSuggestions(consoleService.getSuggestions(value));
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion + ' ');
    setSuggestions([]);
    inputRef.current?.focus();
  };

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

      {suggestions.length > 0 && (
        <div className="console-suggestions">
          {suggestions.map((suggestion) => {
            const helpText = consoleService.getHelpText(suggestion);
            return (
              <div
                key={suggestion}
                className="console-suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="suggestion-name">{suggestion}</span>
                {helpText && <span className="suggestion-help"> - {helpText}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="console-input-area">
        <span className="console-prompt">&gt;</span>
        <input
          ref={inputRef}
          className="console-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  );
};
