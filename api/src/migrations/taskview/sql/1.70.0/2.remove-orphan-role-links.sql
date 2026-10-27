-- Removing a person from a project used to keep their links to that project's roles,
-- so a later invitation silently brought the old roles back. Drop the links left behind.
DELETE FROM collaboration.users_to_roles ur
USING collaboration.roles r
WHERE r.id = ur.role_id
  AND NOT EXISTS (
    SELECT 1
    FROM collaboration.users_to_goals ug
    WHERE ug.user_id = ur.user_id
      AND ug.goal_id = r.goal_id
  );
