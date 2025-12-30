ALTER TABLE
    tasks.tags
ADD
    COLUMN IF NOT EXISTS goal_id integer default null;

alter table
    tasks.tags
add
    constraint fk_tag_goal_id foreign key (goal_id) references tasks.goals(id);