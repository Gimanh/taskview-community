-- begin;


--1.collaboration-users-refactor

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'collaboration' 
    AND column_name = 'goal_id'
  ) THEN
    ALTER TABLE collaboration.users DROP COLUMN goal_id;
  END IF;
END $$;

alter table collaboration.users alter column email set not null;

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
);


--2.trigger-for-project-owner-in-collaboration.sql


create or replace function tasks.add_self_to_collaboration()
returns trigger as $$
DECLARE
    owner_email TEXT;
BEGIN

    select email into owner_email
    from tv_auth.users
    where id = NEW.owner;

    if owner_email is not null then
        insert into collaboration.users (email) values (owner_email);
        insert into collaboration.users_to_goals (goal_id, user_id) values (NEW.id, (select id from collaboration.users where email = owner_email));
    end if;

    return NEW;
END;
$$ language plpgsql;

drop trigger if exists add_selt_to_collaboration_trg on tasks.goals;

create trigger add_selt_to_collaboration_trg
    after insert on tasks.goals
    for each row
    execute function tasks.add_self_to_collaboration();

--3.update-owner-users-in-collaboration.sql

DO
$$
    DECLARE
        rec         RECORD;
        owner_email TEXT;
    BEGIN
        -- Обходим все проекты из таблицы goals
        FOR rec IN
            SELECT g.id AS project_id, g.owner
            FROM tasks.goals g
            LOOP
                -- Проверяем, есть ли запись о владельце в таблице collaboration для данного проекта
                IF NOT EXISTS(SELECT 1
                              FROM collaboration.users c
                              WHERE c.email = (select email from tv_auth.users where id = rec.owner)) THEN
                    -- Получаем email владельца из таблицы users
                    SELECT u.email
                    INTO owner_email
                    FROM tv_auth.users u
                    WHERE u.id = rec.owner;

                    -- Добавляем владельца в таблицу collaboration
                    IF owner_email IS NOT NULL THEN
                        INSERT INTO collaboration.users (email)
                        VALUES (owner_email);
                    END IF;
                END IF;

                insert into collaboration.users_to_goals (goal_id, user_id)
                values (rec.project_id, (select id
                                         from collaboration.users
                                         where email = (select email from tv_auth.users where id = rec.owner)));
            END LOOP;
    END
$$;

-- commit;