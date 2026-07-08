import { Descendant, Text } from 'slate';
import {
  CustomText,
  MENTION_CLOSE,
  MENTION_OPEN,
  MentionElement,
  MentionFieldOption,
  ParagraphElement,
} from './types';

const isMentionElement = (node: Descendant): node is MentionElement =>
  !Text.isText(node) && (node as { type?: string }).type === 'mention';

const MENTION_TOKEN_REGEX = new RegExp(`${MENTION_OPEN}([^${MENTION_CLOSE}]+)${MENTION_CLOSE}`, 'g');

/**
 * Serializes Slate content to the wire format string, e.g.
 * `"Hello <@a1b2c3d4-...>, pay rent."`.
 *
 * Each top-level paragraph node becomes one line of output, joined by `\n` —
 * `deserialize` treats every `\n` as a paragraph break (not a soft line break
 * within a paragraph), so this is the inverse operation.
 */
export const serialize = (nodes: Descendant[]): string => {
  return nodes.map(serializeParagraph).join('\n');
};

const serializeParagraph = (node: Descendant): string => {
  if (Text.isText(node) || !('children' in node)) return '';
  return (node.children as (CustomText | MentionElement)[]).map(serializeInline).join('');
};

const serializeInline = (node: CustomText | MentionElement): string => {
  if (isMentionElement(node)) {
    return `${MENTION_OPEN}${node.field.id}${MENTION_CLOSE}`;
  }
  return node.text;
};

/** @deprecated use {@link serialize} */
export const serializeToDiscordMarkup = serialize;

/**
 * Counts the *visible* length of the content -- each mention counts as
 * `"@" + label.length`, not the length of its (often much longer, id-based)
 * wire-format token. This is what `maxLength` enforces against, and what
 * `MentionEditor`'s ref exposes via `getPlainTextLength()`: it matches what a
 * user actually sees on screen, rather than penalizing them for a field with
 * a long internal id.
 */
export const getPlainTextLength = (nodes: Descendant[]): number => {
  return nodes.reduce((total: number, node, i) => {
    const paragraphBreak = i > 0 ? 1 : 0; // mirrors the '\n' serialize() joins paragraphs with
    return total + paragraphBreak + paragraphPlainTextLength(node);
  }, 0);
};

const paragraphPlainTextLength = (node: Descendant): number => {
  if (Text.isText(node) || !('children' in node)) return 0;
  return (node.children as (CustomText | MentionElement)[]).reduce(
    (total: number, child) => total + inlinePlainTextLength(child),
    0
  );
};

const inlinePlainTextLength = (node: CustomText | MentionElement): number => {
  if (isMentionElement(node)) return 1 + node.field.label.length; // "@" + label
  return node.text.length;
};

/**
 * Parses a wire format string back into a Slate `Descendant[]` value, resolving
 * each `<@id>` token against `fields` to recover its display label. Tokens whose
 * id isn't found in `fields` still render (falling back to the raw id as the
 * label) rather than being dropped, so content never silently loses a mention.
 *
 * Inverse of `serialize`: every `\n` in `value` starts a new paragraph node.
 */
export const deserialize = (value: string, fields: MentionFieldOption[] = []): Descendant[] => {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));

  return value.split('\n').map((line): ParagraphElement => {
    return { type: 'paragraph', children: deserializeLine(line, fieldsById) };
  });
};

const deserializeLine = (
  line: string,
  fieldsById: Map<string, MentionFieldOption>
): (CustomText | MentionElement)[] => {
  // Slate requires every inline (void) element to be surrounded by text nodes,
  // including at the start/end of the block and between two adjacent mentions.
  // So every push below is unconditional, even when the slice is ''.
  const children: (CustomText | MentionElement)[] = [];
  let lastIndex = 0;
  MENTION_TOKEN_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = MENTION_TOKEN_REGEX.exec(line))) {
    children.push({ text: line.slice(lastIndex, match.index) });
    const id = match[1];
    const field = fieldsById.get(id) ?? { id, label: id };
    children.push({ type: 'mention', field, children: [{ text: '' }] });
    lastIndex = match.index + match[0].length;
  }

  children.push({ text: line.slice(lastIndex) });

  return children;
};
