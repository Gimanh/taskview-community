alter table tasks.tasks
    add column if not exists goal_id int default null;

alter table tasks.tasks
    add constraint fr_task_goal_id foreign key (goal_id) references tasks.goals (id);

CREATE OR REPLACE FUNCTION tasks.set_goal_id_default_for_task()
    RETURNS TRIGGER AS
$$
DECLARE
    goal_id INT;
BEGIN
    -- Проверяем, было ли установлено значение goal_id
    --IF NEW.goal_id IS NULL THEN
    -- Получаем goal_id из таблицы Goals через связку Goals_Lists
    SELECT gl.goal_id
    INTO goal_id
    FROM tasks.goal_lists gl
    WHERE gl.id = NEW.goal_list_id;

    -- Вставляем goal_id в задачу
    IF goal_id IS NOT NULL THEN
        NEW.goal_id := goal_id;
    END IF;
    --END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

drop trigger if exists before_insert_set_goal_id_for_task on tasks.tasks;

CREATE TRIGGER before_insert_set_goal_id_for_task
    BEFORE INSERT OR UPDATE
    ON tasks.tasks
    FOR EACH ROW
EXECUTE FUNCTION tasks.set_goal_id_default_for_task();



UPDATE tasks.tasks t
SET goal_id = (
    SELECT gl.goal_id
    FROM tasks.goal_lists gl
    WHERE gl.id = t.goal_list_id
)
WHERE EXISTS(
              SELECT 1
              FROM tasks.goal_lists gl
              WHERE gl.id = t.goal_list_id
          );


CREATE INDEX idx_tasks_goal_id ON tasks.tasks (goal_id);