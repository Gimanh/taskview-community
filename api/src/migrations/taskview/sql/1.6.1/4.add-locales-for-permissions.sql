UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Access to the app. Access to the app",
    "ru": "Доступ к приложению. Доступ к приложению"
}'
WHERE name = 'app_access';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Create projects. Create projects in own account",
    "ru": "Создание проектов. Создание проектов в своей учетной записи"
}'
WHERE name = 'access_create_goals';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit projects. Edit projects in own account",
    "ru": "Редактирование проектов. Редактирование проектов в своей учетной записи"
}'
WHERE name = 'access_edit_goals';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Delete projects. Delete projects in own account",
    "ru": "Удаление проектов. Удаление проектов в своей учетной записи"
}'
WHERE name = 'access_delete_goals';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Create components. Create components in own account",
    "ru": "Создание компонентов. Создание компонентов в своей учетной записи"
}'
WHERE name = 'access_create_components';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit components. Edit components in own account",
    "ru": "Редактирование компонентов. Редактирование компонентов в своей учетной записи"
}'
WHERE name = 'access_edit_components';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Delete components. Delete components in own account",
    "ru": "Удаление компонентов. Удаление компонентов в своей учетной записи"
}'
WHERE name = 'access_delete_components';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Create tasks. Create tasks in own account",
    "ru": "Создание задач. Создание задач в своей учетной записи"
}'
WHERE name = 'access_create_tasks';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit tasks. Edit tasks in own account",
    "ru": "Редактирование задач. Редактирование задач в своей учетной записи"
}'
WHERE name = 'access_edit_tasks';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Delete tasks. Delete tasks in own account",
    "ru": "Удаление задач. Удаление задач в своей учетной записи"
}'
WHERE name = 'access_delete_tasks';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Delete project. User can delete project (the user can delete this project, and the data cannot be recovered)",
    "ru": "Удаление проекта. Пользователь может удалить проект (пользователь сможет удалить данный проект, данные восстановить не получится)"
}'
WHERE name = 'goal_can_delete';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit project info. User can edit project information (name and description)",
    "ru": "Редактирование информации о проекте. Пользователь может редактировать информацию о проекте (название и описание)"
}'
WHERE name = 'goal_can_edit';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Delete task lists. User can delete task lists in this project",
    "ru": "Удаление списков задач. Пользователь может удалять списки задач в данном проекте"
}'
WHERE name = 'component_can_delete';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit task lists. User can edit task list information (description, name, etc.) in this project",
    "ru": "Редактирование списков задач. Пользователь может редактировать информацию в списках задач (описание, наименование и т.д.) в данном проекте"
}'
WHERE name = 'component_can_edit';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View task list content. User can watch the content (task list) of task lists",
    "ru": "Просмотр содержимого списков задач. Пользователь может просматривать содержимое (список задач) списков задач"
}'
WHERE name = 'component_can_watch_content';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Add tasks. User can add tasks into task lists",
    "ru": "Добавление задач. Пользователь может добавлять задачи в списки"
}'
WHERE name = 'component_can_add_tasks';


UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Delete tasks. User can delete tasks in the project",
    "ru": "Удаление задач. Пользователь может удалять задачи в проекте"
}'
WHERE name = 'task_can_delete';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit task description. User can edit task description in the project",
    "ru": "Редактирование описания задачи. Пользователь может менять описание задачи в проекте"
}'
WHERE name = 'task_can_edit_description';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Change task status. User can change task status (Completed/Not completed)",
    "ru": "Изменение статуса задачи. Пользователь может изменять состояние задачи (Выполнено/Не выполнено)"
}'
WHERE name = 'task_can_edit_status';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit task notes. User can edit task note",
    "ru": "Редактирование заметок задачи. Пользователь может редактировать заметку в задаче"
}'
WHERE name = 'task_can_edit_note';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit task deadlines. User can change task start and end date",
    "ru": "Изменение сроков задачи. Пользователь может изменять дату начала и окончания задачи"
}'
WHERE name = 'task_can_edit_deadline';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View task details. User has access to full task details (a window that displays all parameters when clicking on a task). The composition of the window components is controlled by other permissions.",
    "ru": "Просмотр подробностей задачи. Пользователь имеет доступ полному описанию задачи (окно которое отображает все параметры при клике по задаче). Состав компонентов окна регулируются другими разрешениями."
}'
WHERE name = 'task_can_watch_details';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View subtasks. User can view subtasks in project tasks",
    "ru": "Просмотр подзадач. Пользователь может просматривать подзадачи в задачах проекта"
}'
WHERE name = 'task_can_watch_subtasks';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Add subtasks. User can add subtasks into main task",
    "ru": "Добавление подзадач. Пользователь может добавлять подзадачи в основную задачу"
}'
WHERE name = 'task_can_add_subtasks';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit task tags. User can edit task tags",
    "ru": "Редактирование тегов задачи. Пользователь может редактировать теги задачи"
}'
WHERE name = 'task_can_edit_tags';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View task tags. User can view task tags",
    "ru": "Просмотр тегов задачи. Пользователь может просматривать теги задачи"
}'
WHERE name = 'task_can_watch_tags';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View task priority. User can view task priority",
    "ru": "Просмотр приоритета задачи. Пользователь может просматривать приоритет задачи"
}'
WHERE name = 'task_can_watch_priority';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Edit task priority. User can edit task priority",
    "ru": "Редактирование приоритета задачи. Пользователь может редактировать приоритет задачи"
}'
WHERE name = 'task_can_edit_priority';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Access task history. User can access task history",
    "ru": "Доступ к истории задачи. Пользователь может просматривать историю задачи"
}'
WHERE name = 'task_can_access_history';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Recover task history. User can recover task history state",
    "ru": "Восстановление истории задачи. Пользователь может восстанавливать состояние задачи из истории"
}'
WHERE name = 'task_can_recovery_history';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View task note. User can view task note",
    "ru": "Просмотр заметок задачи. Пользователь может просматривать заметку задачи"
}'
WHERE name = 'task_can_watch_note';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View task lists. User has the right to view task lists in the project",
    "ru": "Просмотр списков задач. Пользователь имеет право на просмотр списков задач в проекте"
}'
WHERE name = 'goal_can_watch_content';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Add task lists. User can add task lists to the project",
    "ru": "Добавление списков задач. Пользователь может добавлять списки задач в проекте"
}'
WHERE name = 'goal_can_add_task_list';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Manage project users. User can manage project users in the Collaboration section but cannot create roles or change their permissions. The user can change the composition of roles for other project users. Role changes can only be made by the project owner.",
    "ru": "Управление пользователями проекта. Пользователь может управлять пользователями проекта в разделе \"Совместная работа\", но не может создавать роли и изменять их разрешения. Пользователь может изменять состав ролей у других пользователей проекта. Изменениями ролей может заниматься только владелец проекта."
}'
WHERE name = 'goal_can_manage_users';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "Assign users to tasks. User can assign all project users to tasks",
    "ru": "Назначение пользователей на задачи. Пользователь может назначать всех пользователей проекта на задачи"
}'
WHERE name = 'task_can_assign_users';

UPDATE tv_auth.permissions
SET description_locales = '{
    "en": "View assigned users. User can see assigned users to tasks",
    "ru": "Просмотр назначенных пользователей. Пользователь может видеть назначенных пользователей для задач"
}'
WHERE name = 'task_can_watch_assigned_users';




delete from tv_auth.permissions WHERE name = 'component_can_edit_all_tasks';

delete from tv_auth.permissions WHERE name = 'component_can_edit_their_tasks';