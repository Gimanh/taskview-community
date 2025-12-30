alter table collaboration.users
    drop column goal_id;
alter table collaboration.users
    alter column email set not null;
DELETE
FROM collaboration.users;

ALTER TABLE collaboration.users
    ADD CONSTRAINT unique_email UNIQUE (email);

CREATE UNIQUE INDEX unique_email_idx
ON collaboration.users(email);

create table collaboration.users_to_goals
(
    goal_id int
        constraint clb_user_goal_id references tasks.goals (id) on delete cascade,
    user_id int
        constraint clb_user_user_id references collaboration.users (id) on delete cascade
)


