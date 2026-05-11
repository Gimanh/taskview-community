INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES
    (
        'timetracking_can_view',
        'View all time entries on this project — both own and other members''',
        2,
        '{"en": "View time entries. User can see all time entries on this project — both own and other members''. Does not grant logging or editing.", "ru": "Просмотр записей времени. Пользователь видит все записи проекта — свои и других участников. Логировать и редактировать нельзя."}'::jsonb
    ),
    (
        'timetracking_can_log',
        'Start/stop timer and create/edit/delete OWN time entries on this project',
        2,
        '{"en": "Track time. User can start/stop the timer, add manual entries, and edit/delete OWN time entries. Does not grant viewing the project log or managing others'' entries.", "ru": "Учёт времени. Пользователь может запускать/останавливать таймер, добавлять записи вручную и редактировать/удалять СВОИ записи. Не даёт права просматривать журнал проекта и управлять чужими записями."}'::jsonb
    ),
    (
        'timetracking_can_manage_all',
        'Edit/delete time entries of other project members (implies view)',
        2,
        '{"en": "Manage all time entries. User can edit/delete time entries of any project member. Includes viewing the full project log.", "ru": "Управление чужими записями времени. Пользователь может редактировать/удалять записи любого участника проекта. Включает просмотр всех записей проекта."}'::jsonb
    )
ON CONFLICT (name) DO NOTHING;
