-- One live series per origin task: DB-level backstop for the createRule race
-- where two concurrent POSTs both pass the recurrenceRuleId == null check and
-- insert two rules for the same task. Ended series keep their row but release
-- the slot (the origin task itself stays attached to the ended rule anyway).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_recurrence_rules_template_task
    ON tasks.recurrence_rules(template_task_id)
    WHERE state != 'ended';
