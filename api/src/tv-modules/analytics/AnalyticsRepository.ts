import { eq, inArray, sql, type SQL } from 'drizzle-orm'
import { GoalsSchema } from 'taskview-db-schemas'
import { Database } from '../../modules/db'
import { callWithCatch } from '../../utils/helpers'
import { toIntArraySql } from './helpers'
import type {
  ActiveProjectsSectionRow,
  AgingOpenTasksSectionRow,
  AmountCoverageKpiRow,
  BlockedByDependenciesSectionRow,
  CompletedTasksKpiRow,
  CreatedTasksKpiRow,
  CycleTimeHistogramSectionRow,
  CycleTimeKpiRow,
  CycleTimePerProjectSectionRow,
  IncomeExpenseMonthSectionRow,
  IncomeExpensePerProjectSectionRow,
  NetProfitKpiRow,
  OverdueByAgeSectionRow,
  OverdueKpiRow,
  PlannedExpenseKpiRow,
  PlannedIncomeKpiRow,
  PriorityMixOverTimeSectionRow,
  StaleTasksSectionRow,
  StatusDistributionSectionRow,
  ThroughputSectionRow,
  TimeInKanbanStatusSectionRow,
  TopProjectsByAmountSectionRow,
  TotalExpenseKpiRow,
  TotalIncomeKpiRow,
  WorkloadByAssigneeSectionRow,
} from './sections/row.types'
import type { AnalyticsRange, DrillDownTaskRow } from './types'

type Bucket = 'day' | 'week' | 'month'

const BUCKET_SQL: Record<Bucket, { trunc: SQL, interval: SQL }> = {
  day: { trunc: sql.raw("'day'"), interval: sql.raw("'1 day'::interval") },
  week: { trunc: sql.raw("'week'"), interval: sql.raw("'1 week'::interval") },
  month: { trunc: sql.raw("'month'"), interval: sql.raw("'1 month'::interval") },
}

function bucketLiterals(bucket: Bucket): { trunc: SQL, interval: SQL } {
  const lit = BUCKET_SQL[bucket]
  if (!lit) throw new Error(`Invalid bucket: ${String(bucket)}`)
  return lit
}

const DRILL_DOWN_LIMIT = 200

const DRILL_DOWN_TASK_FIELDS = sql`
  t.id::int as "id",
  t.description as "description",
  t.goal_id::int as "goalId",
  g.name as "goalName",
  coalesce(t.complete, false) as "complete",
  t.priority_id::int as "priorityId",
  t.end_date::text as "endDate",
  t.date_creation::text as "date_creation",
  t.date_complete::text as "date_complete"
`

export class AnalyticsRepository {
  private readonly db: Database

  constructor() {
    this.db = Database.getInstance()
  }

  // ================== Goal lookups ==================

