/**
 * Converts Markdown text to HTML for import into TipTap editor.
 * Handles headings, bold, italic, code blocks, inline code,
 * blockquotes, ordered/unordered lists, horizontal rules, and links.
 */
export function markdownToHtml(md: string): string {
  let html = md;

  // Normalize line endings
  html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Fenced code blocks ```lang\n...\n```
  html = html.replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) => {
    const escaped = escapeHtml(code.trimEnd());
    return `<pre><code>${escaped}</code></pre>`;
  });

  // Split into blocks (separated by blank lines)
  const blocks = html.split(/\n{2,}/);
  const processed = blocks.map(block => processBlock(block.trim()));
  return processed.filter(Boolean).join('\n');
}

function processBlock(block: string): string {
  if (!block) return '';

  // Pre-formatted (already wrapped by code block pass above)
  if (block.startsWith('<pre>')) return block;

  // Heading
  const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    return `<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`;
  }

  // Blockquote
  if (block.startsWith('> ') || block.startsWith('>')) {
    const content = block.replace(/^>\s?/gm, '').trim();
    return `<blockquote><p>${inlineMarkdown(content)}</p></blockquote>`;
  }

  // Horizontal rule
  if (/^(-{3,}|\*{3,}|_{3,})$/.test(block)) {
    return '<hr>';
  }

  // Unordered list
  if (/^[*\-+]\s/.test(block)) {
    const items = block.split('\n').map(line => {
      const match = line.match(/^[*\-+]\s+(.*)/);
      return match ? `<li><p>${inlineMarkdown(match[1])}</p></li>` : '';
    }).filter(Boolean);
    return `<ul>${items.join('')}</ul>`;
  }

  // Ordered list
  if (/^\d+\.\s/.test(block)) {
    const items = block.split('\n').map(line => {
      const match = line.match(/^\d+\.\s+(.*)/);
      return match ? `<li><p>${inlineMarkdown(match[1])}</p></li>` : '';
    }).filter(Boolean);
    return `<ol>${items.join('')}</ol>`;
  }

  // Plain paragraph — preserve line breaks within as <br>
  const lines = block.split('\n').map(inlineMarkdown).join('<br>');
  return `<p>${lines}</p>`;
}

function inlineMarkdown(text: string): string {
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.+?)_/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
