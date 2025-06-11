import React, { Suspense, lazy } from 'react';

// Lazy load ReactMarkdown to reduce initial bundle size
const ReactMarkdown = lazy(() => import('react-markdown'));

interface LazyMarkdownProps {
  children: string;
  remarkPlugins?: any[];
  components?: any;
}

// Simple loading fallback for markdown
const MarkdownSkeleton = () => (
  <div style={{ 
    backgroundColor: 'var(--secondary-bg)', 
    borderRadius: '4px', 
    padding: '8px', 
    opacity: 0.6,
    minHeight: '1.5em'
  }}>
    one moment...
  </div>
);

export const LazyMarkdown: React.FC<LazyMarkdownProps> = ({ children, remarkPlugins, components }) => {
  return (
    <Suspense fallback={<MarkdownSkeleton />}>
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {children}
      </ReactMarkdown>
    </Suspense>
  );
}; 