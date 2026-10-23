import { describe, expect, it } from 'vitest'
import { isFileDropHandled, markFileDropHandled, pickImageFiles } from '@/helpers/noteImageFiles'

const file = (name: string, type: string) => new File(['x'], name, { type })

describe('pickImageFiles', () => {
  it('keeps only image files', () => {
    const png = file('a.png', 'image/png')
    const gif = file('b.gif', 'image/gif')
    const pdf = file('c.pdf', 'application/pdf')
    const txt = file('d.txt', 'text/plain')

    expect(pickImageFiles([png, pdf, gif, txt])).toEqual([png, gif])
  })

  it('ignores files without a mime type', () => {
    expect(pickImageFiles([file('unknown', '')])).toEqual([])
  })

  it('accepts empty and missing lists', () => {
    expect(pickImageFiles([])).toEqual([])
    expect(pickImageFiles(null)).toEqual([])
    expect(pickImageFiles(undefined)).toEqual([])
  })
})

describe('file drop marker', () => {
  it('reports only the events that were marked', () => {
    const handled = new Event('drop')
    const other = new Event('drop')

    markFileDropHandled(handled)

    expect(isFileDropHandled(handled)).toBe(true)
    expect(isFileDropHandled(other)).toBe(false)
  })
})
