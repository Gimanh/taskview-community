import { describe, expect, it } from 'vitest';
import { JiraCloudAdf } from '../providers/jira-cloud/JiraCloudAdf';
import type { JiraCloudAdfNode } from '../providers/jira-cloud/jira-cloud.types';

const doc = (...content: JiraCloudAdfNode[]): JiraCloudAdfNode => ({ type: 'doc', content });
const text = (value: string, marks: JiraCloudAdfNode['marks'] = []): JiraCloudAdfNode => ({ type: 'text', text: value, marks });
const paragraph = (...content: JiraCloudAdfNode[]): JiraCloudAdfNode => ({ type: 'paragraph', content });

describe('JiraCloudAdf', () => {
    it('returns null for empty or malformed documents', () => {
        expect(JiraCloudAdf.toMarkdown(null)).toBeNull();
        expect(JiraCloudAdf.toMarkdown(doc())).toBeNull();
        expect(JiraCloudAdf.toMarkdown({ type: 'doc' })).toBeNull();
    });

    it('converts headings, marks and safe links, escaping markdown in text', () => {
        const result = JiraCloudAdf.toMarkdown(
            doc(
                { type: 'heading', attrs: { level: 2 }, content: [text('Title')] },
                paragraph(
                    text('bold', [{ type: 'strong' }]),
                    text(' and '),
                    text('code', [{ type: 'code' }]),
                    text(' '),
                    text('site', [{ type: 'link', attrs: { href: 'https://example.com/a b' } }]),
                    text(' '),
                    text('bad', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]),
                    text(' *raw* <b>'),
                ),
            ),
        );
        expect(result).toBe('## Title\n\n**bold** and `code` [site](https://example.com/a%20b) bad \\*raw\\* \\<b\\>');
    });

    it('converts nested lists, task lists and code blocks', () => {
        const result = JiraCloudAdf.toMarkdown(
            doc(
                {
                    type: 'bulletList',
                    content: [
                        {
                            type: 'listItem',
                            content: [
                                paragraph(text('one')),
                                { type: 'orderedList', content: [{ type: 'listItem', content: [paragraph(text('inner'))] }] },
                            ],
                        },
                    ],
                },
                {
                    type: 'taskList',
                    content: [
                        { type: 'taskItem', attrs: { state: 'DONE' }, content: [text('done')] },
                        { type: 'taskItem', attrs: { state: 'TODO' }, content: [text('todo')] },
                    ],
                },
                { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const a = `x`;')] },
            ),
        );
        expect(result).toBe('- one\n  1. inner\n\n- [x] done\n- [ ] todo\n\n```ts\nconst a = `x`;\n```');
    });

    it('converts tables, quotes, mentions and skips media', () => {
        const cell = (type: string, value: string): JiraCloudAdfNode => ({ type, content: [paragraph(text(value))] });
        const result = JiraCloudAdf.toMarkdown(
            doc(
                {
                    type: 'table',
                    content: [
                        { type: 'tableRow', content: [cell('tableHeader', 'A'), cell('tableHeader', 'B')] },
                        { type: 'tableRow', content: [cell('tableCell', '1'), cell('tableCell', 'x|y')] },
                    ],
                },
                { type: 'blockquote', content: [paragraph(text('quoted'))] },
                paragraph({ type: 'mention', attrs: { text: '@Alice' } }, { type: 'hardBreak' }, text('next')),
                { type: 'mediaSingle', content: [{ type: 'media', attrs: { id: '1' } }] },
            ),
        );
        expect(result).toBe('| A | B |\n| --- | --- |\n| 1 | x\\|y |\n\n> quoted\n\n@Alice\\\nnext');
    });
});
