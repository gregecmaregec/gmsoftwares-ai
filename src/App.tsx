import React, { useState, useRef, useEffect } from 'react'
import './App.css'
import { useTheme } from './ThemeContext'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Privacy from './components/Privacy'
import About from './components/About'
import { Brain, Send, ClipboardCopy, Check, Globe } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown' // For components prop typing
import remarkGfm from 'remark-gfm'
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Define props for our custom code component to align with ReactMarkdown
interface CustomCodeProps {
  node?: any; // AST node, provided by ReactMarkdown
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  // Allow other props that might be passed by ReactMarkdown or remark-gfm
  [key: string]: any; 
}

// Define message type
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  model?: string; // Stores actual model from API or 'classifying' or pre-selected model
  reasoning?: string; // To store the thinking/reasoning output
}

// Cookie Disclaimer Component
const CookieDisclaimer = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  
  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookiesAccepted') === 'true';
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);
  
  const handleAccept = () => {
    setIsHiding(true);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      setIsVisible(false);
      // Save to localStorage
      localStorage.setItem('cookiesAccepted', 'true');
    }, 300);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className={`cookie-disclaimer ${isHiding ? 'hidden' : ''}`}>
      <div className="cookie-text">
        This site uses cookies to enhance your experience.
        <br />
        <Link to="/privacy" className="cookie-link">See privacy policy</Link>
      </div>
      <button className="cookie-accept" onClick={handleAccept}>
        <span>Accept</span>
      </button>
    </div>
  );
};

