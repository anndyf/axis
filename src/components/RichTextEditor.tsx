"use client"
 
import React, { useRef } from 'react'
import { Bold, List, Link as LinkIcon, Italic } from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export default function RichTextEditor({ value, onChange, placeholder, required, className }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertFormat = (startTag: string, endTag: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end)
    
    // If nothing selected, just insert the tags with cursor in between
    // If selected, wrap selection
    const replacement = `${startTag}${selectedText}${endTag}`
    
    const newValue = text.substring(0, start) + replacement + text.substring(end)
    onChange(newValue)

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + startTag.length, end + startTag.length)
    }, 0)
  }

  const insertList = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const text = textarea.value
    
    // Find limits of current line
    let lineStart = text.lastIndexOf('\n', start - 1) + 1
    
    // Insert dash at start of line
    const newValue = text.substring(0, lineStart) + "- " + text.substring(lineStart)
    onChange(newValue)
    
    setTimeout(() => {
      textarea.focus()
      // Move cursor after the inserted dash
      textarea.setSelectionRange(start + 2, start + 2)
    }, 0)
  }

  const insertLink = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selectedText = text.substring(start, end) || "link"
    
    const url = prompt("Digite a URL do link:", "https://")
    if (!url) return

    const replacement = `[${selectedText}](${url})`
    const newValue = text.substring(0, start) + replacement + text.substring(end)
    onChange(newValue)

    setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + replacement.length, start + replacement.length)
    }, 0)
  }

  return (
    <div className={`flex flex-col border border-line rounded-lg overflow-hidden bg-canvas focus-within:ring-2 focus-within:ring-ring transition-all ${className}`}>
      <div className="flex items-center gap-1 p-2 border-b border-line bg-subtle/50">
        <button
          type="button"
          onClick={() => insertFormat('**', '**')}
          className="p-2 hover:bg-surface rounded-lg text-fg-muted hover:text-accent-fg transition-colors"
          title="Negrito"
        >
          <Bold size={16} strokeWidth={3} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('*', '*')}
          className="p-2 hover:bg-surface rounded-lg text-fg-muted hover:text-accent-fg transition-colors"
          title="Itálico"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-4 bg-zinc-300 mx-1" />
        <button
          type="button"
          onClick={insertList}
          className="p-2 hover:bg-surface rounded-lg text-fg-muted hover:text-accent-fg transition-colors"
          title="Lista"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-surface rounded-lg text-fg-muted hover:text-accent-fg transition-colors"
          title="Link"
        >
          <LinkIcon size={16} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full p-4 bg-transparent border-none outline-none min-h-[150px] resize-y text-fg-muted font-medium placeholder:text-fg-subtle"
      />
    </div>
  )
}
