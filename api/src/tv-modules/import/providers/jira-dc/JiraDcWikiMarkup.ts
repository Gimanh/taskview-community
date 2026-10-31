import { ImportMarkdown } from '../../core/ImportMarkdown';
import type { JiraDcCodeBlockArgs } from './jira-dc.types';

const MAX_DEPTH = 10;
const BLOCK_PLACEHOLDER = /^\u0000(\d+)\u0000$/;
const CODE_BLOCK = /\{(code|noformat)(?::([^}]*))?\}([\s\S]*?)\{\1\}/g;
const QUOTE_BLOCK = /\{quote\}([\s\S]*?)\{quote\}/g;
const PANEL_BLOCK = /\{panel(?::([^}]*))?\}([\s\S]*?)\{panel\}/g;
const INLINE =
    /\\\\|\\([^\s\\])|\{\{([\s\S]+?)\}\}|\[([^\]\n]+)\]|\{color(?::[^}]*)?\}|!([^!\s][^!\n]*?)!|(?<![\p{L}\p{N}\\])(\?\?|[*_+\-^~])(?=\S)(.+?)(?<=\S)\5(?![\p{L}\p{N}])/gu;

// Converts Jira wiki markup (descriptions and comments in Data Center REST API v2) to markdown
export class JiraDcWikiMarkup {
    static toMarkdown(text: string | null | undefined): string | null {
        if (typeof text !== 'string') return null;
        const result = JiraDcWikiMarkup.convert(text, 0).trim();
        return result || null;
    }

