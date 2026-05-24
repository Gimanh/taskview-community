import type { SectionBuilder } from '../types'
import { CreatedTasksKpi } from './kpi/CreatedTasksKpi'
import { CompletedTasksKpi } from './kpi/CompletedTasksKpi'
import { OverdueKpi } from './kpi/OverdueKpi'
import { ThroughputSection } from './productivity/ThroughputSection'
import { PriorityMixOverTimeSection } from './productivity/PriorityMixOverTimeSection'
import { WorkloadByAssigneeSection } from './workload/WorkloadByAssigneeSection'
import { BlockedByDependenciesSection } from './workload/BlockedByDependenciesSection'
import { OverdueByAgeSection } from './quality/OverdueByAgeSection'
import { StaleTasksSection } from './quality/StaleTasksSection'
import { StatusDistributionSection } from './usage/StatusDistributionSection'
import { ActiveProjectsSection } from './usage/ActiveProjectsSection'
import { IncomeExpenseMonthSection } from './financial/IncomeExpenseMonthSection'
import { IncomeExpensePerProjectSection } from './financial/IncomeExpensePerProjectSection'
import { IncomePerProjectMonthSection } from './financial/IncomePerProjectMonthSection'
import { ExpensePerProjectMonthSection } from './financial/ExpensePerProjectMonthSection'
import { IncomePerTagMonthSection } from './financial/IncomePerTagMonthSection'
import { ExpensePerTagMonthSection } from './financial/ExpensePerTagMonthSection'
import { TopProjectsByAmountSection } from './financial/TopProjectsByAmountSection'
import { AmountCoverageKpi } from './financial/AmountCoverageKpi'
import { TotalIncomeKpi } from './financial/TotalIncomeKpi'
import { TotalExpenseKpi } from './financial/TotalExpenseKpi'
import { NetProfitKpi } from './financial/NetProfitKpi'
import { PlannedIncomeKpi } from './financial/PlannedIncomeKpi'
import { PlannedExpenseKpi } from './financial/PlannedExpenseKpi'
import type { AnalyticsSectionCatalogEntry } from 'taskview-api'
import { parseEnabledSectionIds } from './sectionEnv'
import { sectionLocales } from './locales'

// ---------------------------------------------------------------------------
// Disabled sections — re-enable once the underlying data model can support them
// honestly. Until then they would report misleading numbers.
//
// 1. AgingOpenTasksSection (chart.aging_open_tasks)
//    Measures (now - date_creation) for every open task per assignee. Inflates
//    the number with backlog tasks nobody has started working on yet.
//    Needs: a boolean is_in_progress column on tasks.tasks, OR a "wip" flag
//    on tasks.statuses, so SQL can count only tasks that have been picked up.
//
// 2. CycleTimeKpi (kpi.cycle_time)
// 3. CycleTimeHistogramSection (chart.cycle_time_histogram)
// 4. CycleTimePerProjectSection (chart.cycle_time_per_project)
//    All three measure (date_complete - date_creation) for completed tasks.
//    That is actually lead time (includes time the task sat in backlog), not
//    cycle time. A task that spent 6 months in backlog and was then finished
//    in 2 days shows up as a 6-month "cycle".
//    Needs: a started_at timestamp on tasks.tasks (set when the task moves
//    into an in-progress status) so SQL can compute (date_complete - started_at).
//    Trigger or app logic must set started_at on the first transition into a
//    "wip" status.
//
// 5. TimeInKanbanStatusSection (chart.time_in_kanban_status)
//    Misleadingly named — it averages (now - edit_date) for currently-open
//    tasks grouped by their current status. It does NOT measure how long
//    each task has actually been in its current status; any unrelated edit
//    (description change, assignee change) resets the clock for the metric.
//    Needs: a tasks.status_history table tracking (task_id, status_id,
//    entered_at, exited_at). Then "time in status X" = avg(exited_at OR now
//    - entered_at) for rows in that status. Without a transition log, this
//    metric cannot be computed correctly.
// ---------------------------------------------------------------------------
// import { AgingOpenTasksSection } from './workload/AgingOpenTasksSection'
// import { TimeInKanbanStatusSection } from './workload/TimeInKanbanStatusSection'
// import { CycleTimeKpi } from './kpi/CycleTimeKpi'
// import { CycleTimeHistogramSection } from './quality/CycleTimeHistogramSection'
// import { CycleTimePerProjectSection } from './quality/CycleTimePerProjectSection'

const builders: SectionBuilder[] = [
  // KPI
  new CreatedTasksKpi(),
  new CompletedTasksKpi(),
  new OverdueKpi(),
  // new CycleTimeKpi(), // disabled — see top-of-file comment
  new TotalIncomeKpi(),
  new TotalExpenseKpi(),
  new NetProfitKpi(),
  new PlannedIncomeKpi(),
  new PlannedExpenseKpi(),
  new AmountCoverageKpi(),
  // Productivity
  new ThroughputSection(),
  new PriorityMixOverTimeSection(),
  // Workload
  new WorkloadByAssigneeSection(),
  new BlockedByDependenciesSection(),
  // new TimeInKanbanStatusSection(), // disabled — see top-of-file comment
  // new AgingOpenTasksSection(), // disabled — see top-of-file comment
  // Quality
  new OverdueByAgeSection(),
  // new CycleTimeHistogramSection(), // disabled — see top-of-file comment
  new StaleTasksSection(),
  // new CycleTimePerProjectSection(), // disabled — see top-of-file comment
  // Usage
  new StatusDistributionSection(),
  new ActiveProjectsSection(),
  // Financial
  new IncomeExpenseMonthSection(),
  new IncomeExpensePerProjectSection(),
  new IncomePerProjectMonthSection(),
  new ExpensePerProjectMonthSection(),
  new IncomePerTagMonthSection(),
  new ExpensePerTagMonthSection(),
  new TopProjectsByAmountSection(),
]

export class SectionRegistry {
  private readonly byId: Map<string, SectionBuilder>
  private readonly enabledOrder: SectionBuilder[]

  constructor() {
    this.byId = new Map(builders.map(b => [b.id, b]))

    const enabledIds = parseEnabledSectionIds(process.env.ANALYTICS_SECTIONS)
    if (enabledIds && enabledIds.length > 0) {
      this.enabledOrder = enabledIds
        .map((id: string) => this.byId.get(id))
        .filter((b: SectionBuilder | undefined): b is SectionBuilder => !!b)
    } else {
      this.enabledOrder = [...builders]
    }
  }

  all(): SectionBuilder[] {
    return [...this.enabledOrder]
  }

  get(id: string): SectionBuilder | undefined {
    const builder = this.byId.get(id)
    if (!builder) return undefined
    return this.enabledOrder.includes(builder) ? builder : undefined
  }

  filterByIds(ids?: string[]): SectionBuilder[] {
    if (!ids || ids.length === 0) return this.all()
    const enabledSet = new Set(this.enabledOrder)
    return ids
      .map(id => this.byId.get(id))
      .filter((b): b is SectionBuilder => !!b && enabledSet.has(b))
  }

  catalog(): AnalyticsSectionCatalogEntry[] {
    const locales = sectionLocales as Record<string, { title?: { ru: string, en: string } }>
    return this.enabledOrder.map(b => ({
      id: b.id,
      group: b.group,
      payloadKind: b.defaultChartType === null ? 'kpi' : 'series',
      title: locales[b.id]?.title ?? { ru: b.id, en: b.id },
    }))
  }
}
