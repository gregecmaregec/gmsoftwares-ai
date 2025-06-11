import { useState, useCallback, memo } from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardCopy, Check } from 'lucide-react';

// Memoized Code Block Component for performance
export const CodeBlock = memo(({ language, value, theme }: { language: string; value: string; theme: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [value]);

  // OLED-optimized theme for ultra-black mode with consistent font sizing and understated colors
  const oledCodeTheme = {
    'code[class*="language-"]': {
      color: '#c0c0c0', // Muted light gray instead of bright text
      background: '#000000',
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace',
      fontSize: '0.8rem',
      textAlign: 'left' as const,
      whiteSpace: 'pre' as const,
      wordSpacing: 'normal',
      wordBreak: 'normal' as const,
      wordWrap: 'normal' as const,
      lineHeight: '1.4',
      tabSize: 4,
      hyphens: 'none' as const,
    },
    'pre[class*="language-"]': {
      color: '#c0c0c0', // Muted light gray
      background: '#000000',
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Courier New", monospace',
      fontSize: '0.8rem',
      textAlign: 'left' as const,
      whiteSpace: 'pre' as const,
      wordSpacing: 'normal',
      wordBreak: 'normal' as const,
      wordWrap: 'normal' as const,
      lineHeight: '1.4',
      tabSize: 4,
      hyphens: 'none' as const,
      padding: '1em',
      margin: '.5em 0',
      overflow: 'auto',
      borderRadius: '8px',
      border: '1px solid #1a1a1a',
    },
    'comment': { color: '#808080' }, // Subtle gray for comments
    'prolog': { color: '#808080' },
    'doctype': { color: '#808080' },
    'cdata': { color: '#808080' },
    'punctuation': { color: '#a0a0a0' }, // Muted punctuation
    'property': { color: '#9bb3d1' }, // Very muted blue
    'tag': { color: '#c8a882' }, // Muted gold/tan
    'constant': { color: '#d4a574' }, // Muted orange
    'symbol': { color: '#d4a574' },
    'deleted': { color: '#cc7a7a' }, // Muted red
    'boolean': { color: '#9bb3d1' }, // Muted blue
    'number': { color: '#d4a574' }, // Muted orange
    'selector': { color: '#b19cd9' }, // Muted purple instead of green
    'attr-name': { color: '#9bb3d1' }, // Muted blue
    'string': { color: '#b19cd9' }, // Muted purple instead of green
    'char': { color: '#b19cd9' }, // Muted purple instead of green
    'builtin': { color: '#9bb3d1' }, // Muted blue
    'inserted': { color: '#b19cd9' }, // Muted purple instead of green
    'operator': { color: '#a0a0a0' }, // Subtle gray
    'entity': { color: '#c8a882' }, // Muted gold
    'url': { color: '#9bb3d1' }, // Muted blue
    'variable': { color: '#c8a882' }, // Muted gold
    'atrule': { color: '#9bb3d1' }, // Muted blue
    'attr-value': { color: '#b19cd9' }, // Muted purple instead of green
    'function': { color: '#9bb3d1' }, // Muted blue
    'class-name': { color: '#c8a882' }, // Muted gold
    'keyword': { color: '#c8a882' }, // Muted gold for keywords
    'regex': { color: '#d4a574' }, // Muted orange
    'important': { color: '#cc7a7a', fontWeight: 'bold' }, // Muted red
  };

  const getThemeStyle = () => {
    if (theme === 'ultra-black') return oledCodeTheme;
    if (theme === 'dark') return atomDark;
    return oneLight;
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={handleCopy} 
        className="copy-code-button"
        aria-label={isCopied ? "Copied!" : "Copy code"}
      >
        {isCopied ? <Check size={14} /> : <ClipboardCopy size={14} />}
      </button>
      <SyntaxHighlighter
        style={getThemeStyle()}
        language={language}
        PreTag="div"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock'; 