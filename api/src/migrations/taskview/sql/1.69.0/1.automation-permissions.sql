-- Permission group 8 = automations (shown in the role editor)
INSERT INTO tv_auth.permissions_group (id, name)
VALUES (8, 'automations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES
    ('automation_can_view', 'View project automation rules', 8,
     '{
        "en": "View automations. See the project automation rules.",
        "ru": "Просмотр автоматизаций. Видеть правила автоматизации проекта.",
        "de": "Automatisierungen ansehen. Die Automatisierungsregeln des Projekts sehen.",
        "es": "Ver automatizaciones. Ver las reglas de automatización del proyecto.",
        "pt-BR": "Ver automações. Ver as regras de automação do projeto."
     }'::jsonb),
    ('automation_can_manage', 'Create, edit, enable, disable and delete project automation rules', 8,
     '{
        "en": "Manage automations. Create, edit, enable, disable and delete project automation rules.",
        "ru": "Управление автоматизациями. Создавать, изменять, включать, выключать и удалять правила автоматизации проекта.",
        "de": "Automatisierungen verwalten. Automatisierungsregeln des Projekts erstellen, bearbeiten, aktivieren, deaktivieren und löschen.",
        "es": "Gestionar automatizaciones. Crear, editar, activar, desactivar y eliminar las reglas de automatización del proyecto.",
        "pt-BR": "Gerenciar automações. Criar, editar, ativar, desativar e excluir as regras de automação do projeto."
     }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Existing projects are NOT backfilled: owners grant the permissions to their roles in the role editor.
