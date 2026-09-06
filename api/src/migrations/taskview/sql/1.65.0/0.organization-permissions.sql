-- Permissions for the surfaces that were previously guarded only by an
-- organization role or by project ownership, and therefore ignored the scope of
-- an API / OAuth token entirely: a token issued with a single permission could
-- still create organizations, add admins, configure SSO and create webhooks.
--
-- These keys let a token be narrowed on those actions too. They never grant
-- anything: the role and ownership checks still run first, and RequireTokenPermission
-- only removes what the token was not given.
INSERT INTO tv_auth.permissions_group (id, name)
VALUES (6, 'organization')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'org_can_view',
    'View the organization and its members',
    6,
    '{
        "en": "View organization. See the organization and the list of its members.",
        "ru": "Просмотр организации. Видеть организацию и список её участников.",
        "de": "Organisation ansehen. Die Organisation und ihre Mitglieder sehen.",
        "es": "Ver la organización. Ver la organización y la lista de sus miembros.",
        "pt-BR": "Ver a organização. Ver a organização e a lista de seus membros."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'org_can_manage',
    'Create, rename and delete organizations',
    6,
    '{
        "en": "Manage organizations. Create, rename and delete organizations.",
        "ru": "Управление организациями. Создавать, переименовывать и удалять организации.",
        "de": "Organisationen verwalten. Organisationen erstellen, umbenennen und löschen.",
        "es": "Gestionar organizaciones. Crear, renombrar y eliminar organizaciones.",
        "pt-BR": "Gerenciar organizações. Criar, renomear e excluir organizações."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'org_can_manage_members',
    'Add and remove organization members and change their roles',
    6,
    '{
        "en": "Manage members. Add and remove organization members and change their roles.",
        "ru": "Управление участниками. Добавлять и удалять участников организации, менять их роли.",
        "de": "Mitglieder verwalten. Mitglieder hinzufügen, entfernen und deren Rollen ändern.",
        "es": "Gestionar miembros. Añadir y quitar miembros de la organización y cambiar sus roles.",
        "pt-BR": "Gerenciar membros. Adicionar e remover membros da organização e alterar seus papéis."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'sso_can_manage',
    'Create and change the single sign-on configuration',
    6,
    '{
        "en": "Manage SSO. Create and change the single sign-on configuration of the organization.",
        "ru": "Управление SSO. Создавать и изменять настройки единого входа организации.",
        "de": "SSO verwalten. Die Single-Sign-on-Konfiguration der Organisation erstellen und ändern.",
        "es": "Gestionar SSO. Crear y cambiar la configuración de inicio de sesión único de la organización.",
        "pt-BR": "Gerenciar SSO. Criar e alterar a configuração de login único da organização."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'webhooks_can_manage',
    'Create, edit and delete project webhooks',
    6,
    '{
        "en": "Manage webhooks. Create, edit and delete webhooks of a project.",
        "ru": "Управление вебхуками. Создавать, изменять и удалять вебхуки проекта.",
        "de": "Webhooks verwalten. Webhooks eines Projekts erstellen, bearbeiten und löschen.",
        "es": "Gestionar webhooks. Crear, editar y eliminar webhooks de un proyecto.",
        "pt-BR": "Gerenciar webhooks. Criar, editar e excluir webhooks de um projeto."
    }'::jsonb
)
ON CONFLICT (name) DO NOTHING;
