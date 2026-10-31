import { ImportMarkdown } from '../../core/ImportMarkdown';
import type { JiraCloudAdfMark, JiraCloudAdfNode } from './jira-cloud.types';

const MAX_DEPTH = 40;

// Converts Atlassian Document Format (descriptions and comments in REST API v3) to markdown
export class JiraCloudAdf {
    static toMarkdown(doc: JiraCloudAdfNode | null | undefined): string | null {
        if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) return null;
        const text = JiraCloudAdf.blocks(doc.content, 0).trim();
        return text || null;
    }

    private static blocks(nodes: JiraCloudAdfNode[] | undefined, depth: number): string {
        if (!Array.isArray(nodes) || depth > MAX_DEPTH) return '';
        return nodes
            .map((node) => JiraCloudAdf.block(node, depth))
            .filter((text) => text.trim() !== '')
            .join('\n\n');
    }

    private static block(node: JiraCloudAdfNode, depth: number): string {
        switch (node.type) {
            case 'paragraph':
                return JiraCloudAdf.inline(node.content);
            case 'heading': {
                const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 6);
                return `${'#'.repeat(level)} ${JiraCloudAdf.inline(node.content)}`;
            }
            case 'bulletList':
                return JiraCloudAdf.list(node, depth, () => '- ');
            case 'orderedList': {
                const start = Number(node.attrs?.order) || 1;
                return JiraCloudAdf.list(node, depth, (index) => `${start + index}. `);
            }
            case 'taskList':
                return (node.content ?? [])
                    .map((item) => `- [${item.attrs?.state === 'DONE' ? 'x' : ' '}] ${JiraCloudAdf.inline(item.content)}`)
                    .join('\n');
            case 'decisionList':
                return (node.content ?? []).map((item) => `- ${JiraCloudAdf.inline(item.content)}`).join('\n');
            case 'codeBlock':
                return JiraCloudAdf.codeBlock(node);
            case 'blockquote':
            case 'panel':
                return JiraCloudAdf.quote(JiraCloudAdf.blocks(node.content, depth + 1));
            case 'rule':
                return '---';
            case 'table':
                return JiraCloudAdf.table(node, depth);
            case 'expand':
            case 'nestedExpand': {
                const title = typeof node.attrs?.title === 'string' && node.attrs.title.trim() ? `**${JiraCloudAdf.escape(node.attrs.title)}**` : '';
                return [title, JiraCloudAdf.blocks(node.content, depth + 1)].filter(Boolean).join('\n\n');
            }
            case 'mediaSingle':
            case 'mediaGroup':
            case 'media':
                return '';
            case 'blockCard':
            case 'embedCard':
                return JiraCloudAdf.card(node);
            default:
                return Array.isArray(node.content) ? JiraCloudAdf.blocks(node.content, depth + 1) : JiraCloudAdf.inline([node]);
        }
    }

    private static list(node: JiraCloudAdfNode, depth: number, marker: (index: number) => string): string {
        return (node.content ?? [])
            .map((item, index) => {
                const prefix = marker(index);
                const body = JiraCloudAdf.blocks(item.content, depth + 1).replace(/\n{2,}/g, '\n');
                const indent = ' '.repeat(prefix.length);
                return prefix + body.split('\n').join(`\n${indent}`);
            })
            .join('\n');
    }

    private static codeBlock(node: JiraCloudAdfNode): string {
        const code = (node.content ?? []).map((child) => child.text ?? '').join('');
        const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
        const fence = '`'.repeat(longest + 1);
        const language = typeof node.attrs?.language === 'string' ? node.attrs.language.replace(/[^\w+-]/g, '') : '';
        return `${fence}${language}\n${code}\n${fence}`;
    }

    private static quote(text: string): string {
        if (!text.trim()) return '';
        return text
            .split('\n')
            .map((line) => (line ? `> ${line}` : '>'))
            .join('\n');
    }

    private static table(node: JiraCloudAdfNode, depth: number): string {
        const rows = (node.content ?? [])
            .filter((row) => row.type === 'tableRow')
            .map((row) =>
                (row.content ?? []).map((cell) =>
                    JiraCloudAdf.blocks(cell.content, depth + 1)
                        .replace(/\s*\n+\s*/g, ' ')
                        .trim(),
                ),
            )
            .filter((cells) => cells.length > 0);
        if (rows.length === 0) return '';
        const width = Math.max(...rows.map((cells) => cells.length));
        const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? '').join(' | ')} |`;
        const [header, ...body] = rows;
        return [line(header), line(Array.from({ length: width }, () => '---')), ...body.map(line)].join('\n');
    }

    private static inline(nodes: JiraCloudAdfNode[] | undefined): string {
        if (!Array.isArray(nodes)) return '';
        return nodes.map((node) => JiraCloudAdf.inlineNode(node)).join('');
    }

    private static inlineNode(node: JiraCloudAdfNode): string {
        switch (node.type) {
            case 'text':
                return JiraCloudAdf.markText(node.text ?? '', node.marks ?? []);
            case 'hardBreak':
                return '\\\n';
            case 'mention': {
                const text = typeof node.attrs?.text === 'string' ? node.attrs.text.replace(/^@/, '') : '';
                return text ? `@${JiraCloudAdf.escape(text)}` : '';
            }
            case 'emoji': {
                const text = node.attrs?.text ?? node.attrs?.shortName;
                return typeof text === 'string' ? text : '';
            }
            case 'inlineCard':
                return JiraCloudAdf.card(node);
            case 'date': {
                const timestamp = Number(node.attrs?.timestamp);
                return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
            }
            case 'status':
                return typeof node.attrs?.text === 'string' ? `\`${node.attrs.text.replace(/`/g, '')}\`` : '';
            default:
                return Array.isArray(node.content) ? JiraCloudAdf.inline(node.content) : '';
        }
    }

    private static markText(text: string, marks: JiraCloudAdfMark[]): string {
        if (!text) return '';
        const types = new Set(marks.map((mark) => mark.type));
        let result = types.has('code') ? JiraCloudAdf.codeSpan(text) : JiraCloudAdf.escape(text);
        if (!types.has('code') && text.trim()) {
            if (types.has('strike')) result = `~~${result}~~`;
            if (types.has('em')) result = `*${result}*`;
            if (types.has('strong')) result = `**${result}**`;
        }
        const link = marks.find((mark) => mark.type === 'link');
        const href = typeof link?.attrs?.href === 'string' ? link.attrs.href : null;
        return href && JiraCloudAdf.safeHref(href) ? `[${result}](${ImportMarkdown.linkTarget(href)})` : result;
    }

    private static card(node: JiraCloudAdfNode): string {
        const url = typeof node.attrs?.url === 'string' ? node.attrs.url : null;
        if (!url || !JiraCloudAdf.safeHref(url)) return '';
        return `[${JiraCloudAdf.escape(url)}](${ImportMarkdown.linkTarget(url)})`;
    }

    private static codeSpan(text: string): string {
        const fence = text.includes('`') ? '``' : '`';
        return `${fence}${fence === '``' ? ` ${text} ` : text}${fence}`;
    }

    private static safeHref(href: string): boolean {
        return ImportMarkdown.httpUrl(href) || /^mailto:[^\s]+$/i.test(href);
    }

    private static escape(text: string): string {
        return text.replace(/([\\`*_[\]<>#|~])/g, '\\$1');
    }
}
