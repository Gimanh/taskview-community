-- 1. Удаляем старый внешний ключ
ALTER TABLE tasks.tasks DROP CONSTRAINT fr_task_goal_id;

-- 2. Добавляем внешний ключ с каскадным удалением
ALTER TABLE tasks.tasks
ADD CONSTRAINT fr_task_goal_id
FOREIGN KEY (goal_id)
REFERENCES tasks.goals(id)
ON DELETE CASCADE;
