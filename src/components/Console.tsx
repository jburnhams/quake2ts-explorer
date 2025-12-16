import React, { useState, useEffect, useRef } from 'react';
import { getConsoleService } from '../services/consoleService';
import './Console.css';

interface ConsoleProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Console: React.FC<ConsoleProps> = ({ isOpen, onClose }) => {
  // If controlled (isOpen provided), use it. Otherwise use internal state (for standalone dev/test).
  const [internalVisible, setInternalVisible] = useState(false);
  const isVisible = isOpen !== undefined ? isOpen : internalVisible;

  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [messages, setMessages] = useState(getConsoleService().getMessages());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If controlled, parent handles toggle.
      if (isOpen !== undefined) return;

      if (e.code === 'Backquote' || e.code === 'F1') {
        e.preventDefault();
        setInternalVisible(v => !v);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
        inputRef.current.focus();
    }
  }, [isVisible]);

  useEffect(() => {
      const unsubscribe = getConsoleService().subscribe(() => {
          setMessages([...getConsoleService().getMessages()]);
      });
      return unsubscribe;
  }, []);

  useEffect(() => {
      if (isVisible && messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [messages, isVisible]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
        getConsoleService().executeCommand(input);
        setInput('');
        setHistoryIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
          e.preventDefault();
          const history = getConsoleService().getHistory();
          if (history.length === 0) return;

          const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setInput(history[newIndex]);
      } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const history = getConsoleService().getHistory();
          if (history.length === 0 || historyIndex === -1) return;

          const newIndex = Math.min(history.length - 1, historyIndex + 1);
          if (newIndex === history.length - 1 && historyIndex === history.length - 1) {
             setHistoryIndex(-1);
             setInput('');
          } else {
             setHistoryIndex(newIndex);
             setInput(history[newIndex]);
          }
      } else if (e.key === 'Escape') {
          if (onClose) onClose();
          else setInternalVisible(false);
      }
  };

  if (!isVisible) return null;

  return (
    <div className="console-overlay">
      <div className="console-log">
        {messages.map((msg, i) => (
            <div key={i} className={`console-msg ${msg.type}`}>
                <span className="timestamp">[{new Date(msg.timestamp).toLocaleTimeString()}]</span> {msg.text}
            </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="console-input-bar">
          <span className="prompt">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
      </form>
    </div>
  );
};
