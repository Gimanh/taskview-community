UPDATE tv_auth.permissions
SET
    description = 'View all time entries on this project — both own and other members''. Also exposes the emails of all contributors via the time-entry log',
    description_locales = '{"en": "View time entries. User can see all time entries on this project — both own and other members''. Also exposes the emails of all contributors who have logged time on this project. Does not grant logging or editing.", "ru": "Просмотр записей времени. Пользователь видит все записи проекта — свои и других участников. Также видны email-адреса всех участников, логировавших время. Логировать и редактировать нельзя."}'::jsonb
WHERE name = 'timetracking_can_view';

UPDATE tv_auth.permissions
SET
    description = 'Full time-tracking access: log own time + view and edit/delete entries of any project member. Also exposes emails of all contributors',
    description_locales = '{"en": "Manage all time entries. Full time-tracking access on this project: user can log own time, view all entries (own and other members''), and edit/delete entries of any project member. Also exposes the emails of all contributors who have logged time on this project. Implies both view and log permissions.", "ru": "Управление всеми записями времени. Полный доступ к учёту времени на этом проекте: пользователь может вести свой таймер, видеть все записи (свои и других участников) и редактировать/удалять записи любого участника. Также видны email-адреса всех участников, логировавших время. Включает права на просмотр и ведение времени."}'::jsonb
WHERE name = 'timetracking_can_manage_all';
