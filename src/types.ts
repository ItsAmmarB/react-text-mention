import { BaseEditor, Descendant } from 'slate';
import { ReactEditor } from 'slate-react';
import { HistoryEditor } from 'slate-history';

// The data structure of a mentionable item (User, Role, Channel)
export interface MentionableItem {
  id: string;
  label: string;
  avatarColor?: string; // For styling like Discord
}

// Custom Slate Types
export type CustomText = { text: string; bold?: boolean };
export type MentionElement = {
  type: 'mention';
  item: MentionableItem;
  children: CustomText[];
};
export type ParagraphElement = {
  type: 'paragraph';
  children: (CustomText | MentionElement)[];
};

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor & HistoryEditor;
    Element: ParagraphElement | MentionElement;
    Text: CustomText;
  }
}

export const INITIAL_VALUE: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];
