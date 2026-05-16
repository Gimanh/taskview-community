UPDATE tv_auth.permissions
SET
    description = 'View all time entries; exposes emails of contributors via the entry log',
    description_locales = '{"en": "View time entries. User can see all time entries on this project — both own and other members''. Also exposes the emails of all contributors who have logged time on this project. Does not grant logging or editing.", "ru": "Просмотр записей времени. Пользователь видит все записи проекта — свои и других участников. Также видны email-адреса всех участников, логировавших время. Логировать и редактировать нельзя."}'::jsonb
WHERE name = 'timetracking_can_view';

UPDATE tv_auth.permissions
SET
    description = 'Start/stop timer and create manual entries; editing/deleting requires manage_all',
    description_locales = '{"en": "Log time. User can start/stop the timer and add manual entries on this project. Cannot edit or delete entries (including own) — editing requires manage_all permission. Does not grant viewing other members'' entries.", "ru": "Учёт времени. Пользователь может запускать/останавливать таймер и добавлять записи вручную в этом проекте. Редактировать и удалять записи (даже свои) нельзя — для этого нужно право управления. Не даёт права просматривать записи других участников."}'::jsonb
WHERE name = 'timetracking_can_log';

UPDATE tv_auth.permissions
SET
    description = 'Full time-tracking access: log, view, edit, delete entries; exposes contributor emails',
    description_locales = '{"en": "Manage all time entries. Full time-tracking access on this project: user can log own time, view all entries (own and other members''), and edit/delete entries of any project member (including own). Also exposes the emails of all contributors who have logged time on this project. Implies both view and log permissions.", "ru": "Управление всеми записями времени. Полный доступ к учёту времени на этом проекте: пользователь может вести свой таймер, видеть все записи (свои и других участников) и редактировать/удалять записи любого участника (включая свои). Также видны email-адреса всех участников, логировавших время. Включает права на просмотр и ведение времени."}'::jsonb
WHERE name = 'timetracking_can_manage_all';
