import React from 'react';
import { Link } from 'react-router-dom';

const Privacy: React.FC = () => {
  return (
    <div className="privacy-container">
      <h1>Privacy Policy</h1>
      
      <p>
        This is a simple privacy policy page for the gmsoftwares.ai application.
      </p>
      
      <div className="privacy-section">
        <h2>Information I Collect</h2>
        <p>When you use this service, this is an example of a log I make:</p>
        <pre className="log-example" style={{
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineHeight: '1.4',
          overflowX: 'auto',
          whiteSpace: 'pre',
          margin: '1rem 0'
        }}>
{`2025/05/19 07:00:01 Received request for model 'auto', stream: true.
2025/05/19 07:00:02 DEBUG: Raw classification response from Ollama: '7'
2025/05/19 07:00:02 Classified as: 7
2025/05/19 07:00:02 Mapped to: 7-Advanced Reasoning, Coding & Technical Tasks (Model: x-ai/grok-3-mini-beta)
2025/05/19 07:00:20 Successfully forwarded data: [DONE] from OpenRouter.
2025/05/19 07:00:20 Successfully streamed full response from OpenRouter, forwarded [DONE]. Total content characters (approx): 6377
2025/05/19 07:00:20 Finished streaming request.`}
        </pre>
        
        <p>Notice the following: I don't log your:</p>
        <ul>
          <li>IP address</li>
          <li>Input to the AI</li>
          <li>Output from the AI</li>
          <li>Location</li>
          <li>Browser Information</li>
        </ul>
      </div>

      <div className="privacy-section">
        <h2>Data Privacy</h2>
        <p>
          Except the local AI model I use for smart classification of prompts that I have set up on my RTX3070ti in my student dorm room, for the other AI models, I use OpenRouter. For the data processing from OpenRouter's side, check out <a href="https://openrouter.ai/docs/features/privacy-and-logging" target="_blank" rel="noopener noreferrer">OpenRouter's privacy policy</a>.
        </p>
        <p>
          In short, most providers don't log your input, output, and don't use your input to train their models. But it sometimes depends on the provider. If you wish,you can manually select the providers that conform to your privacy standards.
        </p>
      </div>
      
      <div className="back-link">
        <Link to="/">← Back to home</Link>
      </div>
    </div>
  );
};

export default Privacy; 