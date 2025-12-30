CREATE OR REPLACE FUNCTION tasks.create_default_data_for_new_user()
    RETURNS TRIGGER AS $$
DECLARE
    new_goal_id INTEGER;
    new_goal_list_id INTEGER;
BEGIN
    -- 1. Создание записи в goals
    INSERT INTO tasks.goals (owner, name)
    VALUES (NEW.id, 'First project')
    RETURNING id INTO new_goal_id;

    -- 2. Создание записи в goal_lists, используя новый id из goals
    INSERT INTO tasks.goal_lists (goal_id, name)
    VALUES (new_goal_id, 'TODO List')
    RETURNING id INTO new_goal_list_id;

    -- 3. Создание задачи в созданном списке
    INSERT INTO tasks.tasks (goal_list_id, description)
    VALUES (new_goal_list_id, 'Add new task');

    INSERT INTO tasks.tasks (goal_list_id, description)
    VALUES (new_goal_list_id, 'Click to open task detailed page');

    INSERT INTO tasks.tasks (goal_list_id, description)
    VALUES (new_goal_list_id, 'Add new project');

    INSERT INTO tasks.tasks (goal_list_id, description)
    VALUES (new_goal_list_id, 'Add new list');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TRIGGER after_user_insert
    AFTER INSERT ON tv_auth.users
    FOR EACH ROW
EXECUTE FUNCTION tasks.create_default_data_for_new_user();