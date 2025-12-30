create or replace function tasks.add_self_to_collaboration()
returns trigger as $$
DECLARE
    owner_email TEXT;
BEGIN

    select email into owner_email
    from tv_auth.users
    where id = NEW.owner;

    if owner_email is not null then
        insert into collaboration.users (goal_id, email) values (NEW.id, owner_email);
    end if;

    return NEW;
END;
$$ language plpgsql;

drop trigger if exists add_selt_to_collaboration_trg on tasks.goals;

create trigger add_selt_to_collaboration_trg
    after insert on tasks.goals
    for each row
    execute function tasks.add_self_to_collaboration();
