import { describe, expect, it } from 'vitest';
import { JiraDcWikiMarkup } from '../providers/jira-dc/JiraDcWikiMarkup';

describe('JiraDcWikiMarkup', () => {
    it('returns null for empty input', () => {
        expect(JiraDcWikiMarkup.toMarkdown(null)).toBeNull();
        expect(JiraDcWikiMarkup.toMarkdown('  \n ')).toBeNull();
    });

    it('converts headings, inline marks and keeps hyphenated words', () => {
        expect(JiraDcWikiMarkup.toMarkdown('h2. Title\n*bold* _it_ -gone- {{mono}} well-known ??cite??')).toBe(
            '## Title\n\n**bold** *it* ~~gone~~ `mono` well-known *cite*',
        );
    });

    it('converts safe links, mentions and drops unsafe targets and images', () => {
        expect(JiraDcWikiMarkup.toMarkdown('[Docs|https://example.com/a b] [~jdoe] [evil|javascript:alert(1)] !image.png|thumbnail! [ABC-1]')).toBe(
            '[Docs](https://example.com/a%20b) @jdoe evil  ABC-1',
        );
    });

    it('converts nested lists and tables with pipes inside links', () => {
        expect(JiraDcWikiMarkup.toMarkdown('* one\n** two\n# first\n#* mixed')).toBe('- one\n  - two\n1. first\n   - mixed');
        expect(JiraDcWikiMarkup.toMarkdown('||A||B||\n|[x|https://x.io]|2|')).toBe('| A | B |\n| --- | --- |\n| [x](https://x.io) | 2 |');
    });

    it('keeps code verbatim and converts quotes and panels', () => {
        expect(JiraDcWikiMarkup.toMarkdown('{code:java}\nint *a* = 1;\n{code}')).toBe('```java\nint *a* = 1;\n```');
        expect(JiraDcWikiMarkup.toMarkdown('{noformat}a_b{noformat}')).toBe('```\na_b\n```');
        expect(JiraDcWikiMarkup.toMarkdown('{quote}line *one*\nline two{quote}')).toBe('> line **one**\\\n> line two');
        expect(JiraDcWikiMarkup.toMarkdown('{panel:title=Note|borderStyle=dashed}body{panel}')).toBe('**Note**\n\nbody');
    });

    it('escapes markdown and raw html in plain text and honors wiki escapes', () => {
        expect(JiraDcWikiMarkup.toMarkdown('<script> # not heading \\*literal\\* line\\\\next')).toBe(
            '\\<script\\> \\# not heading \\*literal\\* line\\\nnext',
        );
    });
});
