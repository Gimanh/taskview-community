export type CrossGoalFixture = {
  victimGoalId: number
  victimListId: number
  victimColumnId: number
  victimTaskId: number
  victimSprintId: number
  attackerGoalId: number
  attackerListId: number
  attackerColumnId: number
}

export type TaskRow = {
  goal_id: number
  goal_list_id: number | null
  status_id: number | null
  parent_id: number | null
  sprint_id: number | null
  creator_id: number | null
  source_url: string | null
  date_complete: Date | null
  recurrence_rule_id: number | null
}
