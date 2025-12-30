CREATE TABLE IF NOT EXISTS tasks.history_list
(
    id          serial,
    code        int,
    description varchar
);

CREATE UNIQUE INDEX IF NOT EXISTS history_list_code ON tasks.history_list (code);

INSERT INTO tasks.history_list(code, description)
VALUES (1, 'Actual record'),
       (2, 'Not actual records');
