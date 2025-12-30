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
