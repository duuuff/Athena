export function htmlToMarkdown(html: string): string {
  return html
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n# ${strip(t)}\n`)
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${strip(t)}\n`)
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${strip(t)}\n`)
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => `\n#### ${strip(t)}\n`)
    // Blockquote
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) =>
      strip(t).split('\n').map(l => `> ${l}`).join('\n') + '\n')
    // Bold + italic combos
    .replace(/<strong>\s*<em>([\s\S]*?)<\/em>\s*<\/strong>/gi, (_, t) => `***${strip(t)}***`)
    .replace(/<em>\s*<strong>([\s\S]*?)<\/strong>\s*<\/em>/gi, (_, t) => `***${strip(t)}***`)
    // Bold / italic
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, t) => `**${strip(t)}**`)
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, t) => `**${strip(t)}**`)
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, t) => `*${strip(t)}*`)
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, t) => `*${strip(t)}*`)
    .replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, (_, t) => strip(t))
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, (_, t) => `~~${strip(t)}~~`)
    // Code block (before inline code)
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, t) =>
      `\n\`\`\`\n${decodeEntities(t)}\n\`\`\`\n`)
    // Inline code
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t) => `\`${strip(t)}\``)
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => `[${strip(text)}](${href})`)
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, src, alt) => `![${alt}](${src})`)
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, (_, src) => `![](${src})`)
    // HR
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    // BR
    .replace(/<br\s*\/?>/gi, '  \n')
    // Subscript / superscript (no standard MD, use HTML)
    .replace(/<sub>([\s\S]*?)<\/sub>/gi, (_, t) => `<sub>${strip(t)}</sub>`)
    .replace(/<sup>([\s\S]*?)<\/sup>/gi, (_, t) => `<sup>${strip(t)}</sup>`)
    // Ordered list items
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, body) => {
      let i = 0;
      return body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_2: string, t: string) => `${++i}. ${strip(t)}\n`) + '\n';
    })
    // Unordered list items
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, body) =>
      body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_2: string, t: string) => `- ${strip(t)}\n`) + '\n')
    // Table
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, convertTable)
    // Paragraphs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${strip(t)}\n`)
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    // Normalize blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}

function decodeEntities(html: string): string {
  return html.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

function convertTable(full: string, body: string): string {
  const rows: string[][] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(body)) !== null) {
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      cells.push(strip(cellMatch[1]));
    }
    if (cells.length) rows.push(cells);
  }
  if (!rows.length) return '';
  const cols = Math.max(...rows.map(r => r.length));
  const pad = (r: string[]) => r.map(c => c || '').concat(Array(cols - r.length).fill(''));
  const header = pad(rows[0]);
  const sep = header.map(() => '---');
  const data = rows.slice(1).map(pad);
  const toRow = (cells: string[]) => `| ${cells.join(' | ')} |`;
  return '\n' + [header, sep, ...data].map(toRow).join('\n') + '\n';
}
