INSERT INTO tv_auth.permissions ( name, description)
VALUES ('app_access', 'Access to the app'),
       ('access_create_goals', 'Create goals in own account'),
       ('access_edit_goals', 'Edit goals in own account'),
       ('access_delete_goals', 'Delete goals in own account'),
       ('access_create_components', 'Create components in own account'),
       ('access_edit_components', 'Edit components in own account'),
       ('access_delete_components', 'Delete components in own account'),
       ('access_create_tasks', 'Create tasks in own account'),
       ('access_edit_tasks', 'Edit tasks in own account'),
       ('access_delete_tasks', 'Delete tasks in own account');

INSERT INTO tv_auth.roles ( name, description)
VALUES ('app_user', 'User');

INSERT INTO tv_auth.groups ( name, description)
VALUES ('app_users', 'App users');

INSERT INTO tv_auth.role_to_permissions (role_id, permission_id)
VALUES ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'app_access')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_create_goals')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_edit_goals')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_delete_goals')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_create_components')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_edit_components')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_delete_components')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_create_tasks')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_edit_tasks')),
       ((select id from tv_auth.roles where name = 'app_user'),
        (select id from tv_auth.permissions where name = 'access_delete_tasks'));

INSERT INTO tv_auth.group_to_roles (group_id, role_id)
VALUES ((select id from tv_auth.groups where name = 'app_users'),
        (select id from tv_auth.roles where name = 'app_user'));

INSERT INTO tv_auth.users (login, email, password, block, confirm_email_code, remind_password_code, remember_token)
VALUES ('user', 'test@mail.dest', '$2y$10$q8SLauZ0Syz9aEFdiq0i8.jIlafLj5T0ujXYD7RmRzyNkZ2hR7uhO', 0,
        '40390b741a906a45119390922eaaff1d', null, null);


