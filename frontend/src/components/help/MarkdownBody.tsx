import ReactMarkdown from 'react-markdown';

// HD-9 Chunk 4 — Markdown renderer for Help Center article bodies.
//
// Security model — per the package's own docs, react-markdown is
// "safe by default" because it doesn't use `dangerouslySetInnerHTML`
// and never opts into raw HTML unless `rehype-raw` is added (it isn't
// here). Two extra hardening layers on top:
//
//   1. `urlTransform` — rewrites or rejects URLs whose protocol is
//      anything other than `http:`, `https:`, `mailto:`, or relative.
//      This blocks `javascript:`, `data:`, and `vbscript:` URI XSS.
//   2. `allowedElements` — a strict whitelist of Markdown element
//      names. Anything outside this set (raw `<script>`, `<iframe>`,
//      `<form>`, `<input>`, `<button>`, etc.) is dropped silently.
//
// These layers are belt-and-braces: react-markdown 10.x already
// blocks raw HTML, but the explicit guards survive misconfigurations
// (e.g., a future contributor enabling `rehype-raw`).

const ALLOWED_ELEMENTS = [
  // Block-level
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'ul',
  'ol',
  'li',
  'pre',
  'code',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  // Inline
  'a',
  'em',
  'strong',
  'del',
  'br',
  'img',
];

function safeUrlTransform(url: string): string {
  // Allow:  http:// https:// mailto: and relative URLs (anything that
  // doesn't contain an explicit protocol-with-colon at the start).
  // Reject:  javascript:, data:, vbscript:, file:, and any other proto
  // we haven't explicitly green-lit.
  const trimmed = url.trim();
  // Match `protocol:` at the start (letters/digits/+/-/.) before any '/'
  // or other char. RFC 3986 §3.1 scheme syntax.
  const protoMatch = /^([a-z][a-z0-9+\-.]*):/i.exec(trimmed);
  if (!protoMatch) return trimmed; // no protocol = relative URL, allow.
  const proto = protoMatch[1].toLowerCase();
  if (proto === 'http' || proto === 'https' || proto === 'mailto') {
    return trimmed;
  }
  // Anything else — javascript:, data:, vbscript:, file:, etc.
  return '';
}

interface MarkdownBodyProps {
  source: string;
  className?: string;
}

export function MarkdownBody({ source, className }: MarkdownBodyProps): JSX.Element {
  return (
    <div
      className={['help-markdown-body', className].filter(Boolean).join(' ')}
      style={{
        // Inherit project tokens; concrete element styling lives in CSS.
        color: 'var(--color-text)',
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <ReactMarkdown allowedElements={ALLOWED_ELEMENTS} urlTransform={safeUrlTransform}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

// Exported for the XSS sanitization integration test so we can verify
// the URL transform in isolation without booting react-markdown.
export const __test__safeUrlTransform = safeUrlTransform;
export const __test__ALLOWED_ELEMENTS = ALLOWED_ELEMENTS;
