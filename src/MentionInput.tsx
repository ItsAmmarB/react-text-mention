import React, { useCallback, useMemo, useState } from 'react';
import { createEditor, Descendant, Editor, Transforms, Node, Range } from 'slate';
import { Slate, Editable, ReactEditor } from 'slate-react';
import { MentionableItem, INITIAL_VALUE } from './types';
import { serializeToDiscordMarkup } from './serialize';
import { MentionMenu } from './MentionMenu';

interface MentionInputProps {
  items: MentionableItem[]; // The list of users/roles to search through
  placeholder?: string;
  onValueChange?: (text: string, slateValue: Node[]) => void;
}

export const MentionInput: React.FC<MentionInputProps> = ({
  items,
  placeholder = 'Message...',
  onValueChange,
}) => {
  const editor = useMemo(() => withMentions(createEditor()), []);
  const [value, setValue] = useState<Descendant[]>(INITIAL_VALUE);
  const [target, setTarget] = useState<Range | null>(null);
  const [index, setIndex] = useState(0);
  const [search, setSearch] = useState('');

  // Filter items based on the search query
  const filteredItems = useMemo(() => {
    if (!search) return items.slice(0, 10); // Show top 10 if no search
    return items
      .filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 10);
  }, [items, search]);

  // Calculate the DOM position for the popup menu
  const menuTargetRect = useMemo(() => {
    if (!target) return null;
    try {
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      return rect;
    } catch {
      return null;
    }
  }, [target, editor]);

  // --- CORE LOGIC: Trigger Detection ---
  const handleChange = useCallback(
    (newValue: Node[]) => {
      setValue(newValue as Descendant[]);

      // Call external onValueChange if provided
      if (onValueChange) {
        onValueChange(serializeToDiscordMarkup(newValue as Descendant[]), newValue);
      }

      if (target) {
        // If we already have a target, update the search query
        const textBefore = Editor.string(editor, {
          anchor: target.anchor,
          focus: editor.selection?.focus || target.anchor,
        });
        setSearch(textBefore.slice(1)); // slice(1) removes the '@'
      } else {
        // Check if user just typed an '@'
        const { selection } = editor;
        if (selection && Range.isCollapsed(selection)) {
          const [start] = Range.edges(selection);
          const wordBefore = Editor.before(editor, start, { unit: 'word' });
          const before = wordBefore && Editor.before(editor, wordBefore);
          const beforeRange = before && Editor.range(editor, before, start);
          const beforeText = beforeRange && Editor.string(editor, beforeRange);

          // Regex: Space or start of line, followed by @
          const beforeMatch = beforeText && beforeText.match(/^(\s)?@$/);

          if (beforeMatch) {
            const startOfMention = Editor.before(editor, start, { unit: 'word' }) || start;
            setTarget({
              anchor: startOfMention,
              focus: start,
            });
            setSearch('');
            setIndex(0);
          }
        }
      }
    },
    [editor, target, onValueChange]
  );

  // --- CORE LOGIC: Insertion ---
  const selectItem = useCallback(
    (selectedItem: MentionableItem) => {
      if (target) {
        Transforms.select(editor, target);
        Transforms.delete(editor);
        Transforms.insertNodes(
          editor,
          {
            type: 'mention',
            item: selectedItem,
            children: [{ text: '' }],
          },
          { select: true }
        );
        // Move cursor after the inserted void mention so the user can keep typing
        Transforms.move(editor, { distance: 1, unit: 'offset' });
        setTarget(null);
      }
    },
    [editor, target]
  );

  // --- KEYBOARD NAVIGATION ---
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (target) {
        switch (event.key) {
          case 'ArrowDown': {
            event.preventDefault();
            const nextIndex = index >= filteredItems.length - 1 ? 0 : index + 1;
            setIndex(nextIndex);
            break;
          }
          case 'ArrowUp': {
            event.preventDefault();
            const prevIndex = index <= 0 ? filteredItems.length - 1 : index - 1;
            setIndex(prevIndex);
            break;
          }
          case 'Tab':
          case 'Enter':
            event.preventDefault();
            selectItem(filteredItems[index]);
            break;
          case 'Escape':
            event.preventDefault();
            setTarget(null);
            break;
        }
      }
    },
    [target, index, filteredItems, selectItem]
  );

  return (
    <Slate editor={editor} value={value} onChange={handleChange}>
      <div style={{ position: 'relative' }}>
        <Editable
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            padding: '12px',
            minHeight: '44px',
            background: '#40444b', // Discord input bg
            borderRadius: '8px',
            color: '#dcddde',
            fontSize: '16px',
            outline: 'none',
            border: 'none',
          }}
          renderElement={(props) => <Element {...props} />}
        />
        {target && (
          <MentionMenu
            items={filteredItems}
            selectedIndex={index}
            onSelect={selectItem}
            onHover={setIndex}
            targetRect={menuTargetRect}
          />
        )}
      </div>
    </Slate>
  );
};

// --- SLATE PLUGIN & RENDERERS ---

// Extends the editor to handle specific mention behaviors (like deleting the whole node on backspace)
const withMentions = (editor: Editor) => {
  const { isInline, isVoid, deleteBackward } = editor;

  editor.isInline = (element) => {
    return element.type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === 'mention' ? true : isVoid(element);
  };

  // Custom delete behavior: if you backspace a mention, delete the whole thing
  editor.deleteBackward = (...args) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const before = Editor.before(editor, selection.anchor);
      if (before) {
        const [match] = Array.from(
          Editor.nodes(editor, {
            at: before,
            match: (n) => (n as { type?: string }).type === 'mention',
          })
        );
        if (match) {
          Transforms.delete(editor, { at: match[1] });
          return;
        }
      }
    }
    deleteBackward(...args);
  };

  return editor;
};

// Renders Slate nodes into React components
const Element: React.FC<{
  attributes: React.HTMLAttributes<HTMLElement>;
  children: React.ReactNode;
  element: { type: string; item?: MentionableItem };
}> = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'mention':
      return (
        <span
          {...attributes}
          contentEditable={false} // Prevents typing inside the mention
          style={{
            backgroundColor: '#5865f2',
            color: '#ffffff',
            padding: '2px 4px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '0.9em',
          }}
        >
          @{element.item?.label}
          {children}
        </span>
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};
