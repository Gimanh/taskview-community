import { type } from 'arktype'

const MAX_SECTIONS = 20
const MAX_ITEMS_PER_SECTION = 200
const ID_MAX_LENGTH = 100
const ID_PATTERN = /^[a-zA-Z0-9_.\-:]+$/

const idArkType = type('string').narrow((v, ctx) => {
  if (v.length === 0 || v.length > ID_MAX_LENGTH) {
    return ctx.mustBe(`a string of 1..${ID_MAX_LENGTH} chars`)
  }
  if (!ID_PATTERN.test(v)) {
    return ctx.mustBe('a string matching [a-zA-Z0-9_.\\-:]+')
  }
  return true
})

export const UiPreferencesItemArkType = type({
  id: idArkType,
  order: 'number.integer >= 0',
  hidden: 'boolean',
  'width?': "'narrow' | 'wide'",
})

const UiPreferencesSectionArkType = UiPreferencesItemArkType.array().narrow((arr, ctx) => {
  if (arr.length > MAX_ITEMS_PER_SECTION) {
    return ctx.mustBe(`at most ${MAX_ITEMS_PER_SECTION} items per section`)
  }
  const seen = new Set<string>()
  for (const item of arr) {
    if (seen.has(item.id)) {
      return ctx.mustBe(`unique item ids (duplicate: ${item.id})`)
    }
    seen.add(item.id)
  }
  return true
})

export const UiPreferencesArkType = type({
  '[string]': UiPreferencesSectionArkType,
}).narrow((obj, ctx) => {
  const keys = Object.keys(obj)
  if (keys.length > MAX_SECTIONS) {
    return ctx.mustBe(`at most ${MAX_SECTIONS} sections`)
  }
  for (const key of keys) {
    if (key.length === 0 || key.length > ID_MAX_LENGTH) {
      return ctx.mustBe(`section key length 1..${ID_MAX_LENGTH} (got "${key}")`)
    }
    if (!ID_PATTERN.test(key)) {
      return ctx.mustBe(`section key matching [a-zA-Z0-9_.\\-:]+ (got "${key}")`)
    }
  }
  return true
})

export type UiPreferencesItem = typeof UiPreferencesItemArkType.infer
export type UiPreferences = typeof UiPreferencesArkType.infer

export type UpdateUiPreferencesArgs = {
  userId: number
  prefs: UiPreferences
}
