-- Accounts that already work in a project are not offered the first-run tour.
-- An account without any project (a fresh install's first user included) still gets the offer.
-- Every owner is also a collaborator of their own projects and of their Inbox (add_self_to_collaboration),
-- so membership counts only in a project that belongs to somebody else.
INSERT INTO tv_auth.user_onboarding (user_id, status)
SELECT u.id, 'dismissed'
FROM tv_auth.users u
WHERE EXISTS (SELECT 1 FROM tasks.goals g WHERE g.owner = u.id AND g.is_inbox = FALSE)
   OR EXISTS (
        SELECT 1
        FROM collaboration.users cu
        JOIN collaboration.users_to_goals ug ON ug.user_id = cu.id
        JOIN tasks.goals g ON g.id = ug.goal_id
        WHERE LOWER(cu.email) = LOWER(u.email)
          AND g.owner <> u.id
   )
ON CONFLICT (user_id) DO NOTHING;
