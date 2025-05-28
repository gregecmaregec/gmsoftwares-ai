import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div className="privacy-container">
      <h1>About ai.gmsoftwares.com</h1>
      
      <p>
        Welcome.
      </p>
      
      <div className="privacy-section">
        <h2>Project Background</h2> 
        <p>
          The idea is to create a "one for all" AI that acts as a portal to the best AI in the world. Ask your question to AI - and the AI will decide which AI to use. You, as the human, serve as the "source of Will" for the AI. It's my wish for how the future of AI will look.
        </p>
        
        <h2>Technology</h2>
        <p>
          I built the API in Go, and the frontend in React / Vite. The API talks to a local AI on a 3070ti I have spinning on a server I set up in my student dorm room, which talks to the internet through a Cloudflared tunnel. The local AI then classifies the prompt and chooses the best AI. Furthemore, you can manually select which AI you want to answer your question.  AI response is a wrapper built around OpenRouter. In the future, for some models probably I will use the respective model's API directly.
        </p>
        
        <h2>Future Plans</h2>
        <p>
          G.M.Softwares is a company that I reserve the rights to start in the future. Starting a company in Germany is expensive stuff and I'm currently still working as a student so my salary + scholarship reflects my spending ability. For now, the copyright is reserved to me personally - © 2025 Gregor Mihelac. Find more about me and how to contact me at <a href="https://gregormihelac.com" target="_blank" rel="noopener noreferrer">gregormihelac.com</a>.
        </p>
      </div>
      
      <div className="back-link">
        <Link to="/">← Back to home</Link>
      </div>  
    </div>
  );
};

export default About; 