// Message type definitions
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  model?: string; // Stores actual model from API or 'classifying' or pre-selected model
  reasoning?: string; // To store the thinking/reasoning output
  isStreaming?: boolean; // Track if message is still being streamed
}

// Define props for our custom code component to align with ReactMarkdown
export interface CustomCodeProps {
  node?: any; // AST node, provided by ReactMarkdown
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  // Allow other props that might be passed by ReactMarkdown or remark-gfm
  [key: string]: any; 
} 