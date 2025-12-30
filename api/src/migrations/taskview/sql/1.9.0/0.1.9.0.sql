--delete not null restriction because we can add task into goal directly
alter table tasks.tasks alter column goal_list_id drop not null;

--add task statuses for kanban board
CREATE TABLE tasks.statuses (
    id SERIAL PRIMARY KEY, -- Генерация уникального ID
    name VARCHAR(32) NOT NULL, -- Добавлено ограничение на NULL
    goal_id INT REFERENCES tasks.goals(id) ON DELETE CASCADE, -- Ссылка на tasks.goals
    view_order INT
);

--add default columns for kanban goals
CREATE OR REPLACE FUNCTION tasks.kanban_add_default_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Добавляем стандартные колонки для новой цели
    INSERT INTO tasks.statuses (name, goal_id, view_order)
    VALUES 
        ('TODO', NEW.id, 1),
        ('In Progress', NEW.id, 2),
        ('Done', NEW.id, 3);

    -- Возвращаем NEW, так как это триггер
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер, если он существует
DROP TRIGGER IF EXISTS kanban_add_default_columns_trg ON tasks.goals;

-- Создаём новый триггер
CREATE TRIGGER kanban_add_default_columns_trg
AFTER INSERT ON tasks.goals
FOR EACH ROW
EXECUTE FUNCTION tasks.kanban_add_default_columns();

--add kanban col default for goals
INSERT INTO tasks.statuses (name, goal_id, view_order)
SELECT 'TODO', id, 1 FROM tasks.goals
WHERE id NOT IN (SELECT goal_id FROM tasks.statuses WHERE name = 'TODO')
UNION ALL
SELECT 'In Progress', id, 2 FROM tasks.goals
WHERE id NOT IN (SELECT goal_id FROM tasks.statuses WHERE name = 'In Progress')
UNION ALL
SELECT 'Done', id, 3 FROM tasks.goals
WHERE id NOT IN (SELECT goal_id FROM tasks.statuses WHERE name = 'Done');

--Add a statusId column for tasks due to Kanban implementation.
ALTER TABLE tasks.tasks ADD COLUMN status_id INT;

ALTER TABLE tasks.tasks 
ADD CONSTRAINT task_status_id_fk 
FOREIGN KEY (status_id) REFERENCES tasks.statuses(id) 
ON DELETE SET NULL;  

--Validate the correct statusId for the inserted value.
CREATE OR REPLACE FUNCTION tasks.check_task_status_goal()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверяем, существует ли запись в tasks.statuses с таким же goal_id
    IF NOT EXISTS (
        SELECT 1 FROM tasks.statuses s 
        WHERE s.id = NEW.status_id AND s.goal_id = NEW.goal_id
    ) THEN
        RAISE EXCEPTION 'Status ID % is not valid for goal ID %', NEW.status_id, NEW.goal_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_task_status_goal
BEFORE INSERT OR UPDATE ON tasks.tasks
FOR EACH ROW
WHEN (NEW.status_id IS NOT NULL)
EXECUTE FUNCTION tasks.check_task_status_goal();

ALTER TABLE tasks.tasks ADD COLUMN task_order FLOAT;
ALTER TABLE tasks.tasks ADD COLUMN kanban_order FLOAT;

-- Ensure function is in the correct schema
CREATE OR REPLACE FUNCTION tasks.set_order_value()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.task_order IS NULL THEN
        NEW.task_order := NEW.id;
    END IF;
    IF NEW.kanban_order IS NULL THEN
        NEW.kanban_order := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is created on the correct table with schema
CREATE TRIGGER set_order_trigger
BEFORE INSERT ON tasks.tasks -- Explicitly specify schema
FOR EACH ROW
EXECUTE FUNCTION tasks.set_order_value();

--ADD DEFAULT VALUE FOR NEW STATUSES
CREATE OR REPLACE FUNCTION tasks.status_set_default_view_order()
RETURNS TRIGGER AS $$
DECLARE
    new_view_order INT;
BEGIN
    -- Определяем следующий view_order для данного goal_id
    SELECT COALESCE(MAX(view_order), 0) + 1 INTO new_view_order
    FROM tasks.statuses
    WHERE goal_id = NEW.goal_id;

    -- Присваиваем вычисленное значение в поле view_order
    NEW.view_order := new_view_order;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Исправленное создание триггера
CREATE TRIGGER set_default_status_view_order
BEFORE INSERT ON tasks.statuses
FOR EACH ROW
EXECUTE FUNCTION tasks.status_set_default_view_order();

-- Запрет на присвоение пользователя из другого проекта в задачу
CREATE OR REPLACE FUNCTION tasks_auth.control_user_id_is_from_same_goal_as_task()
RETURNS TRIGGER AS $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM tasks.tasks tt    
        LEFT JOIN collaboration.users_to_goals utg ON utg.goal_id = tt.goal_id
        WHERE tt.id = NEW.task_id AND utg.user_id = NEW.collab_user_id
    ) INTO user_exists;

    IF NOT user_exists THEN
        RAISE EXCEPTION 'User % is not associated with the goal of task %', NEW.collab_user_id, NEW.task_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_control_user_id_is_from_same_goal_as_task
BEFORE INSERT ON tasks_auth.task_assignee
FOR EACH ROW
EXECUTE FUNCTION tasks_auth.control_user_id_is_from_same_goal_as_task();
