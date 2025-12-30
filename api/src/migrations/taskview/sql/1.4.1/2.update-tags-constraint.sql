alter table
    tasks.tags drop constraint fk_tag_goal_id,
add
    constraint fk_tag_goal_id foreign key (goal_id) references tasks.goals(id) on delete cascade;