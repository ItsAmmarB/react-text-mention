import React from 'react';
import { createPortal } from 'react-dom';
import { MentionFieldOption, MentionEditorColors } from './types';
import { colorsToCssVars } from './colors';

interface MentionMenuProps {
  /** Element id; referenced by the editable's `aria-controls`. */
  id: string;
  fields: MentionFieldOption[];
  selectedIndex: number;
  onSelect: (field: MentionFieldOption) => void;
  onHover: (index: number) => void;
  targetRect: DOMRect | null;
  colors?: MentionEditorColors;
}

const MENU_COLOR_KEYS: (keyof MentionEditorColors)[] = [
  'menuBg',
  'menuBorderColor',
  'menuTextColor',
  'menuHighlightBg',
];

/** Shared with `MentionEditor` so its `aria-activedescendant` points at the right row. */
export const getMenuOptionId = (menuId: string, fieldId: string): string =>
  `${menuId}-option-${fieldId}`;

export const MentionMenu: React.FC<MentionMenuProps> = ({
  id,
  fields,
  selectedIndex,
  onSelect,
  onHover,
  targetRect,
  colors,
}) => {
  if (!targetRect) return null;

  // Rendered into document.body via a portal and positioned with `fixed` using
  // raw viewport coordinates from getBoundingClientRect(). This is what makes
  // the menu land correctly regardless of whether the editor sits inside a
  // scrollable container, a `position: fixed` modal, or a modal nested inside
  // another modal: portaling to <body> means there's no transformed/positioned
  // ancestor between the menu and the viewport to throw off `fixed` coordinates.
  // The caller (MentionEditor) keeps `targetRect` fresh across scroll/resize.
  //
  // `colors` has to be applied here too, not just on `.mention-editor` -- this
  // element is a portal child of `document.body`, a sibling of `.mention-editor`
  // in the real DOM, so it wouldn't inherit color overrides set there.
  return createPortal(
    <div
      id={id}
      role="listbox"
      className="mention-editor__menu z-9999 w-70 max-h-75 overflow-y-auto rounded-md border py-1 shadow-lg border-(--mention-editor-menu-border-color,var(--color-gray-300)) dark:border-(--mention-editor-menu-border-color,var(--color-neutral-700)) bg-(--mention-editor-menu-bg,var(--color-white)) dark:bg-(--mention-editor-menu-bg,var(--color-neutral-800))"
      style={{
        position: 'fixed',
        top: targetRect.bottom + 8,
        left: targetRect.left,
        ...colorsToCssVars(colors, MENU_COLOR_KEYS),
      }}
    >
      {fields.length === 0 ? (
        <div className="mention-editor__menu-item cursor-default px-3 py-2 text-(--mention-editor-menu-text-color,var(--color-gray-900)) dark:text-(--mention-editor-menu-text-color,var(--color-gray-100)) opacity-60">
          No matches
        </div>
      ) : (
        fields.map((field, i) => (
          <div
            key={field.id}
            id={getMenuOptionId(id, field.id)}
            role="option"
            aria-selected={i === selectedIndex}
            className={
              'mention-editor__menu-item cursor-pointer px-3 py-2' +
              ' text-(--mention-editor-menu-text-color,var(--color-gray-900))' +
              ' dark:text-(--mention-editor-menu-text-color,var(--color-gray-100))' +
              (i === selectedIndex
                ? ' bg-(--mention-editor-menu-highlight-bg,var(--color-indigo-50))' +
                  ' dark:bg-(--mention-editor-menu-highlight-bg,var(--color-neutral-700))'
                : '')
            }
            onClick={(e) => {
              e.preventDefault();
              onSelect(field);
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent editor blur
            onMouseEnter={() => onHover(i)}
          >
            {field.label}
          </div>
        ))
      )}
    </div>,
    document.body
  );
};
