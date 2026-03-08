ALTER TABLE tasks.integrations ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'integrations_can_manage',
    'User can manage integrations (connect, disconnect, sync)',
    2,
    '{
        "en": "Manage integrations. User can connect, disconnect, configure and sync integrations",
        "ru": "Управление интеграциями. Пользователь может подключать, отключать, настраивать и синхронизировать интеграции"
    }'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'integrations_can_view',
    'User can view integrations list',
    2,
    '{
        "en": "View integrations. User can view the list of connected integrations",
        "ru": "Просмотр интеграций. Пользователь может просматривать список подключённых интеграций"
    }'::jsonb
)
ON CONFLICT DO NOTHING;
