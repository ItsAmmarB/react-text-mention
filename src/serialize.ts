import { Descendant, Text } from 'slate';
import { MentionElement } from './types';

export const serializeToDiscordMarkup = (nodes: Descendant[]): string => {
  return nodes
    .map((n) => {
      if (Text.isText(n)) {
        return n.text;
      }

      if (!n.children) return '';

      // If it's a mention node, convert to <@id>
      if ((n as MentionElement).type === 'mention') {
        const mention = n as MentionElement;
        return `<@${mention.item.id}>`;
      }

      // Recursively serialize children
      return serializeToDiscordMarkup(n.children);
    })
    .join('');
};
