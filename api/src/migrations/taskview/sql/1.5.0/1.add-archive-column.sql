alter table
    tasks.goals
add
    column if not EXISTS archive integer default 0;

alter table
    tasks.goal_lists
add
    column if not EXISTS archive integer default 0;