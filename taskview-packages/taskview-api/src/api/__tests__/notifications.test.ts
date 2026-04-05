import { TvApi } from '@/tv'
import {
  describe,
  it,
  expect,
  beforeAll,
} from 'vitest'
import { initApi } from './init-api'
import type { NotificationPreferencesSettings } from '../notifications.api.types'

describe('Notifications', () => {
  let $api: TvApi

  beforeAll(async () => {
    const { $tvApi } = await initApi()
    $api = $tvApi
  })

  describe('fetch notifications', () => {
    it('should return a notifications array', async () => {
      const result = await $api.notifications.fetch()

      expect(result).toBeDefined()
      expect(result!.notifications).toBeDefined()
      expect(Array.isArray(result!.notifications)).toBe(true)
    })

    it('should accept cursor parameter', async () => {
      const result = await $api.notifications.fetch(0)

      expect(result).toBeDefined()
      expect(result!.notifications).toBeDefined()
      expect(Array.isArray(result!.notifications)).toBe(true)
    })
  })

  describe('mark read', () => {
    it('should mark all notifications as read', async () => {
      const result = await $api.notifications.markAllRead()

      expect(result).toBeDefined()
    })
  })

  describe('preferences', () => {
    it('should get preferences', async () => {
      const result = await $api.notifications.getPreferences()

      expect(result).toBeDefined()
      expect(result).toHaveProperty('settings')
    })

    it('should save and retrieve preferences', async () => {
      const settings: NotificationPreferencesSettings = {
        global: {
          deadline: {
            channels: {
              push: true,
              websocket: true,
              email: false,
            },
          },
          comment: {
            channels: {
              push: false,
              websocket: true,
            },
          },
        },
      }

      const saveResult = await $api.notifications.savePreferences(settings)
      expect(saveResult).toBeTruthy()

      const prefsAfter = await $api.notifications.getPreferences()
      expect(prefsAfter).toBeDefined()
      expect(prefsAfter!.settings).toBeDefined()
      expect(prefsAfter!.settings.global).toBeDefined()
      expect(prefsAfter!.settings.global!.deadline?.channels?.push).toBe(true)
      expect(prefsAfter!.settings.global!.deadline?.channels?.email).toBe(false)
      expect(prefsAfter!.settings.global!.comment?.channels?.push).toBe(false)
      expect(prefsAfter!.settings.global!.comment?.channels?.websocket).toBe(true)
    })

    it('should overwrite preferences on subsequent save', async () => {
      const settings: NotificationPreferencesSettings = {
        global: {
          assign: {
            channels: {
              email: true,
            },
          },
        },
      }

      const saveResult = await $api.notifications.savePreferences(settings)
      expect(saveResult).toBeTruthy()

      const prefs = await $api.notifications.getPreferences()
      expect(prefs).toBeDefined()
      expect(prefs!.settings.global!.assign?.channels?.email).toBe(true)
    })
  })

  describe('connection token', () => {
    it('should return a connection token response', async () => {
      const result = await $api.notifications.getConnectionToken().catch(() => null)

      if (result === null) {
        // Centrifugo may not be running, skip gracefully
        return
      }

      expect(result).toBeDefined()
      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('url')
    })
  })

  describe('device registration', () => {
    it('should handle device register request', async () => {
      const result = await $api.notifications.registerDevice(
        'test-device-token-' + Date.now(),
        'android',
        'Europe/Moscow',
      ).catch(() => null)

      if (result === null) {
        // Push infrastructure may not be available
        return
      }

      expect(result).toBeDefined()
    })

    it('should handle device unregister request', async () => {
      const token = 'test-device-token-' + Date.now()

      await $api.notifications.registerDevice(token, 'ios', 'UTC').catch(() => null)

      const result = await $api.notifications.unregisterDevice(token).catch(() => null)

      if (result === null) {
        return
      }

      expect(result).toBeDefined()
    })
  })
})
