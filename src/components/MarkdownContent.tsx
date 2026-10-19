
import React from 'react';

function MarkdownContent({ content }: { content: string }) {
  if (!content) return null;

  // Simple parser function
  // Handles: **bold**, *italic*, [link](url), and newlines
  const parseMarkdown = (text: string) => {
    // 1. Split by newlines (preserve them)
    // 2. Map and parse inline elements
    
    // Safety: escape HTML first? React handles escaping by default for strings,
    // but here we are constructing elements. We need to be careful.
    // Instead of full parser, we can use regex replacement with React elements.
    
    // Let's process line by line
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
        // Handle lists
        if (line.trim().startsWith('- ')) {
            return (
                <li key={lineIndex} className="ml-4 list-disc text-fg-muted font-medium">
                    {parseInline(line.trim().substring(2))}
                </li>
            );
        }
        
        return (
            <p key={lineIndex} className="mb-2 last:mb-0">
                {parseInline(line)}
            </p>
        );
    });
  };

  const parseInline = (text: string) => {
    // This is a naive regex parser. It won't handle nested tags perfectly, 
    // but good enough for simple bold/italic/link.
    
    // Split by tokens
    // Tokens: **...**, *...*, [
    
    // We will use a recursive approach or just simple replacements?
    // Let's use split with capturing groups to keep separators
    
    // Regex for bold: /(\*\*.*?\*\*)/g
    // Regex for italic: /(\*.*?\*)/g
    // Regex for link: /(\[.*?\]\(.*?\))/g
    
    // Combine them?
    // Priority: Link > Bold > Italic
    
    const parts = text.split(/(\*\*.*?\*\*)|(\*.*?\*)|(\[.*?\]\(.*?\))/g).filter(Boolean);
    
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="italic text-fg-muted">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
            const match = part.match(/\[(.*?)\]\((.*?)\)/);
            if (match) {
                return (
                    <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-accent-fg hover:underline font-semibold">
                        {match[1]}
                    </a>
                );
            }
        }
        return part;
    });
  };

  return <div className="markdown-content">{parseMarkdown(content)}</div>;
}

export default MarkdownContent;
