import React from 'react';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="privacy-container">
      <h1>Privacy Policy</h1>
      <p>This is a simple privacy policy page for the gmsoftwares.ai application.</p>
      <p>I built this application myself, its mostly an openrouter wrapper. Your prompts are sent to my server I set up in my dorm room, classified with a large language model that spins my local rtx 3070ti, and then onward to OpenRouter.</p>
      
      <div className="privacy-section">
        <h2>Information We Collect</h2>
        <p>When you use our services, we may collect and process the following information:</p>
        <ul>
          <li>Queries you submit to the AI</li>
          <li>Basic usage statistics</li>
          <li>Technical information about your device and connection</li>
        </ul>
      </div>
      
      <div className="back-link">
        <Link to="/">← Back to home</Link>
      </div>
    </div>
  );
};

export default Privacy; 