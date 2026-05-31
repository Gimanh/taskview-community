-- Permission group 5 = sprints (shown in the role editor; group 1 'app' is hidden there)
INSERT INTO tv_auth.permissions_group (id, name)
VALUES (5, 'sprints')
ON CONFLICT (id) DO NOTHING;

-- New sprint permissions
INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES
    ('sprint_can_view', 'View sprints of the project', 5,
     '{"en": "View sprints. See the project sprints, their dates and contents.", "ru": "Просмотр спринтов. Видеть спринты проекта, их даты и состав."}'::jsonb),
    ('sprint_can_manage', 'Create, edit, activate, close sprints, save retro', 5,
     '{"en": "Manage sprints. Create, edit, activate, run review and close sprints; save retros.", "ru": "Управление спринтами. Создавать, редактировать, активировать, проводить ревью и закрывать спринты; сохранять ретро."}'::jsonb),
    ('sprint_can_assign_tasks', 'Move tasks in and out of sprints', 5,
     '{"en": "Assign tasks to sprints. Move tasks into and out of sprints.", "ru": "Назначение задач в спринты. Перемещать задачи в спринты и из них."}'::jsonb),
    ('sprint_can_view_analytics', 'View sprint burndown and velocity', 5,
     '{"en": "View sprint analytics. See burndown and velocity charts.", "ru": "Аналитика спринтов. Видеть burndown и velocity."}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Backfill existing projects: grant sprint permissions to their editor/executor roles.
-- (NEW projects get them via tasks.add_roles_and_permissions() — see all-triggers.sql.)
INSERT INTO collaboration.permissions_to_role (role_id, permission_id)
SELECT r.id, p.id
FROM collaboration.roles r
CROSS JOIN tv_auth.permissions p
WHERE r.name = 'editor'
  AND p.name IN ('sprint_can_view', 'sprint_can_manage', 'sprint_can_assign_tasks', 'sprint_can_view_analytics')
ON CONFLICT DO NOTHING;

INSERT INTO collaboration.permissions_to_role (role_id, permission_id)
SELECT r.id, p.id
FROM collaboration.roles r
CROSS JOIN tv_auth.permissions p
WHERE r.name = 'executor'
  AND p.name IN ('sprint_can_view', 'sprint_can_assign_tasks')
ON CONFLICT DO NOTHING;
