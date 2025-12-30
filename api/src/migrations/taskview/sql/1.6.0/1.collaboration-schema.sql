create schema if not exists collaboration;

create table if not exists collaboration.users (
    id serial primary key,
    goal_id int constraint fr_colab_goal_id references tasks.goals (id) on delete cascade,
    email varchar,
    invitation_date timestamptz default (now() AT TIME ZONE 'UTC'),
    unique(goal_id, email)
);