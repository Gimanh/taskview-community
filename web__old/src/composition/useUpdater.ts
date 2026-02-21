import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { type BundleInfo, CapacitorUpdater } from '@capgo/capacitor-updater';
import $api from '@/helpers/axios';
import { $ls } from '@/plugins/axios';
import type { AppResponse } from '@/types/global-app.types';
import { useTaskViewMainUrl } from './useTaskViewMainUrl';

let version: BundleInfo;

export async function useUpdater(canUpdate: boolean = false) {
    try {
        const BRANCH_MODE: 'prod' | 'dev' = (await $ls.getValue('update_loading')) === 'dev' ? 'dev' : 'prod';

        const updateInfo = await $api.get<AppResponse<{ version: string; file: string; branch: 'prod' | 'dev' }[]>>(
            `${useTaskViewMainUrl()}/module/updates/info`
        );

        const { value: currentVersion } = await Preferences.get({ key: 'app_version' });

        const last = updateInfo.data.response.find((i) => i.branch === BRANCH_MODE);

        console.log('branch', BRANCH_MODE);

        if (!last) {
            console.log('[Update] No new updates for this branch.', BRANCH_MODE);
            return;
        }

        console.log('currentVersion', currentVersion, 'updateInfo', last);

        if (currentVersion !== last.version || (version && version?.version !== last.version)) {
            console.log('[Update] Downloading new version:', last.version);

            version = await CapacitorUpdater.download({
                version: last.version,
                url: `${useTaskViewMainUrl()}/module/updates/download?branch=${BRANCH_MODE}`,
            });
        } else {
            console.log('[Update] No new updates need to download.');
        }

        if (canUpdate && version) {
            try {
                console.log('[Update] New version available:', last.version);

                SplashScreen.show();

                console.log('[Update] Version:', version);

                await CapacitorUpdater.next(version);

                await Preferences.set({ key: 'app_version', value: last.version });

                await CapacitorUpdater.set(version);

                console.log('[set version]', last.version);

                console.log('[Update] Update applied. Will take effect after restart.');
            } catch (err: unknown) {
                console.log(err);
            } finally {
                SplashScreen.hide();
            }
        }
    } catch (err) {
        console.warn('[Update] Error checking for update:', err);
    }
}
