import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  MarkdownBody,
  __test__ALLOWED_ELEMENTS,
  __test__safeUrlTransform,
} from './MarkdownBody';

// HD-9 Chunk 4 — MarkdownBody sanitization + rendering integration tests.
// Asserts the safety guards (urlTransform + allowedElements) AND that
// the supported markdown subset renders correctly.

describe('safeUrlTransform', () => {
  it('passes http/https URLs through unchanged', () => {
    expect(__test__safeUrlTransform('https://example.com/x')).toBe('https://example.com/x');
    expect(__test__safeUrlTransform('http://example.com')).toBe('http://example.com');
  });

  it('passes mailto: URLs through unchanged', () => {
    expect(__test__safeUrlTransform('mailto:hi@example.com')).toBe('mailto:hi@example.com');
  });

  it('passes relative URLs through unchanged (no protocol)', () => {
    expect(__test__safeUrlTransform('/help/foo')).toBe('/help/foo');
    expect(__test__safeUrlTransform('foo/bar')).toBe('foo/bar');
    expect(__test__safeUrlTransform('#anchor')).toBe('#anchor');
  });

  it('rejects javascript: URIs', () => {
    expect(__test__safeUrlTransform('javascript:alert(1)')).toBe('');
    expect(__test__safeUrlTransform('JaVaScRiPt:alert(1)')).toBe('');
    expect(__test__safeUrlTransform('  javascript:alert(1)')).toBe('');
  });

  it('rejects data: URIs (image data URLs included — block to be safe)', () => {
    expect(__test__safeUrlTransform('data:text/html,<script>alert(1)</script>')).toBe('');
    expect(__test__safeUrlTransform('data:image/png;base64,iVBORw0KGgo=')).toBe('');
  });

  it('rejects vbscript: + file: + other unknown protocols', () => {
    expect(__test__safeUrlTransform('vbscript:msgbox')).toBe('');
    expect(__test__safeUrlTransform('file:///etc/passwd')).toBe('');
    expect(__test__safeUrlTransform('weirdproto:foo')).toBe('');
  });
});

describe('MarkdownBody — allowed elements + safe rendering', () => {
  it('renders headings, paragraphs, lists, and code blocks', () => {
    const md = `# Title\n\nLead paragraph with *emphasis* and **bold**.\n\n- one\n- two\n\n\`\`\`js\nconsole.log("ok");\n\`\`\``;
    const { container } = render(<MarkdownBody source={md} />);
    expect(container.querySelector('h1')).toBeTruthy();
    expect(container.querySelector('h1')?.textContent).toBe('Title');
    expect(container.querySelector('em')?.textContent).toBe('emphasis');
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelector('pre code')?.textContent ?? '').toContain('console.log');
  });

  it('renders safe links + drops javascript: hrefs', () => {
    const md = '[Safe](https://example.com) and [XSS](javascript:alert(1))';
    const { container } = render(<MarkdownBody source={md} />);
    const links = container.querySelectorAll('a');
    // Both anchors render, but the javascript: one has its href stripped
    // (urlTransform returned empty string).
    expect(links).toHaveLength(2);
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('https://example.com');
    expect(hrefs).not.toContain('javascript:alert(1)');
    expect(hrefs).not.toContain('JaVaScRiPt:alert(1)');
  });

  it('does NOT execute or inject raw HTML <script> tags', () => {
    const md = `Hello\n\n<script>window.__pwned__ = true;</script>\n\nWorld`;
    const { container } = render(<MarkdownBody source={md} />);
    // No <script> survives
    expect(container.querySelector('script')).toBeNull();
    // Note: `window.__pwned__` cannot be checked reliably across vitest
    // environments. The DOM check is the strict invariant.
  });

  it('drops disallowed elements like <iframe>, <form>, <input>, <button>', () => {
    const md = `Body\n\n<iframe src="https://evil.example.com"></iframe>\n<form><input type="text" /><button>Pwn</button></form>`;
    const { container } = render(<MarkdownBody source={md} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('input')).toBeNull();
    // Note: react-markdown 10's default behavior already strips raw HTML,
    // so these never reach the DOM. The allowedElements list is a
    // belt-and-braces guard if a future contributor adds rehype-raw.
  });

  it('exposes a documented allowed-elements set so future contributors know the contract', () => {
    expect(__test__ALLOWED_ELEMENTS).toContain('h1');
    expect(__test__ALLOWED_ELEMENTS).toContain('p');
    expect(__test__ALLOWED_ELEMENTS).toContain('a');
    expect(__test__ALLOWED_ELEMENTS).toContain('code');
    // None of these dangerous tags should be in the allow list.
    expect(__test__ALLOWED_ELEMENTS).not.toContain('script');
    expect(__test__ALLOWED_ELEMENTS).not.toContain('iframe');
    expect(__test__ALLOWED_ELEMENTS).not.toContain('form');
    expect(__test__ALLOWED_ELEMENTS).not.toContain('input');
    expect(__test__ALLOWED_ELEMENTS).not.toContain('button');
  });
});
