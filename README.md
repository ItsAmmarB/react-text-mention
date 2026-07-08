# @itsammarb/mention-editor

A Discord-style `@mention` rich-text editor built on [Slate.js](https://www.slatejs.org/). Mentions are atomic (void + inline) nodes: backspacing next to one deletes it whole, and the suggestion menu tracks the real caret position via `ReactEditor.toDOMRange`.

## Install

```sh
npm install @itsammarb/mention-editor slate slate-react slate-history
```

Peer dependencies: React 18 or 19, `slate` and `slate-react` `^0.94.0`. No Tailwind setup required on your end — see [Styling](#styling).

## Usage

```tsx
import { MentionEditor } from '@itsammarb/mention-editor';
import '@itsammarb/mention-editor/styles.css';

const fields = [
  { id: 'a1b2c3d4-0000-0000-0000-000000000001', label: 'Landlord Name' },
  { id: 'a1b2c3d4-0000-0000-0000-000000000002', label: 'Monthly Rent' },
];

function ClauseEditor() {
  const [value, setValue] = useState('Hello <@a1b2c3d4-0000-0000-0000-000000000001>, welcome.');

  return (
    <MentionEditor
      value={value}
      fields={fields}
      onChange={setValue}
      placeholder="Type @ to reference a field..."
      dir="rtl" // or "ltr"; omit to let the browser infer it
      rows={4}
    />
  );
}
```

## Wire format

`value` / `onChange` use a plain string, not a Slate document: mentions are written as the field's `id` wrapped in `<@` and `>`, e.g.:

```
Hello <@a1b2c3d4-0000-0000-0000-000000000001>, welcome.
```

`serialize`/`deserialize` (also exported) convert between this string and Slate's internal `Descendant[]` tree. `\n` in the string is a paragraph break. The closing `>` means any id shape works out of the box — no separate id-format configuration needed.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | *(required)* | Wire-format content (controlled — the editor always reflects this string). |
| `fields` | `{ id: string; label: string }[]` | *(required)* | Fields offered in the `@` suggestion menu; filter/localize before passing in — the component doesn't fetch or translate these itself. |
| `onChange` | `(value: string) => void` | `undefined` | Called with the new wire-format string on every edit. Omit for a read-only display (combine with `disabled`). |
| `onFocus` / `onBlur` | `(event: React.FocusEvent) => void` | `undefined` | Fired when the editable surface gains/loses focus — e.g. to trigger validation-on-blur in a form library. |
| `onKeyDown` | `(event: React.KeyboardEvent) => void` | `undefined` | Called after the suggestion menu's own key handling (arrows/Tab/Enter/Escape) — e.g. to add a Cmd+Enter-to-submit shortcut. Check `event.defaultPrevented` if you need to know whether the menu already acted on the key. |
| `dir` | `'ltr' \| 'rtl'` | `undefined` (browser infers) | Applied directly as the `dir` HTML attribute on the editable surface — required for correct caret movement and bidi layout with RTL content such as Arabic. |
| `disabled` | `boolean` | `false` | Makes the editor read-only (`Editable`'s `readOnly`) and dims it via `opacity-60`. |
| `isError` | `boolean` | `false` | Swaps the border to the invalid-state color (`border-red-500`). Purely visual — doesn't block typing. |
| `placeholder` | `string` | `undefined` (no placeholder) | Shown only when the document is fully empty (a single empty paragraph) — see [Behavior notes](#behavior-notes). |
| `rows` | `number` | `undefined` (intrinsic `min-h-11`, ~44px) | Sets `min-height` to `rows * 1.5em`, textarea-`rows`-equivalent. The editor still grows taller than this if content wraps to more lines. |
| `maxLength` | `number` | `undefined` (no limit) | Caps the *visible* length — see [Length limits](#length-limits). |
| `className` | `string` | `undefined` | Extra class name(s) appended to the root container, after the built-in ones — use this for layout (width, margin) or to override the built-in border/background. |
| `colors` | `MentionEditorColors` | `undefined` (built-in defaults) | Per-instance color overrides — see [Theme colors](#theme-colors). Omitted keys keep their default. |

`MentionEditor` also forwards a `ref` — see [Imperative handle](#imperative-handle).

## Exported utilities

Everything importable from `@itsammarb/mention-editor`:

| Export | Kind | Description |
| --- | --- | --- |
| `MentionEditor` | component | The editor itself; see [Props](#props). |
| `MentionEditorProps` | type | Prop types for `MentionEditor`. |
| `MentionFieldOption` | type | Shape of an entry in `fields`: `{ id: string; label: string }`. |
| `MentionEditorColors` | type | Shape of the `colors` prop — see [Theme colors](#theme-colors). |
| `MentionEditorHandle` | type | Shape of the imperative handle exposed via `ref` — see [Imperative handle](#imperative-handle). |
| `getPlainTextLength(nodes: Descendant[]): number` | function | The same visible-length count `maxLength` enforces and the ref's `getPlainTextLength()` returns — each mention counts as `"@" + label.length`, not its wire-format id. |
| `serialize(nodes: Descendant[]): string` | function | Converts a Slate `Descendant[]` tree to the wire-format string. Useful if you need to inspect/generate content outside the component (e.g. server-side). |
| `deserialize(value: string, fields?: MentionFieldOption[]): Descendant[]` | function | Inverse of `serialize`. `fields` resolves each mention's label; an id not found in `fields` still renders, falling back to the raw id as its label. |
| `serializeToDiscordMarkup` | function | Deprecated alias of `serialize`, kept for backwards compatibility with the pre-rename API. Prefer `serialize`. |
| `INITIAL_VALUE` | constant | The empty-document Slate value (`[{ type: 'paragraph', children: [{ text: '' }] }]`) `MentionEditor` uses internally when `value` is `''`. Useful if you're building your own Slate tooling around this package's types. |
| `MENTION_OPEN` / `MENTION_CLOSE` | constants | The literal delimiters (`'<@'` / `'>'`) used by the wire format — not configurable, but exported so you can detect/strip mention tokens from raw wire strings yourself without duplicating the regex. |

## Styling

The default look is authored with Tailwind utility classes internally, but compiled at *this package's* build time into a self-contained `dist/styles.css` — import it once (as shown above) and it works with zero Tailwind setup on your end, whether or not your app uses Tailwind at all. The compiled CSS deliberately excludes Tailwind's Preflight (base element reset), so it can't leak out and restyle your app's own `<h1>`, `<button>`, etc.

Every rendered part carries a stable class name, at normal specificity (plain single-class selectors, so a later rule you write always wins):

| Class | Element | Notes |
| --- | --- | --- |
| `.mention-editor` | root `<div>` | Border, rounding, background; gets `className` appended and `opacity-60` when `disabled`. |
| `.mention-editor__editable` | the `Editable` surface | Padding, text size/color, `min-height`. |
| `.mention-editor__paragraph` | each `<p>` block | Margin between paragraphs. |
| `.mention-editor__mention` | a mention `<span>` | Color, underline, `unicode-bidi: isolate` (see [Behavior notes](#behavior-notes)). |
| `.mention-editor__menu` | suggestion menu `<div>` | Portaled to `document.body`; border, shadow, sizing. |
| `.mention-editor__menu-item` | each menu row `<div>` | Also gets a highlight class when it's the keyboard-selected row. |

Override any of these by targeting the class directly in your own CSS, or via `className` on the root for layout/border/background changes.

### Theme colors

Pass a `colors` prop to override any of the built-in colors, per instance — no external CSS needed:

```tsx
<MentionEditor
  value={value}
  fields={fields}
  onChange={setValue}
  colors={{
    mentionColor: '#16a34a', // green mention text/underline
    mentionBg: '#dcfce7', // optional pill-style highlight behind a mention
    borderColor: '#db2777',
    menuHighlightBg: '#fde68a', // selected/hovered suggestion row
  }}
/>
```

Omitted keys keep their built-in default, and different instances on the same page can have entirely different `colors` without affecting each other — including each instance's own suggestion menu, even though the menu renders through a React portal into `document.body` (a sibling of the editor in the real DOM, not a descendant): `MentionEditor` forwards `colors` to it directly rather than relying on CSS inheritance.

| `colors` key | Controls | Light default | Dark default |
| --- | --- | --- | --- |
| `bg` | Editor container background | white | neutral-900 |
| `textColor` | Editor body text color | gray-900 | gray-100 |
| `borderColor` | Container border (normal state) | gray-300 | neutral-700 |
| `borderColorError` | Container border when `isError` | red-500 | red-500 (same in both) |
| `placeholderColor` | Placeholder text color | gray-400 | neutral-500 |
| `mentionColor` | A mention's text/underline color | blue-600 | blue-400 |
| `mentionBg` | Background behind a mention (e.g. a pill highlight) | transparent | transparent |
| `menuBg` | Suggestion menu background | white | neutral-800 |
| `menuBorderColor` | Suggestion menu border | gray-300 | neutral-700 |
| `menuTextColor` | Suggestion menu row text | gray-900 | gray-100 |
| `menuHighlightBg` | Selected/hovered suggestion row background | indigo-50 | neutral-700 |

A `colors` value applies in both light and dark mode (the fallback is what differs by scheme, not your override) — if you want genuinely different colors per scheme, read `window.matchMedia('(prefers-color-scheme: dark)')` (or your app's own dark-mode state) and pass a different `colors` object accordingly.

**Dark mode**: the built-in dark defaults (used when `colors` doesn't set a given key) respond to the OS/browser's `prefers-color-scheme: dark`, *not* a manually-toggled `.dark` class (e.g. from `next-themes` or a similar library). If your app drives dark mode via a class rather than OS preference, either pass `colors` explicitly (bypassing the scheme-based default entirely), or drive it from your own dark-mode state as described above.

**Advanced — global CSS override**: under the hood, `colors` works by setting CSS custom properties (`--mention-editor-*`) inline. You can also set these directly in your own global CSS (`:root { --mention-editor-mention-color: ...; }`) as a page-wide fallback for instances that don't pass `colors` at all — an inline `colors` value always takes precedence over a global CSS one. Global CSS declarations must be scoped to `:root`/`html`/`body` (not `.mention-editor`) for the same portal reason as above.

If your own app happens to use Tailwind and you want to reuse its utility classes against this component's internal DOM (beyond what `className` on the root reaches), you can optionally point your app's Tailwind config/`@source` at `node_modules/@itsammarb/mention-editor/dist` — but this is purely an opt-in extra, not required for the component to work or look right.

## Imperative handle

`MentionEditor` forwards a `ref` exposing:

```tsx
import { useRef } from 'react';
import { MentionEditor, MentionEditorHandle } from '@itsammarb/mention-editor';

const editorRef = useRef<MentionEditorHandle>(null);

<MentionEditor ref={editorRef} value={value} fields={fields} onChange={setValue} />;

editorRef.current?.focus();
editorRef.current?.blur();
editorRef.current?.getPlainTextLength(); // same count maxLength enforces against
```

There's no `value` getter on the handle since the component is fully controlled — read the current content from the `value` you already pass in (or `onChange`'s latest callback argument), not from the ref.

## Length limits

`maxLength` caps the *visible* length: each mention counts as `"@" + label.length`, not its (often much longer, GUID-based) wire-format id — so a 4-character mention label costs 5 toward the limit regardless of how long the underlying field id is. Typing or pasting past the limit is blocked (a paste that doesn't fully fit is truncated to what's left, not rejected outright); picking a mention from the suggestion menu that would push the total over the limit is skipped entirely rather than partially inserted.

Content that's already over `maxLength` — e.g. because it was set that way via the controlled `value` prop, before a `maxLength` was added — is left alone and can still be edited or trimmed back down; only *growing* past the limit is blocked, so you're never left unable to delete your way back under it.

`getPlainTextLength()` (exported standalone, and available on the [imperative handle](#imperative-handle)) returns the same count, e.g. for rendering a "120/280" counter next to the editor.

## Accessibility

The suggestion menu follows the ARIA listbox pattern: the menu has `role="listbox"`, each row has `role="option"` and `aria-selected`, and the editable surface carries `aria-haspopup="listbox"` plus (only while the menu is open) `aria-expanded`, `aria-controls`, and `aria-activedescendant` pointing at the keyboard-highlighted row. A search with zero matches keeps the menu open showing a "No matches" row instead of silently vanishing, so a screen reader user isn't left wondering whether the `@` did anything.

## Behavior notes

Things that are fixed (not currently exposed as props), so you know what to expect rather than hunt for a setting:

- The trigger character is always `@`, and it only fires at the start of a line or after whitespace — typing `user@` mid-word never opens the menu.
- The suggestion menu shows at most the first 10 matches of `fields`, filtered by a case-insensitive substring match against `label`. There's no built-in async/debounced search — `fields` is expected to already be the candidate list.
- Keyboard handling in the menu is fixed: `↑`/`↓` to move, `Tab` or `Enter` to select, `Escape` to dismiss.
- Undo/redo (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`) works out of the box via `slate-history`.
- A mention is atomic: backspacing immediately after one deletes it whole in a single keystroke, never leaving a partial node.
- `placeholder` only renders when the document is *exactly* one empty paragraph — it disappears the moment any character (or a mention) is present, and won't reappear just because the visible text looks empty (e.g. a paragraph containing only a mention still counts as non-empty).
