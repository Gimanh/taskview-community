-- Permission group 7 = files (shown in the role editor)
INSERT INTO tv_auth.permissions_group (id, name)
VALUES (7, 'files')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tv_auth.permissions (name, description, permission_group, description_locales)
VALUES
    ('file_can_view', 'View and download project files', 7,
     '{
        "en": "View files. See the project files, open and download them.",
        "ru": "Просмотр файлов. Видеть файлы проекта, открывать и скачивать их.",
        "de": "Dateien ansehen. Projektdateien sehen, öffnen und herunterladen.",
        "es": "Ver archivos. Ver, abrir y descargar los archivos del proyecto.",
        "pt-BR": "Ver arquivos. Ver, abrir e baixar os arquivos do projeto."
     }'::jsonb),
    ('file_can_manage', 'Upload, rename, link, unlink and delete project files', 7,
     '{
        "en": "Manage files. Upload, rename, attach to and detach from tasks, delete project files.",
        "ru": "Управление файлами. Загружать, переименовывать, прикреплять к задачам и убирать из них, удалять файлы проекта.",
        "de": "Dateien verwalten. Projektdateien hochladen, umbenennen, an Aufgaben anhängen und lösen, löschen.",
        "es": "Gestionar archivos. Subir, renombrar, adjuntar a tareas y desvincular, eliminar archivos del proyecto.",
        "pt-BR": "Gerenciar arquivos. Enviar, renomear, anexar a tarefas e desanexar, excluir arquivos do projeto."
     }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Existing projects are NOT backfilled on purpose: roles were shaped by their owners, and the owner
-- decides who may see attachments. New projects get the permissions through
-- tasks.add_roles_and_permissions() (see all-triggers.sql); existing ones grant them in the role editor.
