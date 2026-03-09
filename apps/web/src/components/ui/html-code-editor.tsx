'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Undo,
  Redo,
  RemoveFormatting,
  Minus,
  Quote,
  Palette,
  FileCode,
  Eye,
} from 'lucide-react';

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-border mx-0.5" />;
}

function EditorToolbar({ editor, onToggleSource, isSourceMode }: {
  editor: ReturnType<typeof useEditor>;
  onToggleSource: () => void;
  isSourceMode: boolean;
}) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const iconSize = 16;
  const colors = [
    '#000000', '#434343', '#666666', '#999999', '#cccccc',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6',
    '#8b5cf6', '#ec4899', '#0ea5e9', '#14b8a6', '#dc2626',
    '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed',
  ];

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
      {/* Source/Visual toggle */}
      <ToolbarButton onClick={onToggleSource} active={isSourceMode} title={isSourceMode ? 'Visual editor' : 'HTML source'}>
        {isSourceMode ? <Eye size={iconSize} /> : <FileCode size={iconSize} />}
      </ToolbarButton>
      <ToolbarDivider />

      {!isSourceMode && (
        <>
          {/* History */}
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
            <Undo size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
            <Redo size={iconSize} />
          </ToolbarButton>
          <ToolbarDivider />

          {/* Text formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
            <Bold size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
            <Italic size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
            <UnderlineIcon size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough size={iconSize} />
          </ToolbarButton>
          <ToolbarDivider />

          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 size={iconSize} />
          </ToolbarButton>
          <ToolbarDivider />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
            <List size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
            <ListOrdered size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
            <Quote size={iconSize} />
          </ToolbarButton>
          <ToolbarDivider />

          {/* Alignment */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">
            <AlignLeft size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center">
            <AlignCenter size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">
            <AlignRight size={iconSize} />
          </ToolbarButton>
          <ToolbarDivider />

          {/* Color picker */}
          <div className="relative" ref={colorRef}>
            <ToolbarButton onClick={() => setShowColorPicker(!showColorPicker)} title="Text color">
              <Palette size={iconSize} />
            </ToolbarButton>
            {showColorPicker && (
              <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-popover border rounded-md shadow-md grid grid-cols-5 gap-1" style={{ width: '140px' }}>
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-5 h-5 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="col-span-5 text-xs text-center mt-1 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorPicker(false);
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
          <ToolbarDivider />

          {/* Insert */}
          <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Insert link">
            <LinkIcon size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title="Insert image">
            <ImageIcon size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
            <Minus size={iconSize} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block">
            <Code size={iconSize} />
          </ToolbarButton>
          <ToolbarDivider />

          {/* Clear formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
            <RemoveFormatting size={iconSize} />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

export function HtmlCodeEditor({
  value,
  onChange,
  placeholder = '<h2>Hello {{firstName}}</h2>...',
  minHeight = '460px',
}: HtmlCodeEditorProps) {
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceValue, setSourceValue] = useState(value);
  const isUpdatingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Image.configure({ inline: true, allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      if (!isUpdatingRef.current) {
        const html = ed.getHTML();
        onChange(html);
      }
    },
    editorProps: {
      attributes: {
        class: 'wysiwyg-editor-content outline-none',
        style: `min-height: ${minHeight}; padding: 12px;`,
      },
    },
  });

  // Sync external value changes into the editor
  useEffect(() => {
    if (editor && !isSourceMode && value !== editor.getHTML()) {
      isUpdatingRef.current = true;
      editor.commands.setContent(value || '', false);
      isUpdatingRef.current = false;
    }
  }, [value, editor, isSourceMode]);

  const toggleSourceMode = useCallback(() => {
    if (isSourceMode) {
      // Switching from source → visual: push source HTML into editor
      if (editor) {
        isUpdatingRef.current = true;
        editor.commands.setContent(sourceValue, false);
        isUpdatingRef.current = false;
        onChange(sourceValue);
      }
    } else {
      // Switching from visual → source: grab current HTML
      setSourceValue(editor ? editor.getHTML() : value);
    }
    setIsSourceMode(!isSourceMode);
  }, [isSourceMode, sourceValue, editor, value, onChange]);

  return (
    <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <EditorToolbar editor={editor} onToggleSource={toggleSourceMode} isSourceMode={isSourceMode} />

      {isSourceMode ? (
        <textarea
          value={sourceValue}
          onChange={(e) => {
            setSourceValue(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full font-mono text-sm p-3 bg-background outline-none resize-none"
          style={{ minHeight, maxHeight: '55vh', overflow: 'auto' }}
          spellCheck={false}
          placeholder={placeholder}
        />
      ) : (
        <div style={{ minHeight, maxHeight: '55vh', overflow: 'auto' }}>
          <EditorContent editor={editor} />
        </div>
      )}

      {/* TipTap editor styles */}
      <style>{`
        .wysiwyg-editor-content {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: inherit;
        }
        .wysiwyg-editor-content > * + * { margin-top: 0.5em; }
        .wysiwyg-editor-content h1 { font-size: 1.75em; font-weight: 700; line-height: 1.3; margin-top: 0.8em; }
        .wysiwyg-editor-content h2 { font-size: 1.4em; font-weight: 600; line-height: 1.3; margin-top: 0.7em; }
        .wysiwyg-editor-content h3 { font-size: 1.15em; font-weight: 600; line-height: 1.4; margin-top: 0.6em; }
        .wysiwyg-editor-content p { margin: 0.4em 0; }
        .wysiwyg-editor-content ul { list-style: disc; padding-left: 1.5em; }
        .wysiwyg-editor-content ol { list-style: decimal; padding-left: 1.5em; }
        .wysiwyg-editor-content li { margin: 0.15em 0; }
        .wysiwyg-editor-content blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 1em;
          margin-left: 0;
          color: hsl(var(--muted-foreground));
          font-style: italic;
        }
        .wysiwyg-editor-content a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .wysiwyg-editor-content img { max-width: 100%; height: auto; border-radius: 4px; }
        .wysiwyg-editor-content hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1em 0; }
        .wysiwyg-editor-content pre {
          background: hsl(var(--muted));
          padding: 0.75em 1em;
          border-radius: 6px;
          font-family: ui-monospace, monospace;
          font-size: 0.875em;
          overflow-x: auto;
        }
        .wysiwyg-editor-content code {
          background: hsl(var(--muted));
          padding: 0.15em 0.3em;
          border-radius: 3px;
          font-family: ui-monospace, monospace;
          font-size: 0.875em;
        }
        .wysiwyg-editor-content pre code { background: none; padding: 0; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
