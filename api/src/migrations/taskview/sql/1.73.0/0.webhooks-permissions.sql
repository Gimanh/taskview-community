-- Permission group 9 = webhooks (shown in the role editor and the API token picker)
INSERT INTO tv_auth.permissions_group (id, name)
VALUES (9, 'webhooks')
ON CONFLICT (id) DO NOTHING;

UPDATE tv_auth.permissions
SET permission_group = 9
WHERE name = 'webhooks_can_manage';

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'webhooks_can_view',
    'View project webhooks and their delivery history',
    9,
    '{
        "en": "View webhooks. See the project webhooks, their URLs and the delivery history with payloads.",
        "ru": "Просмотр вебхуков. Видеть вебхуки проекта, их адреса и историю доставок с содержимым.",
        "de": "Webhooks ansehen. Die Webhooks des Projekts, ihre URLs und den Zustellverlauf mit Inhalten sehen.",
        "es": "Ver webhooks. Ver los webhooks del proyecto, sus URL y el historial de entregas con su contenido.",
        "pt-BR": "Ver webhooks. Ver os webhooks do projeto, suas URLs e o histórico de entregas com o conteúdo."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- Not granted to any role: owners add the webhook permissions to their roles in the role editor.
