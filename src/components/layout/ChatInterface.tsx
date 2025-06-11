import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send } from 'lucide-react';
import { ALL_MODEL_OPTIONS, getModelDisplayName } from '../../config/models';
import type { Message } from '../../types/message';
import { MessageComponent } from '../chat/MessageComponent';
import { ModelSelector } from '../ui/ModelSelector';
import { CookieDisclaimer } from '../ui/CookieDisclaimer';
import { useStreamingChat } from '../../hooks/useStreamingChat';

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  theme: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, setMessages, theme }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedModel, setSelectedModel] = useState(ALL_MODEL_OPTIONS[0].id); // Default to auto
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isAiResponding } = useStreamingChat({
    selectedModel,
    isWebSearchEnabled,
    messages,
    setMessages
  });

  // Handle typing detection for enhanced border effect
  useEffect(() => {
    if (inputValue.trim().length > 0 && isFocused) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [inputValue, isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = inputValue.trim();
    if (!currentInput) return;

    // Clear input immediately before sending message
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.blur();
    }
    setIsFocused(false);

    // Send message after clearing input
    await sendMessage(currentInput);
  }, [inputValue, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Let the newline be added naturally
        return;
      } else {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }, [handleSubmit]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  const handleWebSearchToggle = useCallback(() => {
    setIsWebSearchEnabled(!isWebSearchEnabled);
  }, [isWebSearchEnabled]);

  // Memoize placeholder text to prevent recalculation
  const placeholderText = useMemo(() => {
    if (isFocused || isAiResponding) return "";
    return selectedModel === 'auto' 
      ? "Ask Artificial Intelligence"
      : `Ask ${getModelDisplayName(selectedModel)}`;
  }, [isFocused, selectedModel, isAiResponding]);

  return (
    <div className="content-container">
      <div className="conversation-container">
        {messages.map(message => (
          <MessageComponent 
            key={message.id} 
            message={message} 
            theme={theme}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="search-form">
        <div 
          className={`search-input-wrapper ${isFocused ? 'focused' : ''} ${isTyping ? 'typing' : ''}`}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholderText}
            className="search-input"
            rows={1}
            disabled={isAiResponding}
          />
          <button 
            className={`send-button ${inputValue.trim() && !isAiResponding ? 'active' : ''}`}
            onClick={handleSubmit}
            type="submit"
            aria-label="Send message"
            disabled={isAiResponding}
          >
            <Send size={16} className="send-icon" />
          </button>
        </div>
        
        {/* Cookie Disclaimer */}
        <CookieDisclaimer />
        
        <ModelSelector
          selectedModel={selectedModel}
          onModelSelect={handleModelSelect}
          isWebSearchEnabled={isWebSearchEnabled}
          onWebSearchToggle={handleWebSearchToggle}
        />
      </form>
    </div>
  );
}; 