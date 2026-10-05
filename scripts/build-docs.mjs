import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const outDir = path.join(docsDir, 'dist');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function parseMarkdown(content) {
  // Extract YAML frontmatter
  let title = 'Documentation';
  let description = '';
  let body = content;

  if (content.startsWith('---')) {
    const endIdx = content.indexOf('---', 3);
    if (endIdx !== -1) {
      const frontmatter = content.slice(3, endIdx);
      body = content.slice(endIdx + 3).trim();
      const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n\r]+)/);
      if (titleMatch) title = titleMatch[1].trim();
      const descMatch = frontmatter.match(/description:\s*["']?([^"'\n\r]+)/);
      if (descMatch) description = descMatch[1].trim();
    }
  }

  // Basic HTML converter for markdown
  let html = body
    // Escape HTML special chars
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headings
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Tables
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes('---')) return '';
      const cells = match.split('|').filter(c => c.trim().length > 0);
      return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
    })
    // Unordered lists
    .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
    // Empty lines to paragraph breaks
    .replace(/\n\n+/g, '</p><p>');

  html = '<p>' + html + '</p>';
  html = html.replace(/<p><h/g, '<h').replace(/<\/h(\d)><\/p>/g, '</h$1>');
  html = html.replace(/<p><pre>/g, '<pre>').replace(/<\/pre><\/p>/g, '</pre>');
  html = html.replace(/<p><tr>/g, '<table class="doc-table"><tbody><tr>').replace(/<\/tr><\/p>/g, '</tr></tbody></table>');

  return { title, description, html };
}

function scanDocs(dir, relativePath = '') {
  const items = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    const rel = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      items.push({
        type: 'dir',
        name: entry.name,
        path: rel,
        children: scanDocs(fullPath, rel),
      });
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const { title, description, html } = parseMarkdown(content);
      items.push({
        type: 'file',
        name: entry.name,
        path: rel,
        title,
        description,
        html,
      });
    }
  }
  return items;
}

const docsTree = scanDocs(docsDir);

function getAllFiles(nodes) {
  let files = [];
  for (const n of nodes) {
    if (n.type === 'file') files.push(n);
    if (n.children) files = files.concat(getAllFiles(n.children));
  }
  return files;
}

const allDocFiles = getAllFiles(docsTree);

function buildNavHtml(nodes, currentPath = '') {
  let nav = '<ul class="nav-list">';
  for (const node of nodes) {
    if (node.type === 'dir') {
      const cleanDirName = node.name.replace(/^\d+\./, '').replace(/-/g, ' ');
      nav += `<li class="nav-group"><span class="nav-group-title">${cleanDirName.toUpperCase()}</span>`;
      if (node.children) nav += buildNavHtml(node.children, currentPath);
      nav += '</li>';
    } else if (node.type === 'file') {
      const outRel = node.path.replace(/\.md$/, '.html');
      const isActive = currentPath === outRel ? 'class="active"' : '';
      nav += `<li><a href="${outRel}" ${isActive}>${node.title || node.name}</a></li>`;
    }
  }
  nav += '</ul>';
  return nav;
}

const template = (title, description, contentHtml, currentPath) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | TaskView Enterprise Docs</title>
  <meta name="description" content="${description}">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f293d;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --accent: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
      line-height: 1.6;
    }
    aside {
      width: 300px;
      background: #0b1120;
      border-right: 1px solid var(--border);
      padding: 1.5rem;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .brand {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      font-size: 0.7rem;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid var(--primary);
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      color: var(--primary);
    }
    .nav-list { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; }
    .nav-group { margin-top: 1rem; }
    .nav-group-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      display: block;
      margin-bottom: 0.5rem;
    }
    .nav-list a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      display: block;
      padding: 0.35rem 0.5rem;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .nav-list a:hover, .nav-list a.active {
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }
    .nav-list a.active {
      color: var(--primary);
      font-weight: 600;
      border-left: 2px solid var(--primary);
    }
    main {
      flex: 1;
      padding: 2.5rem 3.5rem;
      max-width: 960px;
    }
    h1 { font-size: 2.25rem; margin-bottom: 1rem; color: #fff; }
    h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 0.75rem; color: #f1f5f9; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    h3 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #f8fafc; }
    p { margin-bottom: 1rem; color: var(--text); }
    ul, ol { margin-left: 1.5rem; margin-bottom: 1rem; }
    li { margin-bottom: 0.35rem; }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85em;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      color: #38bdf8;
    }
    pre {
      background: #020617;
      border: 1px solid var(--border);
      padding: 1rem;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 1.25rem;
    }
    pre code { background: transparent; padding: 0; color: #e2e8f0; }
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border: 1px solid var(--border);
      background: var(--card-bg);
      border-radius: 6px;
      overflow: hidden;
    }
    table.doc-table td, table.doc-table th {
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      font-size: 0.9rem;
    }
    table.doc-table tr:first-child td {
      background: rgba(255, 255, 255, 0.04);
      font-weight: 600;
      color: #fff;
    }
    blockquote {
      border-left: 3px solid var(--primary);
      padding: 0.75rem 1rem;
      background: rgba(56, 189, 248, 0.05);
      border-radius: 0 6px 6px 0;
      margin-bottom: 1rem;
      color: #cbd5e1;
    }
  </style>
</head>
<body>
  <aside>
    <div class="brand">
      TaskView <span class="badge">Enterprise</span>
    </div>
    ${buildNavHtml(docsTree, currentPath)}
  </aside>
  <main>
    ${contentHtml}
  </main>
</body>
</html>`;

for (const file of allDocFiles) {
  const outPathRel = file.path.replace(/\.md$/, '.html');
  const fullOut = path.join(outDir, outPathRel);
  const parent = path.dirname(fullOut);
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });

  const finalHtml = template(file.title, file.description, file.html, outPathRel);
  fs.writeFileSync(fullOut, finalHtml, 'utf8');
}

// Generate root index.html
const indexFile = allDocFiles.find(f => f.name === '0.index.md') || allDocFiles[0];
if (indexFile) {
  const finalIndex = template(indexFile.title, indexFile.description, indexFile.html, 'index.html');
  fs.writeFileSync(path.join(outDir, 'index.html'), finalIndex, 'utf8');
}

console.log(`Documentation successfully built! ${allDocFiles.length} pages compiled into docs/dist/`);
