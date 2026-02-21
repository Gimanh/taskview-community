import type { CollaborationPermission } from 'taskview-api';
import type { TI18nLocalesInApp } from './app.types';

export type PermissioinGroupsIds = 1 | 2 | 3 | 4;

export const PermissionGroups: Record<PermissioinGroupsIds, Record<keyof TI18nLocalesInApp, string>> = {
    1: { en: 'Applicarion level', ru: 'Уровня приложения' },
    2: { en: 'Project', ru: 'Проект' },
    3: { en: 'Task list', ru: 'Список задач' },
    4: { en: 'Tasks', ru: 'Задачи' },
};

export type CollaborationPermissionsState = {
    permissions: CollaborationPermission[];
};
