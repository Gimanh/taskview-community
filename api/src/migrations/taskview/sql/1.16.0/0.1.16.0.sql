-- status IS NOT NULL
CREATE UNIQUE INDEX uniq_tasks_goal_status_order
ON tasks.tasks (goal_id, status_id, kanban_order)
WHERE status_id IS NOT NULL;

-- status IS NULL (backlog)
CREATE UNIQUE INDEX uniq_tasks_goal_backlog_order
ON tasks.tasks (goal_id, kanban_order)
WHERE status_id IS NULL;

ALTER TABLE tasks.statuses ADD COLUMN column_version BIGINT default 1;
ALTER TABLE tasks.goals ADD COLUMN backlog_version BIGINT default 1;


INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'kanban_can_manage',
    'User can manage kanban (reorder, add, edit, delete columns)',
    2,
    '{
        "en": "Manage kanban. User can manage kanban (reorder, add, edit, delete columns)",
        "ru": "Управление Kanban. Пользователь может управлять Kanban (переупорядочивать, добавлять, редактировать, удалять колонки)"
    }'::jsonb
);

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'kanban_can_view',
    'User can view kanban (view columns, tasks)',
    2,
    '{
        "en": "View kanban. User can view kanban (view columns, tasks)",
        "ru": "Просмотр Kanban. Пользователь может просматривать Kanban (просматривать колонки, задачи)"
    }'::jsonb
);


INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'graph_can_manage',
    'User can manage graph (reorder, add, edit, delete nodes)',
    2,
    '{
        "en": "Manage graph. User can manage graph (reorder, add, edit, delete nodes, edges)",
        "ru": "Управление графом. Пользователь может управлять графом (переупорядочивать, добавлять, редактировать, удалять узлы, ребра)"
    }'::jsonb
);

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES (
    'graph_can_view',
    'User can view graph (view nodes, edges)',
    2,
    '{
        "en": "View graph. User can view graph (view nodes, edges)",
        "ru": "Просмотр графа. Пользователь может просматривать граф (просматривать узлы, ребра)"
    }'::jsonb
);