import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
} from 'vitest'
import { initApi } from './init-api'

describe('Sessions', () => {
  let $api: TvApi

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi
  })

  describe('Fetch sessions', () => {
    it('should return at least one session', async () => {
      const sessions = await $api.sessions.fetch().catch(console.error)

      if (!sessions) {
        throw new Error('Failed to fetch sessions')
      }

      expect(sessions.length).toBeGreaterThanOrEqual(1)
    })

    it('should have id and createdAt on each session', async () => {
      const sessions = await $api.sessions.fetch().catch(console.error)

      if (!sessions) {
        throw new Error('Failed to fetch sessions')
      }

      for (const session of sessions) {
        expect(session.id).toBeDefined()
        expect(session.id).toBeGreaterThan(0)
        expect(session.createdAt).toBeDefined()
        expect(typeof session.createdAt).toBe('string')
      }
    })

    it('should have exactly one current session', async () => {
      const sessions = await $api.sessions.fetch().catch(console.error)

      if (!sessions) {
        throw new Error('Failed to fetch sessions')
      }

      const currentSessions = sessions.filter((s) => s.isCurrent)
      expect(currentSessions.length).toBe(1)
    })
  })

  describe('Delete session', () => {
    it('should delete a non-current session if one exists', async () => {
      const sessions = await $api.sessions.fetch().catch(console.error)

      if (!sessions) {
        throw new Error('Failed to fetch sessions')
      }

      const nonCurrent = sessions.find((s) => !s.isCurrent)

      if (!nonCurrent) {
        // Only the current session exists, nothing to delete
        return
      }

      const deleteResult = await $api.sessions.delete(nonCurrent.id).catch(console.error)
      expect(deleteResult).toBe(true)

      const sessionsAfter = await $api.sessions.fetch().catch(console.error)

      if (!sessionsAfter) {
        throw new Error('Failed to fetch sessions after delete')
      }

      const found = sessionsAfter.find((s) => s.id === nonCurrent.id)
      expect(found).toBeUndefined()
    })
  })

})
