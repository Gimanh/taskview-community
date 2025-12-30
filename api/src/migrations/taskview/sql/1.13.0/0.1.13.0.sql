alter table tasks.tasks add column amount numeric(10, 2);

create table if not exists tasks.transactions(
	id serial primary key,
	name varchar not null
);

insert into tasks.transactions (id, name) values (1, 'Income'), (0, 'Expense');

alter table tasks.tasks add column transaction_type int;

alter table tasks.tasks add constraint fk_task_transa foreign key (transaction_type) references tasks.transactions(id) on delete set null;