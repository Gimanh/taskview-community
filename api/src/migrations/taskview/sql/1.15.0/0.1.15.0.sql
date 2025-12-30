-- Table for relations between tasks (for Vue Flow graph)
create table tasks.task_relations (
    id serial primary key,
    from_task_id int references tasks.tasks(id) on delete cascade,
    to_task_id   int references tasks.tasks(id) on delete cascade,
    goal_id      int references tasks.goals(id) on delete cascade,
    node_metadata jsonb,
    created_at timestamptz not null default now(),
    constraint task_relations_unique unique (from_task_id, to_task_id)
);

-- add node_graph_position column to tasks table for Vue Flow graph position storage
alter table tasks.tasks add column node_graph_position jsonb;