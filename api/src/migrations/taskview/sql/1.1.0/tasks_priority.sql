create table if not exists tasks.priority
(
    id   serial unique,
    code varchar
);

insert into tasks.priority (id, code)
values (1, 'low'),
       (2, 'medium'),
       (3, 'high')
on conflict do nothing;



