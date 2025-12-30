create schema if not exists app;
create table if not exists app.version
(
    id           serial,
    version      varchar,
    prev_version varchar
);

insert into app.version(id, version, prev_version)
select 1, '0.0.0', '0.0.0'
where not EXISTS(select id from app.version where id = 1);

--Trigger for adding owner for component
create or replace function app.trigger_set_previous_version()
    returns trigger as
$date_complete$
begin
    new.prev_version = old.version;
    return new;
end;
$date_complete$
    language plpgsql;

drop trigger if exists trigger_set_previous_version on app.version;
create trigger trigger_set_previous_version
    before insert
    on app.version
    for each row
execute procedure app.trigger_set_previous_version();
