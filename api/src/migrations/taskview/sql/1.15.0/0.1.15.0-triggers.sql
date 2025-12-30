create or replace function tasks.check_task_graph_relation_goal()
returns trigger as $$
declare
    from_goal int;
    to_goal   int;
begin
    select goal_id into from_goal from tasks.tasks where id = new.from_task_id;
    select goal_id into to_goal   from tasks.tasks where id = new.to_task_id;

    if from_goal is null or to_goal is null then
        raise exception 'Invalid task reference in relation';
    end if;

    if from_goal <> to_goal then
        raise exception 'Relation goal_id must match both tasks'' goal_id';
    end if;

    new.goal_id := from_goal;

    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_task_relation_goal on tasks.task_relations;
create trigger trigger_task_relation_goal
before insert or update on tasks.task_relations
for each row execute function tasks.check_task_graph_relation_goal();