    private static convert(source: string, depth: number): string {
        const blocks: string[] = [];
        const hold = (block: string) => `\n\u0000${blocks.push(block) - 1}\u0000\n`;

        let text = source.replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
        text = text.replace(CODE_BLOCK, (_, _kind: string, params: string | undefined, code: string) =>
            hold(JiraDcWikiMarkup.codeBlock({ params, code })),
        );
        if (depth < MAX_DEPTH) {
            text = text.replace(QUOTE_BLOCK, (_, inner: string) => hold(JiraDcWikiMarkup.quote(JiraDcWikiMarkup.convert(inner, depth + 1))));
            text = text.replace(PANEL_BLOCK, (_, params: string | undefined, inner: string) => {
                const title = JiraDcWikiMarkup.param(params, 'title');
                const body = JiraDcWikiMarkup.convert(inner, depth + 1);
                return hold([title ? `**${JiraDcWikiMarkup.inline(title, 0)}**` : '', body].filter(Boolean).join('\n\n'));
            });
        }

        const output: string[] = [];
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; ) {
            const line = lines[i];
            const trimmed = line.trim();
            const placeholder = trimmed.match(BLOCK_PLACEHOLDER);
            if (placeholder) {
                output.push(blocks[Number(placeholder[1])]);
                i++;
            } else if (!trimmed) {
                i++;
            } else if (/^-{4,}$/.test(trimmed)) {
                output.push('---');
                i++;
            } else if (/^h[1-6]\.\s/.test(trimmed)) {
                output.push(`${'#'.repeat(Number(trimmed[1]))} ${JiraDcWikiMarkup.inline(trimmed.slice(3).trim(), 0)}`);
                i++;
            } else if (/^bq\.\s/.test(trimmed)) {
                output.push(`> ${JiraDcWikiMarkup.inline(trimmed.slice(3).trim(), 0)}`);
                i++;
            } else if (JiraDcWikiMarkup.isListLine(trimmed)) {
                const items: string[] = [];
                while (i < lines.length && JiraDcWikiMarkup.isListLine(lines[i].trim())) items.push(JiraDcWikiMarkup.listItem(lines[i++].trim()));
                output.push(items.join('\n'));
            } else if (trimmed.startsWith('|')) {
                const rows: string[] = [];
                while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++].trim());
                output.push(JiraDcWikiMarkup.table(rows));
            } else {
                const paragraph: string[] = [];
                while (i < lines.length && JiraDcWikiMarkup.isParagraphLine(lines[i].trim())) paragraph.push(JiraDcWikiMarkup.inline(lines[i++].trim(), 0));
                output.push(paragraph.join('\\\n'));
            }
        }
        return output.filter((block) => block.trim() !== '').join('\n\n');
    }

    private static isParagraphLine(line: string): boolean {
        return (
            line !== '' &&
            !BLOCK_PLACEHOLDER.test(line) &&
            !/^-{4,}$/.test(line) &&
            !/^(h[1-6]|bq)\.\s/.test(line) &&
            !JiraDcWikiMarkup.isListLine(line) &&
            !line.startsWith('|')
        );
    }

    private static isListLine(line: string): boolean {
        return /^([*#]+|-)\s+\S/.test(line);
    }

    private static listItem(line: string): string {
        const [, markers, content] = line.match(/^([*#]+|-)\s+(.*)$/)!;
        const indent = [...markers.slice(0, -1)].map((marker) => (marker === '#' ? '   ' : '  ')).join('');
        const bullet = markers.endsWith('#') ? '1. ' : '- ';
        return `${indent}${bullet}${JiraDcWikiMarkup.inline(content, 0)}`;
    }

    private static table(rows: string[]): string {
        const parsed = rows.map((row) => JiraDcWikiMarkup.cells(row).map((cell) => JiraDcWikiMarkup.inline(cell.trim(), 0)));
        const width = Math.max(...parsed.map((cells) => cells.length));
        if (width === 0) return '';
        const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
        const [header, ...body] = parsed;
        return [line(header), line(Array.from({ length: width }, () => '---')), ...body.map(line)].join('\n');
    }

    // Splits a table row on | while keeping the pipes inside [link|url] and {{code}} intact
    private static cells(row: string): string[] {
        const cells: string[] = [];
        let current = '';
        let brackets = 0;
        let braces = 0;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '[') brackets++;
            if (char === ']') brackets = Math.max(0, brackets - 1);
            if (row.startsWith('{{', i)) braces++;
            if (row.startsWith('}}', i)) braces = Math.max(0, braces - 1);
            if (char === '|' && brackets === 0 && braces === 0) {
                if (current.trim()) cells.push(current);
                current = '';
                continue;
            }
            current += char;
        }
        if (current.trim()) cells.push(current);
        return cells;
    }

    private static inline(text: string, depth: number): string {
        if (depth > MAX_DEPTH) return JiraDcWikiMarkup.escape(text);
        let result = '';
        let last = 0;
        for (const match of text.matchAll(INLINE)) {
            result += JiraDcWikiMarkup.escape(text.slice(last, match.index));
            result += JiraDcWikiMarkup.inlineToken(match, depth);
            last = match.index! + match[0].length;
        }
        return result + JiraDcWikiMarkup.escape(text.slice(last));
    }

    private static inlineToken(match: RegExpMatchArray, depth: number): string {
        const [whole, escaped, code, link, , marker, inner] = match;
        if (whole === '\\\\') return '\\\n';
        if (escaped !== undefined) return JiraDcWikiMarkup.escape(escaped);
        if (code !== undefined) return JiraDcWikiMarkup.codeSpan(code);
        if (link !== undefined) return JiraDcWikiMarkup.link(link, depth);
        if (marker === undefined) return '';
        const content = JiraDcWikiMarkup.inline(inner, depth + 1);
        if (marker === '*') return `**${content}**`;
        if (marker === '_' || marker === '??') return `*${content}*`;
        if (marker === '-') return `~~${content}~~`;
        return content;
    }

    private static link(content: string, depth: number): string {
        if (content.startsWith('~')) return `@${JiraDcWikiMarkup.escape(content.slice(1))}`;
        if (content.startsWith('^')) return JiraDcWikiMarkup.escape(content.slice(1));
        const parts = content.split('|');
        const url = (parts.length > 1 ? parts[1] : parts[0]).trim();
        const label = parts.length > 1 ? parts[0].trim() : url;
        if (ImportMarkdown.httpUrl(url) || /^mailto:[^\s]+$/i.test(url)) {
            return `[${JiraDcWikiMarkup.inline(label, depth + 1) || JiraDcWikiMarkup.escape(url)}](${ImportMarkdown.linkTarget(url)})`;
        }
        return JiraDcWikiMarkup.escape(label);
    }

    private static codeBlock(args: JiraDcCodeBlockArgs): string {
        const code = args.code.replace(/^\n+|\n+$/g, '');
        const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
        const fence = '`'.repeat(longest + 1);
        const firstParam = args.params?.split('|')[0]?.trim() ?? '';
        const language = (JiraDcWikiMarkup.param(args.params, 'language') ?? (firstParam.includes('=') ? '' : firstParam)).replace(/[^\w+-]/g, '');
        return `${fence}${language}\n${code}\n${fence}`;
    }

    private static param(params: string | undefined, name: string): string | null {
        for (const part of params?.split('|') ?? []) {
            const [key, ...value] = part.split('=');
            if (key.trim().toLowerCase() === name && value.length > 0) return value.join('=').trim() || null;
        }
        return null;
    }

    private static quote(text: string): string {
        if (!text.trim()) return '';
        return text
            .split('\n')
            .map((line) => (line ? `> ${line}` : '>'))
            .join('\n');
    }

    private static codeSpan(text: string): string {
        return text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``;
    }

    private static escape(text: string): string {
        return text.replace(/([\\`*_[\]<>#|~])/g, '\\$1');
    }
}
