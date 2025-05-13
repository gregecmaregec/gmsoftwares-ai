import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div className="privacy-container">
      <h1>About gmsoftwares.ai</h1>
      
      <p>
        Welcome to gmsoftwares.ai, a personal hobby project built by a student passionate about AI and natural language processing.
      </p>
      
      <div className="privacy-section">
        <h2>Project Background</h2>
        <p>
          This project was created as a way to explore and learn about modern AI technologies. 
          I'm a student who built this in my spare time as a practical way to understand how
          large language models can be integrated into simple, elegant interfaces.
        </p>
        
        <h2>Technology</h2>
        <p>
          This application uses React for the frontend and connects to various AI models for 
          natural language processing. The minimalist design focuses on the conversation experience
          while providing flexibility to choose between different AI models.
        </p>
        
        <h2>Future Plans</h2>
        <p>
          As a hobby project, I'm continuously improving the application and adding new features.
          Future plans include expanding the available AI models, adding customization options,
          and implementing more advanced conversation capabilities.
        </p>
      </div>
      
      <div className="back-link">
        <Link to="/">← Back to home</Link>
      </div>
    </div>
  );
};

export default About; 