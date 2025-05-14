import { useState, useRef, useEffect } from 'react'
import './App.css'
import { useTheme } from './ThemeContext'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Privacy from './components/Privacy'
import About from './components/About'
import { Brain, Send } from 'lucide-react'

// Define message type
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
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
        Accept
      </button>
    </div>
  );
};

// Define model options
const MODEL_OPTIONS = [
  { id: 'auto', name: 'auto' },
  { id: 'mistral-medium-3', name: 'mistral-medium-3' },
  { id: 'x-ai/grok-3-mini-beta', name: 'x-ai/grok-3-mini-beta' }
];

function App() {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedModel, setSelectedModel] = useState('auto')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // Add user message
    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, newMessage])
    
    // Clear input
    setInputValue('')
    
    // Simulate AI response (would connect to API in production)
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `This is a simulated response to: "${newMessage.content}" using ${selectedModel} model.`,
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }
  
  const selectModelOption = (modelId: string) => {
    setSelectedModel(modelId)
    setIsDropdownOpen(false)
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
                  <div key={message.id} className={`message ${message.sender}`}>
                    <div className="message-content">{message.content}</div>
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
                    placeholder={isFocused ? "" : "Ask Artificial Intelligence"}
                    className="search-input"
                    rows={1}
                  />
                  <button 
                    className={`send-button ${inputValue.trim() ? 'active' : ''}`}
                    onClick={handleSubmit}
                    type="submit"
                    aria-label="Send message"
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
                    <span className="selected-model">
                      {selectedModel === 'auto' && <Brain size={14} className="brain-icon" />}
                      {MODEL_OPTIONS.find(model => model.id === selectedModel)?.name}
                    </span>
                    <span className="model-arrow"></span>
                  </div>
                  
                  <div className={`model-dropdown ${isDropdownOpen ? 'open' : ''}`}>
                    {MODEL_OPTIONS.map(model => (
                      <div 
                        key={model.id}
                        className={`model-option ${selectedModel === model.id ? 'selected' : ''}`}
                        onClick={() => selectModelOption(model.id)}
                      >
                        {model.name}
                      </div>
                    ))}
                  </div>
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
