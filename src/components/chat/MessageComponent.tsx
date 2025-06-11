import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message, CustomCodeProps } from '../../types/message';
import { getModelDisplayName } from '../../config/models';
import { CodeBlock } from './CodeBlock';
import { StreamingCodeBlock } from './StreamingCodeBlock';

// Fast plain text component for streaming messages
const PlainTextMessage = memo(({ content }: { content: string }) => (
  <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
    {content}
  </div>
));

PlainTextMessage.displayName = 'PlainTextMessage';

// Optimized Message Component with progressive enhancement
export const MessageComponent = memo(({ message, theme }: { message: Message; theme: string }) => {
  // Create markdown components that adapt based on streaming state
  const markdownComponents = useMemo(() => ({
    code: ({ node, inline, className, children, ...props }: CustomCodeProps) => {
      const match = /language-(\w+)/.exec(className || '');
      const { style: _style, dangerouslySetInnerHTML, ...restHtmlProps } = props;

      if (!inline && match) {
        const codeString = String(children).replace(/\n$/, '');
        
        // Use lightweight component during streaming, full syntax highlighter when done
        if (message.isStreaming) {
          return (
            <StreamingCodeBlock language={match[1]} theme={theme}>
              {codeString}
            </StreamingCodeBlock>
          );
        } else {
          return (
            <CodeBlock 
              language={match[1]} 
              value={codeString} 
              theme={theme}
            />
          );
        }
      } else {
        return (
          <code className={className} {...restHtmlProps}>
            {children}
          </code>
        );
      }
    },
    // Custom heading components with special spacing rules
    h1: ({ children, ...props }) => {
      const isAtBeginning = message.content.trim().startsWith('#');
      return (
        <h1 {...props} style={{ marginTop: isAtBeginning ? '0.5rem' : '2rem' }}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const isAtBeginning = message.content.trim().startsWith('##') && !message.content.trim().startsWith('###');
      return (
        <h2 {...props} style={{ marginTop: isAtBeginning ? '0.5rem' : '2rem' }}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const isAtBeginning = message.content.trim().startsWith('###') && !message.content.trim().startsWith('####');
      return (
        <h3 {...props} style={{ marginTop: isAtBeginning ? '0.5rem' : '2rem' }}>
          {children}
        </h3>
      );
    },
    h4: ({ children, ...props }) => {
      const isAtBeginning = message.content.trim().startsWith('####') && !message.content.trim().startsWith('#####');
      return (
        <h4 {...props} style={{ marginTop: isAtBeginning ? '0.5rem' : '2rem' }}>
          {children}
        </h4>
      );
    },
    h5: ({ children, ...props }) => {
      const isAtBeginning = message.content.trim().startsWith('#####') && !message.content.trim().startsWith('######');
      return (
        <h5 {...props} style={{ marginTop: isAtBeginning ? '0.5rem' : '2rem' }}>
          {children}
        </h5>
      );
    },
    h6: ({ children, ...props }) => {
      const isAtBeginning = message.content.trim().startsWith('######');
      return (
        <h6 {...props} style={{ marginTop: isAtBeginning ? '0.5rem' : '2rem' }}>
          {children}
        </h6>
      );
    }
  } as Components), [theme, message.isStreaming, message.content]);

  return (
    <div className={`message-entry ${message.sender}`}>
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
              components={markdownComponents}
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
  );
});

MessageComponent.displayName = 'MessageComponent'; 