import { useState } from 'react'
import './App.css'
import './styles/performance.css'
import { useTheme } from './ThemeContext'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Privacy from './components/Privacy'
import About from './components/About'
import type { Message } from './types/message'
import { ChatInterface } from './components/layout/ChatInterface'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const { theme, toggleTheme, getThemeDisplayName } = useTheme()

  // GAMING MODE - Uncomment the line below to show gaming overlay
  //  const isGaming = true;
  const isGaming: boolean | undefined = undefined; // Change to true to enable gaming mode

  return (
    <Router>
      <div className="app-container">
        {/* GAMING OVERLAY - Shows when isGaming is true */}
        {typeof isGaming !== 'undefined' && isGaming && (
          <div className="gaming-overlay">
            <div className="gaming-message">
              <h1>🎮 Sorry, I'm Gaming!</h1>
              <p>This is a hub for the best AI in the world. However;</p>
              <p>The server is dependent on a PC that I have running in my student dorm being in its Linux server mode. I'm not often switching from the Linux server environment to Windows in order to game, but this is one of those rare occasions.</p>
              <p>Check back in an hour or so!</p>
              <div className="gaming-footer">
                <small>Regards, find ways to reach me at: <a href="https://gregormihelac.com" target="_blank" rel="noopener noreferrer">gregormihelac.com</a></small>
              </div>
            </div>
          </div>
        )}

        {/* SVG Gradient definitions using CSS variables */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--brain-gradient-start)" />
              <stop offset="100%" stopColor="var(--brain-gradient-end)" />
            </linearGradient>
            <linearGradient id="send-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--send-gradient-start)" />
              <stop offset="100%" stopColor="var(--send-gradient-end)" />
            </linearGradient>
          </defs>
        </svg>

        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={
            <ChatInterface 
              messages={messages} 
              setMessages={setMessages}
              theme={theme}
            />
          } />
        </Routes>
        
        <footer className="footer">
          <div className="footer-links">
            <a href="https://gmsoftwares.com" target="_blank" rel="noopener noreferrer" className="footer-link gm-link">
              G.M.Softwares
            </a>
            <span className="footer-divider">|</span>
            <button onClick={toggleTheme} className="footer-link">
              {getThemeDisplayName(
                theme === 'light' ? 'dark' : 
                theme === 'dark' ? 'ultra-black' : 
                'light'
              )}
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
