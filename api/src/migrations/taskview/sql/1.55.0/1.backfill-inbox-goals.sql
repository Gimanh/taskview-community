-- For every personal organization that has no Inbox yet, create one.
-- The AFTER INSERT triggers on tasks.goals fully provision the goal, exactly like
-- a normal project: default kanban statuses (kanban_add_default_columns), the owner
-- added to collaboration (add_self_to_collaboration), and the default editor/executor
-- roles with their permissions (add_roles_after_insert). The owner also has full
-- permissions implicitly.
-- Idempotent: orgs that already have an Inbox are skipped.
INSERT INTO tasks.goals (name, owner, organization_id, is_inbox)
SELECT 'Inbox', o.owner_id, o.id, TRUE
FROM tv_auth.organizations o
WHERE o.is_personal = 1
  AND NOT EXISTS (
      SELECT 1
      FROM tasks.goals g
      WHERE g.organization_id = o.id
        AND g.is_inbox = TRUE
  );