  async fetchAllGoalIdsInOrg(organizationId: number): Promise<number[]> {
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({ id: GoalsSchema.id })
        .from(GoalsSchema)
        .where(eq(GoalsSchema.organizationId, organizationId)),
    )
    return (result ?? []).map(r => r.id).filter((id): id is number => id !== null)
  }

  async fetchGoalIdsWithPermission(
    userId: number,
    email: string,
    organizationId: number,
    permissionName: string,
  ): Promise<number[]> {
    const result = await this.db.dbDrizzle.execute<{ id: number }>(sql`
      select g.id from tasks.goals g
      where g.organization_id = ${organizationId}
        and (
          g.owner = ${userId}
          or exists (
            select 1
            from collaboration.users cu
            join collaboration.users_to_goals utg on utg.user_id = cu.id and utg.goal_id = g.id
            join collaboration.users_to_roles utr on utr.user_id = cu.id
            join collaboration.roles r on r.id = utr.role_id and r.goal_id = g.id
            join collaboration.permissions_to_role ptr on ptr.role_id = r.id
            join tv_auth.permissions p on p.id = ptr.permission_id
            where cu.email = ${email}
              and p.name = ${permissionName}
          )
        )
    `)
    return result.rows.map(r => Number(r.id)).filter(id => Number.isInteger(id))
  }

  async getGoalsForIds(ids: number[]) {
    if (ids.length === 0) return []
    const result = await callWithCatch(() =>
      this.db.dbDrizzle
        .select({
          id: GoalsSchema.id,
          name: GoalsSchema.name,
        })
        .from(GoalsSchema)
        .where(inArray(GoalsSchema.id, ids)),
    )
    return (result ?? []).map(r => ({ id: r.id ?? 0, name: r.name ?? '' }))
  }

  // ================== KPI ==================

  async countCreated(goalIds: number[], range: AnalyticsRange): Promise<number> {
    const result = await this.db.dbDrizzle.execute<CreatedTasksKpiRow>(sql`
      select count(*)::int as count
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and date_creation >= ${range.from.toISOString()}
        and date_creation < ${range.to.toISOString()}
    `)
    return Number(result.rows[0]?.count ?? 0)
  }

  async countCompleted(goalIds: number[], range: AnalyticsRange): Promise<number> {
    const result = await this.db.dbDrizzle.execute<CompletedTasksKpiRow>(sql`
      select count(*)::int as count
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and complete = true
        and date_complete >= ${range.from.toISOString()}
        and date_complete < ${range.to.toISOString()}
    `)
    return Number(result.rows[0]?.count ?? 0)
  }

  async countOverdue(goalIds: number[]): Promise<number> {
    const result = await this.db.dbDrizzle.execute<OverdueKpiRow>(sql`
      select count(*)::int as count
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and (complete is null or complete = false)
        and end_date is not null
        and end_date < current_date
    `)
    return Number(result.rows[0]?.count ?? 0)
  }

  async medianCycleTime(goalIds: number[], range: AnalyticsRange): Promise<number | null> {
    const result = await this.db.dbDrizzle.execute<CycleTimeKpiRow>(sql`
      select percentile_cont(0.5) within group (
        order by extract(epoch from (date_complete - date_creation)) / 86400
      )::float as median
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and complete = true
        and date_complete is not null
        and date_creation is not null
        and date_complete >= ${range.from.toISOString()}
        and date_complete < ${range.to.toISOString()}
    `)
    const m = result.rows[0]?.median
    return m === null || m === undefined ? null : Number(m)
  }

  async sumIncome(goalIds: number[], range: AnalyticsRange): Promise<number> {
    const result = await this.db.dbDrizzle.execute<TotalIncomeKpiRow>(sql`
      select coalesce(sum(amount), 0)::float as total
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and complete = true
        and transaction_type = 1
        and amount is not null
        and date_complete >= ${range.from.toISOString()}
        and date_complete < ${range.to.toISOString()}
    `)
    return Number(result.rows[0]?.total ?? 0)
  }

  async sumExpense(goalIds: number[], range: AnalyticsRange): Promise<number> {
    const result = await this.db.dbDrizzle.execute<TotalExpenseKpiRow>(sql`
      select coalesce(sum(amount), 0)::float as total
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and complete = true
        and transaction_type = 0
        and amount is not null
        and date_complete >= ${range.from.toISOString()}
        and date_complete < ${range.to.toISOString()}
    `)
    return Number(result.rows[0]?.total ?? 0)
  }

  async sumIncomeAndExpense(goalIds: number[], range: AnalyticsRange): Promise<{ income: number, expense: number }> {
    const result = await this.db.dbDrizzle.execute<NetProfitKpiRow>(sql`
      select
        coalesce(sum(case when transaction_type = 1 then amount else 0 end), 0)::float as income,
        coalesce(sum(case when transaction_type = 0 then amount else 0 end), 0)::float as expense
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and complete = true
        and transaction_type in (0, 1)
        and amount is not null
        and date_complete >= ${range.from.toISOString()}
        and date_complete < ${range.to.toISOString()}
    `)
    const r = result.rows[0] ?? { income: 0, expense: 0 }
    return { income: Number(r.income), expense: Number(r.expense) }
  }

  async sumPlannedIncome(goalIds: number[]): Promise<number> {
    const result = await this.db.dbDrizzle.execute<PlannedIncomeKpiRow>(sql`
      select coalesce(sum(amount), 0)::float as total
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and (complete is null or complete = false)
        and transaction_type = 1
        and amount is not null
    `)
    return Number(result.rows[0]?.total ?? 0)
  }

  async sumPlannedExpense(goalIds: number[]): Promise<number> {
    const result = await this.db.dbDrizzle.execute<PlannedExpenseKpiRow>(sql`
      select coalesce(sum(amount), 0)::float as total
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and (complete is null or complete = false)
        and transaction_type = 0
        and amount is not null
    `)
    return Number(result.rows[0]?.total ?? 0)
  }

  async amountCoverage(goalIds: number[]): Promise<{ total: number, withAmount: number }> {
    const result = await this.db.dbDrizzle.execute<AmountCoverageKpiRow>(sql`
      select
        count(*)::int as total,
        count(*) filter (where amount is not null)::int as with_amount
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
    `)
    const r = result.rows[0] ?? { total: 0, with_amount: 0 }
    return { total: Number(r.total), withAmount: Number(r.with_amount) }
  }

  // ================== Productivity ==================

  async fetchThroughput(goalIds: number[], range: AnalyticsRange, bucket: Bucket): Promise<ThroughputSectionRow[]> {
    const { trunc: bucketSql, interval: intervalSql } = bucketLiterals(bucket)
    const goalIdsSql = toIntArraySql(goalIds)

    const result = await this.db.dbDrizzle.execute<ThroughputSectionRow>(sql`
      with buckets as (
        select generate_series(
          date_trunc(${bucketSql}, ${range.from.toISOString()}::timestamp),
          date_trunc(${bucketSql}, ${range.to.toISOString()}::timestamp - interval '1 microsecond'),
          ${intervalSql}
        ) as bucket
      ),
      created as (
        select date_trunc(${bucketSql}, date_creation) as bucket, count(*)::int as count
        from tasks.tasks
        where goal_id = any(${goalIdsSql})
          and date_creation >= ${range.from.toISOString()}
          and date_creation < ${range.to.toISOString()}
        group by date_trunc(${bucketSql}, date_creation)
      ),
      completed as (
        select date_trunc(${bucketSql}, date_complete) as bucket, count(*)::int as count
        from tasks.tasks
        where goal_id = any(${goalIdsSql})
          and complete = true
          and date_complete >= ${range.from.toISOString()}
          and date_complete < ${range.to.toISOString()}
        group by date_trunc(${bucketSql}, date_complete)
      )
      select
        to_char(b.bucket, 'YYYY-MM-DD') as bucket,
        coalesce(c.count, 0)::int as created,
        coalesce(d.count, 0)::int as completed
      from buckets b
      left join created c on c.bucket = b.bucket
      left join completed d on d.bucket = b.bucket
      order by b.bucket asc
    `)
    return result.rows as ThroughputSectionRow[]
  }

  async fetchPriorityMix(goalIds: number[], range: AnalyticsRange, bucket: Bucket): Promise<PriorityMixOverTimeSectionRow[]> {
    const { trunc: bucketSql, interval: intervalSql } = bucketLiterals(bucket)
    const goalIdsSql = toIntArraySql(goalIds)

    const result = await this.db.dbDrizzle.execute<PriorityMixOverTimeSectionRow>(sql`
      with buckets as (
        select generate_series(
          date_trunc(${bucketSql}, ${range.from.toISOString()}::timestamp),
          date_trunc(${bucketSql}, ${range.to.toISOString()}::timestamp - interval '1 microsecond'),
          ${intervalSql}
        ) as bucket
      ),
      created as (
        select date_trunc(${bucketSql}, date_creation) as bucket, priority_id
        from tasks.tasks
        where goal_id = any(${goalIdsSql})
          and date_creation >= ${range.from.toISOString()}
          and date_creation < ${range.to.toISOString()}
      )
      select
        to_char(b.bucket, 'YYYY-MM-DD') as bucket,
        coalesce(sum(case when c.priority_id = 3 then 1 else 0 end), 0)::int as high,
        coalesce(sum(case when c.priority_id = 2 then 1 else 0 end), 0)::int as medium,
        coalesce(sum(case when c.priority_id = 1 then 1 else 0 end), 0)::int as low,
        coalesce(sum(case when c.priority_id is null then 1 else 0 end), 0)::int as none
      from buckets b
      left join created c on c.bucket = b.bucket
      group by b.bucket
      order by b.bucket asc
    `)
    return result.rows as PriorityMixOverTimeSectionRow[]
  }

  // ================== Workload ==================

  async fetchWorkloadByAssignee(goalIds: number[]): Promise<WorkloadByAssigneeSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<WorkloadByAssigneeSectionRow>(sql`
      select * from (
        select
          cu.id as user_id,
          coalesce(cu.email, 'Unknown') as user_name,
          sum(case when t.priority_id = 3 then 1 else 0 end)::int as high,
          sum(case when t.priority_id = 2 then 1 else 0 end)::int as medium,
          sum(case when t.priority_id = 1 then 1 else 0 end)::int as low,
          sum(case when t.priority_id is null then 1 else 0 end)::int as no_priority
        from tasks.tasks t
        join tasks_auth.task_assignee ta on ta.task_id = t.id
        join collaboration.users cu on cu.id = ta.collab_user_id
        where t.goal_id = any(${toIntArraySql(goalIds)})
          and (t.complete is null or t.complete = false)
        group by cu.id, cu.email
      ) s
      order by (s.high * 3 + s.medium * 2 + s.low + s.no_priority) desc
      limit 30
    `)
    return result.rows as WorkloadByAssigneeSectionRow[]
  }

  async fetchBlockedByDeps(goalIds: number[]): Promise<BlockedByDependenciesSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<BlockedByDependenciesSectionRow>(sql`
      select
        g.id as goal_id,
        g.name as goal_name,
        count(distinct t.id)::int as blocked
      from tasks.goals g
      join tasks.tasks t on t.goal_id = g.id
      join tasks.task_relations r on r.to_task_id = t.id
      join tasks.tasks src on src.id = r.from_task_id
      where g.id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and (src.complete is null or src.complete = false)
      group by g.id, g.name
      order by blocked desc
    `)
    return result.rows as BlockedByDependenciesSectionRow[]
  }

  async fetchTimeInKanbanStatus(goalId: number, accessibleGoalIds: number[]): Promise<TimeInKanbanStatusSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<TimeInKanbanStatusSectionRow>(sql`
      select
        s.id as status_id,
        coalesce(s.name, 'Без статуса') as status_name,
        avg(extract(epoch from (now() - coalesce(t.edit_date, t.date_creation))) / 86400.0)::float as avg_days,
        count(t.id)::int as task_count
      from tasks.tasks t
      left join tasks.statuses s on s.id = t.status_id
      where t.goal_id = ${goalId}
        and t.goal_id = any(${toIntArraySql(accessibleGoalIds)})
        and (t.complete is null or t.complete = false)
      group by s.id, s.name, s.view_order
      order by s.view_order nulls last, s.name
    `)
    return result.rows as TimeInKanbanStatusSectionRow[]
  }

  async fetchAgingOpenTasks(goalIds: number[]): Promise<AgingOpenTasksSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<AgingOpenTasksSectionRow>(sql`
      select
        cu.id as user_id,
        coalesce(cu.email, 'Unknown') as user_name,
        avg(extract(epoch from (now() - t.date_creation)) / 86400.0)::float as avg_age,
        max(extract(epoch from (now() - t.date_creation)) / 86400.0)::float as max_age,
        count(distinct t.id)::int as task_count
      from tasks.tasks t
      join tasks_auth.task_assignee ta on ta.task_id = t.id
      join collaboration.users cu on cu.id = ta.collab_user_id
      where t.goal_id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
      group by cu.id, cu.email
      having count(distinct t.id) > 0
      order by avg_age desc nulls last
      limit 20
    `)
    return result.rows as AgingOpenTasksSectionRow[]
  }

  // ================== Quality ==================

  async fetchOverdueByAge(goalIds: number[]): Promise<OverdueByAgeSectionRow> {
    const result = await this.db.dbDrizzle.execute<OverdueByAgeSectionRow>(sql`
      select
        sum(case when (current_date - end_date) between 1 and 3 then 1 else 0 end)::int as bucket_1_3,
        sum(case when (current_date - end_date) between 4 and 7 then 1 else 0 end)::int as bucket_4_7,
        sum(case when (current_date - end_date) between 8 and 14 then 1 else 0 end)::int as bucket_8_14,
        sum(case when (current_date - end_date) > 14 then 1 else 0 end)::int as bucket_15_plus
      from tasks.tasks
      where goal_id = any(${toIntArraySql(goalIds)})
        and (complete is null or complete = false)
        and end_date is not null
        and end_date < current_date
    `)
    return (result.rows[0] ?? {
      bucket_1_3: 0, bucket_4_7: 0, bucket_8_14: 0, bucket_15_plus: 0,
    }) as OverdueByAgeSectionRow
  }

  async fetchCycleTimeHistogram(goalIds: number[], range: AnalyticsRange): Promise<CycleTimeHistogramSectionRow> {
    const result = await this.db.dbDrizzle.execute<CycleTimeHistogramSectionRow>(sql`
      with durations as (
        select extract(epoch from (date_complete - date_creation)) / 86400.0 as days
        from tasks.tasks
        where goal_id = any(${toIntArraySql(goalIds)})
          and complete = true
          and date_complete is not null
          and date_creation is not null
          and date_complete >= ${range.from.toISOString()}
          and date_complete < ${range.to.toISOString()}
      )
      select
        sum(case when days < 1 then 1 else 0 end)::int as bucket_0_1,
        sum(case when days >= 1 and days < 3 then 1 else 0 end)::int as bucket_1_3,
        sum(case when days >= 3 and days < 7 then 1 else 0 end)::int as bucket_3_7,
        sum(case when days >= 7 and days < 14 then 1 else 0 end)::int as bucket_7_14,
        sum(case when days >= 14 and days < 30 then 1 else 0 end)::int as bucket_14_30,
        sum(case when days >= 30 then 1 else 0 end)::int as bucket_30_plus
      from durations
    `)
    return (result.rows[0] ?? {
      bucket_0_1: 0, bucket_1_3: 0, bucket_3_7: 0,
      bucket_7_14: 0, bucket_14_30: 0, bucket_30_plus: 0,
    }) as CycleTimeHistogramSectionRow
  }

  async fetchStaleTasks(goalIds: number[]): Promise<StaleTasksSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<StaleTasksSectionRow>(sql`
      select
        g.id as goal_id,
        g.name as goal_name,
        count(t.id)::int as stale
      from tasks.goals g
      join tasks.tasks t on t.goal_id = g.id
      where g.id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and coalesce(t.edit_date, t.date_creation) < now() - interval '30 days'
      group by g.id, g.name
      order by stale desc
    `)
    return result.rows as StaleTasksSectionRow[]
  }

  async fetchCycleTimePerProject(goalIds: number[], range: AnalyticsRange): Promise<CycleTimePerProjectSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<CycleTimePerProjectSectionRow>(sql`
      select
        g.id as goal_id,
        g.name as goal_name,
        percentile_cont(0.5) within group (
          order by extract(epoch from (t.date_complete - t.date_creation)) / 86400.0
        )::float as median_days,
        count(t.id)::int as completed
      from tasks.goals g
      join tasks.tasks t on t.goal_id = g.id
      where g.id = any(${toIntArraySql(goalIds)})
        and t.complete = true
        and t.date_complete is not null
        and t.date_creation is not null
        and t.date_complete >= ${range.from.toISOString()}
        and t.date_complete < ${range.to.toISOString()}
      group by g.id, g.name
      having count(t.id) > 0
      order by median_days desc nulls last
    `)
    return result.rows as CycleTimePerProjectSectionRow[]
  }

  // ================== Usage ==================

  async fetchStatusDistribution(goalId: number, accessibleGoalIds: number[]): Promise<StatusDistributionSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<StatusDistributionSectionRow>(sql`
      select
        s.id as status_id,
        coalesce(s.name, 'No status') as status_name,
        count(t.id)::int as count
      from tasks.tasks t
      left join tasks.statuses s on s.id = t.status_id
      where t.goal_id = ${goalId}
        and t.goal_id = any(${toIntArraySql(accessibleGoalIds)})
        and (t.complete is null or t.complete = false)
      group by s.id, s.name
      having count(t.id) > 0
      order by count desc
    `)
    return result.rows as StatusDistributionSectionRow[]
  }

  async fetchActiveProjects(goalIds: number[]): Promise<ActiveProjectsSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<ActiveProjectsSectionRow>(sql`
      with last_activity as (
        select g.id as goal_id,
               max(coalesce(t.edit_date, t.date_creation, t.date_complete)) as last_at
        from tasks.goals g
        left join tasks.tasks t on t.goal_id = g.id
        where g.id = any(${toIntArraySql(goalIds)}) and g.archive = 0
        group by g.id
      )
      select status_key, count(*)::int as count
      from (
        select
          case
            when last_at is null then 'empty'
            when last_at >= now() - interval '14 days' then 'active'
            when last_at >= now() - interval '30 days' then 'fading'
            else 'dead'
          end as status_key
        from last_activity
      ) s
      group by status_key
      order by case status_key
        when 'active' then 1
        when 'fading' then 2
        when 'dead' then 3
        when 'empty' then 4
      end
    `)
    return result.rows as ActiveProjectsSectionRow[]
  }

  // ================== Financial ==================

  async fetchIncomeExpenseMonth(goalIds: number[], range: AnalyticsRange): Promise<IncomeExpenseMonthSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<IncomeExpenseMonthSectionRow>(sql`
      with months as (
        select generate_series(
          date_trunc('month', ${range.from.toISOString()}::timestamp),
          date_trunc('month', ${range.to.toISOString()}::timestamp - interval '1 microsecond'),
          '1 month'::interval
        ) as month
      ),
      totals as (
        select
          date_trunc('month', date_complete) as month,
          sum(case when transaction_type = 1 then coalesce(amount, 0) else 0 end)::float as income,
          sum(case when transaction_type = 0 then coalesce(amount, 0) else 0 end)::float as expense
        from tasks.tasks
        where goal_id = any(${toIntArraySql(goalIds)})
          and complete = true
          and date_complete is not null
          and amount is not null
          and transaction_type in (0, 1)
          and date_complete >= ${range.from.toISOString()}
          and date_complete < ${range.to.toISOString()}
        group by date_trunc('month', date_complete)
      )
      select
        to_char(m.month, 'YYYY-MM') as month,
        coalesce(t.income, 0)::float as income,
        coalesce(t.expense, 0)::float as expense
      from months m
      left join totals t on t.month = m.month
      order by m.month asc
    `)
    return result.rows as IncomeExpenseMonthSectionRow[]
  }

  async fetchIncomeExpensePerProject(goalIds: number[]): Promise<IncomeExpensePerProjectSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<IncomeExpensePerProjectSectionRow>(sql`
      select
        g.id as goal_id,
        g.name as goal_name,
        sum(case when t.transaction_type = 1 then coalesce(t.amount, 0) else 0 end)::float as income,
        sum(case when t.transaction_type = 0 then coalesce(t.amount, 0) else 0 end)::float as expense,
        (sum(case when t.transaction_type = 1 then coalesce(t.amount, 0) else 0 end)
         - sum(case when t.transaction_type = 0 then coalesce(t.amount, 0) else 0 end))::float as net
      from tasks.goals g
      join tasks.tasks t on t.goal_id = g.id
      where g.id = any(${toIntArraySql(goalIds)})
        and t.amount is not null
        and t.transaction_type in (0, 1)
      group by g.id, g.name
      having sum(coalesce(t.amount, 0)) > 0
      order by net desc
      limit 20
    `)
    return result.rows as IncomeExpensePerProjectSectionRow[]
  }

  async fetchTopProjectsByAmount(goalIds: number[]): Promise<TopProjectsByAmountSectionRow[]> {
    const result = await this.db.dbDrizzle.execute<TopProjectsByAmountSectionRow>(sql`
      select * from (
        select
          g.id as goal_id,
          g.name as goal_name,
          sum(case when t.transaction_type = 1 then coalesce(t.amount, 0) else 0 end)::float as income,
          sum(case when t.transaction_type = 0 then coalesce(t.amount, 0) else 0 end)::float as expense
        from tasks.goals g
        join tasks.tasks t on t.goal_id = g.id
        where g.id = any(${toIntArraySql(goalIds)})
          and t.amount is not null
          and t.transaction_type in (0, 1)
        group by g.id, g.name
        having sum(coalesce(t.amount, 0)) > 0
      ) s
      order by (s.income + s.expense) desc
      limit 15
    `)
    return result.rows as TopProjectsByAmountSectionRow[]
  }

  // ================== Drill-down ==================

  async fetchOverdueTasks(goalIds: number[]): Promise<DrillDownTaskRow[]> {
    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      where t.goal_id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and t.end_date is not null
        and t.end_date < current_date
      order by t.end_date asc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchOverdueTasksInRange(
    goalIds: number[],
    minDays: number,
    maxDays: number | null,
  ): Promise<DrillDownTaskRow[]> {
    const maxClause = maxDays !== null
      ? sql`and (current_date - t.end_date) <= ${maxDays}`
      : sql``

    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      where t.goal_id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and t.end_date is not null
        and (current_date - t.end_date) >= ${minDays}
        ${maxClause}
      order by t.end_date asc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchStaleTasksInGoal(goalId: number, accessibleGoalIds: number[]): Promise<DrillDownTaskRow[]> {
    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      where t.goal_id = ${goalId}
        and t.goal_id = any(${toIntArraySql(accessibleGoalIds)})
        and (t.complete is null or t.complete = false)
        and coalesce(t.edit_date, t.date_creation) < now() - interval '30 days'
      order by coalesce(t.edit_date, t.date_creation) asc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchBlockedTasksInGoal(goalId: number, accessibleGoalIds: number[]): Promise<DrillDownTaskRow[]> {
    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select distinct on (t.id) ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      join tasks.task_relations r on r.to_task_id = t.id
      join tasks.tasks src on src.id = r.from_task_id
      where t.goal_id = ${goalId}
        and t.goal_id = any(${toIntArraySql(accessibleGoalIds)})
        and (t.complete is null or t.complete = false)
        and (src.complete is null or src.complete = false)
      order by t.id
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchOpenTasksAssignedTo(goalIds: number[], userId: number): Promise<DrillDownTaskRow[]> {
    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select distinct on (t.id) ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      join tasks_auth.task_assignee ta on ta.task_id = t.id
      where t.goal_id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and ta.collab_user_id = ${userId}
      order by t.id, t.date_creation asc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchOpenTasksAssignedWithPriority(
    goalIds: number[],
    userId: number,
    priorityFilter: number | 'null' | undefined,
  ): Promise<DrillDownTaskRow[]> {
    const priorityClause: SQL = priorityFilter === undefined
      ? sql``
      : priorityFilter === 'null'
        ? sql`and t.priority_id is null`
        : sql`and t.priority_id = ${priorityFilter}`

    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select distinct on (t.id) ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      join tasks_auth.task_assignee ta on ta.task_id = t.id
      where t.goal_id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and ta.collab_user_id = ${userId}
        ${priorityClause}
      order by t.id, t.date_creation desc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchOpenTasksInActiveProjects(
    goalIds: number[],
    statusKey: 'active' | 'fading' | 'dead',
  ): Promise<DrillDownTaskRow[]> {
    let activityClause: SQL
    if (statusKey === 'active') {
      activityClause = sql`last_at >= now() - interval '14 days'`
    } else if (statusKey === 'fading') {
      activityClause = sql`last_at >= now() - interval '30 days' and last_at < now() - interval '14 days'`
    } else {
      activityClause = sql`last_at < now() - interval '30 days'`
    }

    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      with last_activity as (
        select g.id as goal_id,
               max(coalesce(t.edit_date, t.date_creation, t.date_complete)) as last_at
        from tasks.goals g
        left join tasks.tasks t on t.goal_id = g.id
        where g.id = any(${toIntArraySql(goalIds)}) and g.archive = 0
        group by g.id
      ),
      matching_goals as (
        select goal_id from last_activity where ${activityClause}
      )
      select distinct on (t.id) ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      join matching_goals m on m.goal_id = t.goal_id
      where (t.complete is null or t.complete = false)
      order by t.id, coalesce(t.edit_date, t.date_creation) desc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }

  async fetchPlannedTasksByType(goalIds: number[], transactionType: 0 | 1): Promise<DrillDownTaskRow[]> {
    const result = await this.db.dbDrizzle.execute<DrillDownTaskRow>(sql`
      select ${DRILL_DOWN_TASK_FIELDS}
      from tasks.tasks t
      join tasks.goals g on g.id = t.goal_id
      where t.goal_id = any(${toIntArraySql(goalIds)})
        and (t.complete is null or t.complete = false)
        and t.transaction_type = ${transactionType}
        and t.amount is not null
      order by t.amount desc
      limit ${DRILL_DOWN_LIMIT}
    `)
    return result.rows as DrillDownTaskRow[]
  }
}
