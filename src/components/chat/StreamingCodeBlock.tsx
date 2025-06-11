import React, { memo } from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Lightweight code component for streaming - with real-time syntax highlighting
export const StreamingCodeBlock = memo(({ children, language, theme }: { 
  children: React.ReactNode; 
  language: string;
  theme: string;
}) => {
  // Get the same theme as the full CodeBlock but optimized for streaming
  const getStreamingTheme = () => {
    if (theme === 'ultra-black') {
      // Simplified version of oledCodeTheme for better streaming performance
      return {
        'code[class*="language-"]': {
          color: '#c0c0c0',
          background: '#000000',
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace',
          fontSize: '0.8rem',
          lineHeight: '1.4',
        },
        'pre[class*="language-"]': {
          color: '#c0c0c0',
          background: '#000000',
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace',
          fontSize: '0.8rem',
          lineHeight: '1.4',
          padding: '1em',
          margin: '.5em 0',
          overflow: 'auto',
          borderRadius: '8px',
          border: '1px solid #1a1a1a',
        },
        'comment': { color: '#808080' },
        'string': { color: '#b19cd9' }, // Muted purple instead of green
        'keyword': { color: '#c8a882' },
        'function': { color: '#9bb3d1' },
        'number': { color: '#d4a574' },
      };
    }
    if (theme === 'dark') return atomDark;
    return oneLight;
  };

  return (
    <SyntaxHighlighter
      style={getStreamingTheme()}
      language={language}
      PreTag="div"
      showLineNumbers={false} // Disable line numbers for better streaming performance
      wrapLines={false} // Disable line wrapping for better performance
    >
      {String(children)}
    </SyntaxHighlighter>
  );
});

StreamingCodeBlock.displayName = 'StreamingCodeBlock'; 