// Comprehensive model list with many options
const ALL_MODEL_OPTIONS = [
  // top of the line
  { id: 'auto', name: 'auto'},
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.7-sonnet:thinking', name: 'Claude 3.7 Sonnet (Thinking)', provider: 'Anthropic' },
  { id: 'x-ai/grok-3-mini-beta', name: 'Grok 3 Mini β', provider: 'xAI' },
  { id: 'x-ai/grok-3-beta', name: 'Grok 3 β', provider: 'xAI' },
  { id: 'openai/o4-mini-high', name: 'GPT-o4 Mini High', provider: 'OpenAI' },
  { id: 'openai/codex-mini', name: 'OpenAI Codex Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI' },
  { id: 'openai/gpt-4.5-preview', name: 'GPT-4.5 Preview', provider: 'OpenAI' },
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro Preview', provider: 'Google' },
  { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview 05 20', provider: 'Google' },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat V3 0324', provider: 'DeepSeek' },
  // the rest
  { id: 'amazon/nova-lite-v1', name: 'Nova Lite V1', provider: 'Amazon' },
  { id: 'anthropic/claude-3.5-haiku-20241022:beta', name: 'Claude 3.5 Haiku 20241022 β', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.7-sonnet:beta', name: 'Claude 3.7 Sonnet β', provider: 'Anthropic' },
  { id: 'cohere/command-r-plus-08-2024', name: 'Command R Plus 08 2024', provider: 'Cohere' },
  { id: 'cohere/command-r7b-12-2024', name: 'Command R7B 12 2024', provider: 'Cohere' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash 001', provider: 'Google' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', provider: 'Meta-Llama' },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta-Llama' },
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta-Llama' },
  { id: 'microsoft/phi-4', name: 'Phi-4', provider: 'Microsoft' },
  { id: 'mistral/ministral-8b', name: 'Ministral 8B', provider: 'Mistral' },
  { id: 'mistralai/mistral-large-2407', name: 'Mistral Large 2407', provider: 'MistralAI' },
  { id: 'mistralai/mistral-medium-3', name: 'Mistral Medium 3', provider: 'MistralAI' },
  { id: 'nousresearch/hermes-3-llama-3.1-70b', name: 'Hermes 3 Llama 3.1 70B', provider: 'NousResearch' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b-v1:free', name: 'Llama 3.1 Nemotron Ultra 253B V1 (Free)', provider: 'Nvidia' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI' },
  { id: 'openai/gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'openai/o3-mini', name: 'GPT-o3 Mini', provider: 'OpenAI' },
  { id: 'openai/o4-mini', name: 'GPT-o4 Mini', provider: 'OpenAI' },
  { id: 'qwen/qwen-2.5-7b-instruct', name: 'Qwen 2.5 7B Instruct', provider: 'Qwen' },

];

// Helper function to get display name for a model
const getModelDisplayName = (modelId: string): string => {
  const isOnline = modelId.endsWith(':online');
  const baseModelId = isOnline ? modelId.replace(':online', '') : modelId;
  const baseModel = ALL_MODEL_OPTIONS.find(m => m.id === baseModelId);
  const baseName = baseModel?.name || baseModelId;
  return isOnline ? `${baseName} + Web Search` : baseName;
};

// Define the set of top-tier model IDs
const TOP_TIER_MODEL_IDS = new Set([
  'auto',
  'anthropic/claude-opus-4',
  'anthropic/claude-sonnet-4',
  'x-ai/grok-3-mini-beta',
  'x-ai/grok-3-mini-beta:online',
  'openai/o4-mini-high',
  'anthropic/claude-3.7-sonnet:thinking',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-flash-preview',
  'openai/gpt-4.1',
  'openai/gpt-4.5-preview',
  'deepseek/deepseek-chat-v3-0324',
  'openai/codex-mini',
  'google/gemini-2.5-flash-preview-05-20',  
  'x-ai/grok-3-beta'
]);

function App() {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedModel, setSelectedModel] = useState(ALL_MODEL_OPTIONS[0].id) // Default to auto
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  // Filtered model options based on search
  const filteredModelOptions = ALL_MODEL_OPTIONS.filter(model =>
    model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
    (model.provider && model.provider.toLowerCase().includes(modelSearchTerm.toLowerCase()))
  );

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [inputValue])
  
  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setModelSearchTerm('');
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Let the newline be added naturally
        return
      } else {
        e.preventDefault()
        handleSubmit(e as unknown as React.FormEvent)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = inputValue.trim();
    if (!currentInput) return;

    setIsAiResponding(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      sender: 'user',
      timestamp: new Date(),
    };

    // Limit the history sent to the API to improve performance for the first token
    const HISTORY_SIZE_LIMIT = 20; // Keep the last 20 messages
    const recentMessages = messages.slice(-HISTORY_SIZE_LIMIT);

    const messagesForApi = [
      ...recentMessages.map(msg => ({ // Changed from 'messages' to 'recentMessages'
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: currentInput }
    ];

    const aiMessageId = (Date.now() + 1).toString();
    let initialAiModel: string | undefined = undefined;
    if (selectedModel === 'auto') {
      initialAiModel = 'classifying'; // Special status for auto mode
    } else if (selectedModel && ALL_MODEL_OPTIONS.find(m => m.id === selectedModel)) {
      initialAiModel = selectedModel; // Pre-set model if manually chosen
    }

    const aiPlaceholderMessage: Message = {
      id: aiMessageId,
      content: '', 
      sender: 'ai',
      timestamp: new Date(),
      model: initialAiModel,
    };
    setMessages(prev => [...prev, userMessage, aiPlaceholderMessage]);

    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch('https://ai-api.gmsoftwares.com/api/chat', {
        method: 'POST',
        headers: {
          'Authorization': 'ljubimte',
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          model: selectedModel === 'auto' ? selectedModel : (isWebSearchEnabled ? `${selectedModel}:online` : selectedModel),
          stream: true,
          messages: messagesForApi,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = response.body ? await response.text() : `HTTP error! status: ${response.status}`;
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, content: `Error: ${errorText}` } : msg
        ));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = ''; 
      let currentAiMessageModel: string | undefined = undefined;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        let eolIndex;

        while ((eolIndex = streamBuffer.indexOf('\n')) >= 0) {
          const line = streamBuffer.substring(0, eolIndex).trim();
          streamBuffer = streamBuffer.substring(eolIndex + 1);

          if (line.startsWith('event: metadata')) {
            const nextLine = streamBuffer.substring(0, streamBuffer.indexOf('\n')).trim();
            if (nextLine.startsWith('data: ')) {
              try {
                const metadata = JSON.parse(nextLine.substring(5));
                if (metadata.final_model_used_for_generation) {
                  currentAiMessageModel = metadata.final_model_used_for_generation;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === aiMessageId ? { ...msg, model: currentAiMessageModel } : msg
                    )
                  );
                }
              } catch (parseError) {
                console.error('Error parsing metadata:', parseError, 'Data:', nextLine);
              }
            }
            continue;
          }

          if (line.startsWith('data: ')) {
            const jsonData = line.substring(5).trim();
            if (jsonData === '[DONE]') {
              continue;
            }
            if (jsonData) {
              try {
                const chunk = JSON.parse(jsonData);
                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                  const deltaContent = chunk.choices[0].delta.content;
                  if (deltaContent) {
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === aiMessageId
                          ? { ...msg, content: msg.content + deltaContent, model: currentAiMessageModel }
                          : msg
                      )
                    );
                  }
                  // Check for reasoning
                  const reasoningContent = chunk.choices[0].delta.reasoning;
                  if (reasoningContent) {
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === aiMessageId
                          ? { ...msg, reasoning: (msg.reasoning || '') + reasoningContent }
                          : msg
                      )
                    );
                  }
                }
                if (chunk.usage) {
                  console.log('API Usage:', chunk.usage);
                }
              } catch (parseError) {
                console.error('Error parsing stream data:', parseError, 'Data:', jsonData);
              }
            }
          }
        }
      }
      // Process any remaining data in streamBuffer if the stream ended without a final newline
      if (streamBuffer.startsWith('data: ')) {
        const jsonData = streamBuffer.substring(5).trim();
        if (jsonData && jsonData !== '[DONE]') {
            try {
                const chunk = JSON.parse(jsonData);
                if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta) {
                    const deltaContent = chunk.choices[0].delta.content;
                    if (deltaContent) {
                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === aiMessageId
                                ? { ...msg, content: msg.content + deltaContent, model: currentAiMessageModel }
                                : msg
                            )
                        );
                    }
                    // Check for reasoning in final accumulated data
                    const reasoningContent = chunk.choices[0].delta.reasoning;
                    if (reasoningContent) {
                      setMessages(prev =>
                        prev.map(msg =>
                          msg.id === aiMessageId
                            ? { ...msg, reasoning: (msg.reasoning || '') + reasoningContent }
                            : msg
                        )
                      );
                    }
                }
            } catch(e) {
                console.error("Error parsing final accumulated data:", e, "Data:", jsonData);
            }
        }
      }

    } catch (error) {
      console.error('Failed to send message or process stream:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, content: `Error: ${error instanceof Error ? error.message : String(error)}` } : msg
      ));
    } finally {
      setIsAiResponding(false);
    }
  };
  
  const selectModelOption = (modelId: string) => {
    setSelectedModel(modelId)
    setIsDropdownOpen(false)
    setModelSearchTerm('')
  }

  return (
    <Router>
      <div className="app-container">
        {/* SVG Gradient definition for the brain icon */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="send-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={
            <div className="content-container">
              <div className="conversation-container">
                {messages.map(message => (
                  <div key={message.id} className={`message-entry ${message.sender}`}>
                    {(message.sender === 'ai' && message.model) && (
                      <div className={`message-metadata model-name-container ${message.model === 'classifying' ? '' : 'model-name-highlight'}`}>
                        {message.model === 'classifying' ? (
                          <span className="classifying-indicator">classifying<span className="dots"><span>.</span><span>.</span><span>.</span></span></span>
                        ) : (
                          getModelDisplayName(message.model)
                        )}
                      </div>
                    )}
                    {message.sender === 'ai' && message.reasoning && (
                      <div className="message-reasoning">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.reasoning}
                        </ReactMarkdown>
                      </div>
                    )}
                    <div className={`message ${message.sender}`}>
                      <div className="message-content">
                        {message.sender === 'ai' && message.content === '' && !message.reasoning ? (
                          <div className="loading-dots-container">
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                            <span className="loading-dot"></span>
                          </div>
                        ) : message.sender === 'ai' ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ node, inline, className, children, ...props }: CustomCodeProps) => {
                                const { theme } = useTheme();
                                const match = /language-(\w+)/.exec(className || '');
                                const [isCopied, setIsCopied] = useState(false);

                                const { style: _style, dangerouslySetInnerHTML, ...restHtmlProps } = props;

                                if (!inline && match) {
                                  const codeString = String(children).replace(/\n$/, '');
                                  const handleCopy = () => {
                                    navigator.clipboard.writeText(codeString).then(() => {
                                      setIsCopied(true);
                                      setTimeout(() => setIsCopied(false), 2000);
                                    });
                                  };

                                  return (
                                    <div style={{ position: 'relative' }}> {/* Wrapper for position:relative context */}
                                      <button 
                                        onClick={handleCopy} 
                                        className="copy-code-button"
                                        aria-label={isCopied ? "Copied!" : "Copy code"}
                                      >
                                        {isCopied ? <Check size={14} /> : <ClipboardCopy size={14} />}
                                      </button>
                                      <SyntaxHighlighter
                                        style={theme === 'dark' ? atomDark : oneLight}
                                        language={match[1]}
                                        PreTag="div" // This div is targeted by div[class*="language-"] 
                                                     // and its pre child is div[class*="language-"] pre
                                        {...restHtmlProps}
                                      >
                                        {codeString}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                } else {
                                  // For inline code or code blocks without a language match
                                  return (
                                    <code className={className} {...restHtmlProps}> {/* Pass remaining valid HTML attributes */}
                                      {children}
                                    </code>
                                  );
                                }
                              }
                            } as Components}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <div style={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="message-metadata message-timestamp">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <form onSubmit={handleSubmit} className="search-form">
                <div className={`search-input-wrapper ${isFocused ? 'focused' : ''}`}>
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={
                      isFocused ? "" : 
                      selectedModel === 'auto' ? "Ask Artificial Intelligence" :
                      `Ask ${getModelDisplayName(selectedModel)}`
                    }
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
                
                <div className="model-selector-container" ref={dropdownRef}>
                  <div 
                    className={`model-selector-header ${isDropdownOpen ? 'active' : ''}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {selectedModel !== 'auto' && (
                      <div 
                        className={`web-search-toggle ${isWebSearchEnabled ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsWebSearchEnabled(!isWebSearchEnabled);
                        }}
                        title={isWebSearchEnabled ? 'Disable web search' : 'Enable web search'}
                      >
                        <Globe size={12} />
                        <span>Web Search</span>
                      </div>
                    )}
                    <span className="selected-model">
                      {selectedModel === 'auto' && <Brain size={14} className="brain-icon" />}
                      {selectedModel === 'auto' ? ALL_MODEL_OPTIONS.find(model => model.id === selectedModel)?.name : 'manual'}
                    </span>
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="model-dropdown open">
                      <div className="model-search-input-wrapper">
                        <input
                          type="text"
                          placeholder="Search"
                          className="model-search-input"
                          value={modelSearchTerm}
                          onChange={(e) => setModelSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="model-options-list">
                        {filteredModelOptions.map((model, index) => {
                          const isLastTopTierBeforeRest =
                            TOP_TIER_MODEL_IDS.has(model.id) &&
                            (() => {
                              const originalIndex = ALL_MODEL_OPTIONS.findIndex(m => m.id === model.id);
                              // Ensure model is found and not the last in the original list
                              if (originalIndex === -1 || originalIndex === ALL_MODEL_OPTIONS.length - 1) {
                                return false;
                              }
                              const nextOriginalModel = ALL_MODEL_OPTIONS[originalIndex + 1];
                              return !TOP_TIER_MODEL_IDS.has(nextOriginalModel.id);
                            })();

                          // Check if there's any non-top-tier model *after* this one in the *filtered* list
                          const subsequentFilteredNonTopTierExists =
                            filteredModelOptions.slice(index + 1).some(nextFilteredModel => !TOP_TIER_MODEL_IDS.has(nextFilteredModel.id));

                          const showDivider = isLastTopTierBeforeRest && subsequentFilteredNonTopTierExists;

                          return (
                            <React.Fragment key={model.id}>
                              <div
                                className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                                onClick={() => selectModelOption(model.id)}
                              >
                                <div className="model-option-name">{model.name}</div>
                                {model.provider && <div className="model-option-provider">{model.provider}</div>}
                              </div>
                              {showDivider && <div className="model-divider" />}
                            </React.Fragment>
                          );
                        })}
                        {filteredModelOptions.length === 0 && (
                          <div className="model-option-empty">No AI found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          } />
        </Routes>
        
        <footer className="footer">
          <div className="footer-links">
            <a href="https://gmsoftwares.com" target="_blank" rel="noopener noreferrer" className="footer-link gm-link">
              G.M.Softwares
            </a>
            <span className="footer-divider">|</span>
            <button onClick={toggleTheme} className="footer-link">
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
            <span className="footer-divider">|</span>
            <Link to="/about" className="footer-link">About</Link>
            <span className="footer-divider">|</span>
            <Link to="/privacy" className="footer-link">Privacy</Link>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
