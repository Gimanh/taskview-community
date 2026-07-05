-- A user is either a member of a project or not — there is no meaning to two
-- membership rows for the same (user_id, goal_id). Roles live in a separate table
-- (collaboration.users_to_roles), so multi-role membership does not need duplicate rows.
-- Dedupe any existing duplicates (the table has no PK, so key off ctid), then enforce
-- uniqueness. Insert paths use ON CONFLICT DO NOTHING so re-adding a member is idempotent.

DELETE FROM collaboration.users_to_goals
WHERE ctid NOT IN (
    SELECT MIN(ctid)
    FROM collaboration.users_to_goals
    GROUP BY user_id, goal_id
);

CREATE UNIQUE INDEX IF NOT EXISTS users_to_goals_user_goal_uidx
    ON collaboration.users_to_goals (user_id, goal_id);
