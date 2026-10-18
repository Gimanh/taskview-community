import type { CollaborationPermission } from 'taskview-api'
import type { TI18nLocalesInApp } from './app.types'

export type PermissioinGroupsIds = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const PermissionGroups: Record<PermissioinGroupsIds, Record<keyof TI18nLocalesInApp, string>> = {
  1: { en: 'Applicarion level', ru: 'Уровня приложения' },
  2: { en: 'Project', ru: 'Проект' },
  3: { en: 'Task list', ru: 'Список задач' },
  4: { en: 'Tasks', ru: 'Задачи' },
  5: { en: 'Sprints', ru: 'Спринты' },
  6: { en: 'Organization', ru: 'Организация' },
  7: { en: 'Files', ru: 'Файлы' },
  8: { en: 'Automations', ru: 'Автоматизации' },
}

export type CollaborationPermissionsState = {
    permissions: CollaborationPermission[];
};
