import { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';

// Memoized Cookie Disclaimer Component
export const CookieDisclaimer = memo(() => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  
  useEffect(() => {
    // Check if user has already accepted cookies
    const hasAccepted = localStorage.getItem('cookiesAccepted') === 'true';
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);
  
  const handleAccept = useCallback(() => {
    setIsHiding(true);
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      setIsVisible(false);
      // Save to localStorage
      localStorage.setItem('cookiesAccepted', 'true');
    }, 300);
  }, []);
  
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
});

CookieDisclaimer.displayName = 'CookieDisclaimer'; 