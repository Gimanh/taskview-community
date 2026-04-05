import { describe, it, expect } from 'vitest'
import { ok, err } from '../tools/helpers.js'
import { ts } from './setup.js'

describe('helpers', () => {
  it('ok wraps data as JSON text content', () => {
    const data = { id: 1, name: `test-${ts()}` }
    const result = ok(data)

    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('text')
    expect(JSON.parse(result.content[0].text)).toEqual(data)
  })

  it('ok handles arrays', () => {
    const data = [{ id: 1 }, { id: 2 }]
    const result = ok(data)

    expect(JSON.parse(result.content[0].text)).toEqual(data)
  })

  it('ok handles null', () => {
    const result = ok(null)
    expect(JSON.parse(result.content[0].text)).toBeNull()
  })

  it('ok handles primitives', () => {
    expect(JSON.parse(ok(true).content[0].text)).toBe(true)
    expect(JSON.parse(ok(42).content[0].text)).toBe(42)
    expect(JSON.parse(ok('str').content[0].text)).toBe('str')
  })

  it('err wraps Error with message', () => {
    const msg = `Something failed ${ts()}`
    const result = err(new Error(msg))

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(`Error: ${msg}`)
  })

  it('err wraps string', () => {
    const msg = `Raw error ${ts()}`
    const result = err(msg)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe(`Error: ${msg}`)
  })

  it('err wraps unknown types', () => {
    const result = err(123)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: 123')
  })
})
