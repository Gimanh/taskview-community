import { describe, expect, it } from 'vitest';
import { TaskNoteFileRefs } from '../TaskNoteFileRefs';

const A = '11111111-2222-4333-8444-555555555555';
const B = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const COPY = '99999999-8888-4777-8666-555555555555';

const img = (id: string, quote = '"') => `<img data-file-id=${quote}${id}${quote} alt="shot.png">`;

describe('TaskNoteFileRefs', () => {
    it('finds every file id shown in a note, once each', () => {
        const note = `<p>before</p>${img(A)}<p>middle</p>${img(B)}${img(A)}`;
        expect(TaskNoteFileRefs.extract(note).sort()).toEqual([A, B].sort());
    });

    it.each([
        ['an empty note', ''],
        ['no note', null],
        ['a note without images', '<p>plain <strong>text</strong></p>'],
        ['an external image', '<img src="https://example.com/a.png">'],
        ['a path instead of an id', '<img data-file-id="../../x">'],
        ['a number instead of an id', '<img data-file-id="42">'],
        ['an id that is too short', `<img data-file-id="${A.slice(0, -1)}">`],
        ['an id with something appended', `<img data-file-id="${A}/../x">`],
        ['an id with something prepended', `<img data-file-id="x${A}">`],
        ['an unquoted id', `<img data-file-id=${A}>`],
        ['mismatched quotes', `<img data-file-id="${A}'>`],
    ])('finds nothing in %s', (_label, note) => {
        expect(TaskNoteFileRefs.extract(note)).toEqual([]);
    });

    it('reads single-quoted and upper-case ids as the same file', () => {
        expect(TaskNoteFileRefs.extract(img(A, '\''))).toEqual([A]);
        expect(TaskNoteFileRefs.extract(img(B.toUpperCase()))).toEqual([B]);
    });

    it('points the note at the copy and leaves everything else as it was', () => {
        const note = `<p>text ${A}</p>${img(A)}${img(B)}<img src="https://example.com/a.png">`;
        const replaced = TaskNoteFileRefs.replace({ note, replacements: new Map([[A, COPY]]) });
        expect(replaced).toBe(`<p>text ${A}</p>${img(COPY)}${img(B)}<img src="https://example.com/a.png">`);
    });

    it('replaces every occurrence, whatever the quotes and the case', () => {
        const note = `${img(B.toUpperCase())}${img(B, '\'')}`;
        const replaced = TaskNoteFileRefs.replace({ note, replacements: new Map([[B, COPY]]) });
        expect(replaced).toBe(`${img(COPY)}${img(COPY, '\'')}`);
        expect(TaskNoteFileRefs.extract(replaced)).toEqual([COPY]);
    });

    it('changes nothing without a replacement for the ids of the note', () => {
        const note = `${img(A)}<img data-file-id="../../x">`;
        expect(TaskNoteFileRefs.replace({ note, replacements: new Map([[B, COPY]]) })).toBe(note);
    });
});
