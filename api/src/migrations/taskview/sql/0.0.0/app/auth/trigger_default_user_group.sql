--Trigger for adding users to default group
create or replace function tv_auth.add_user_to_default_group()
    returns trigger as
$date_complete$
begin
    INSERT INTO tv_auth.user_to_groups (user_id, group_id)
    VALUES (new.id, 1);
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists tr_add_user_to_default_group on tv_auth.users;
create trigger tr_add_user_to_default_group
    after insert
    on tv_auth.users
    for each row
execute procedure tv_auth.add_user_to_default_group();
