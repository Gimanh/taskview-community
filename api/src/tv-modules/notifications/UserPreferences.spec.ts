import { describe, expect, it } from 'vitest';
import { NotificationChannel, NotificationType } from './types';
import { UserPreferences } from './UserPreferences';

describe('UserPreferences', () => {
    it('enables every channel for a type the user never touched, built-in or not', () => {
        const preferences = new UserPreferences({});
        expect(preferences.getEnabledChannels(NotificationType.ASSIGN)).toEqual([NotificationChannel.PUSH, NotificationChannel.WEBSOCKET]);
        expect(preferences.getEnabledChannels('extension_type')).toEqual([NotificationChannel.PUSH, NotificationChannel.WEBSOCKET]);
    });

    it('keeps the choice made for a type an extension brought', () => {
        const preferences = new UserPreferences({ global: { extension_type: { channels: { push: false } } } });
        expect(preferences.getEnabledChannels('extension_type')).toEqual([NotificationChannel.WEBSOCKET]);
        expect(preferences.getEnabledChannels(NotificationType.ASSIGN)).toEqual([NotificationChannel.PUSH, NotificationChannel.WEBSOCKET]);
    });

    it('lets a project override the choice made for an extension type', () => {
        const preferences = new UserPreferences({
            global: { extension_type: { channels: { push: false } } },
            projects: { '7': { extension_type: { channels: { websocket: false } } } },
        });
        expect(preferences.getEnabledChannels('extension_type', 7)).toEqual([]);
        expect(preferences.getEnabledChannels('extension_type', 8)).toEqual([NotificationChannel.WEBSOCKET]);
    });

    it('keeps email off until the user switches it on', () => {
        const untouched = new UserPreferences({});
        expect(untouched.getEnabledChannels(NotificationType.ASSIGN)).not.toContain(NotificationChannel.EMAIL);
        expect(untouched.isChannelEnabled(NotificationType.ASSIGN, NotificationChannel.EMAIL)).toBe(false);

        const switchedOn = new UserPreferences({ global: { assign: { channels: { email: true } } } });
        expect(switchedOn.getEnabledChannels(NotificationType.ASSIGN)).toEqual([
            NotificationChannel.PUSH,
            NotificationChannel.WEBSOCKET,
            NotificationChannel.EMAIL,
        ]);
        expect(switchedOn.getEnabledChannels(NotificationType.DEADLINE)).not.toContain(NotificationChannel.EMAIL);
    });

    it('lets a project switch email off or on against the global choice', () => {
        const preferences = new UserPreferences({
            global: { extension_type: { channels: { email: true } } },
            projects: { '7': { extension_type: { channels: { email: false } } }, '8': { assign: { channels: { email: true } } } },
        });
        expect(preferences.getEnabledChannels('extension_type', 7)).not.toContain(NotificationChannel.EMAIL);
        expect(preferences.getEnabledChannels('extension_type', 9)).toContain(NotificationChannel.EMAIL);
        expect(preferences.getEnabledChannels(NotificationType.ASSIGN, 8)).toContain(NotificationChannel.EMAIL);
        expect(preferences.getEnabledChannels(NotificationType.ASSIGN, 9)).not.toContain(NotificationChannel.EMAIL);
    });
});
