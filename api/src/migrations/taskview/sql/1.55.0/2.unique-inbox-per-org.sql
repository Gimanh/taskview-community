-- Hard guarantee of at most one Inbox per organization. Defends the
-- check-then-insert in GoalsRepository.createInboxGoal against concurrent
-- signups/calls that could both pass the findInboxGoal precheck and insert.
-- Safe to create here: it runs after the idempotent backfill, so no duplicates exist.
CREATE UNIQUE INDEX IF NOT EXISTS goals_one_inbox_per_org_uidx
ON tasks.goals (organization_id)
WHERE is_inbox;
