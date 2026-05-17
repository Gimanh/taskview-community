import type { SectionBuilder } from '../types'
import { CreatedTasksKpi } from './kpi/CreatedTasksKpi'
import { CompletedTasksKpi } from './kpi/CompletedTasksKpi'
import { OverdueKpi } from './kpi/OverdueKpi'
import { CycleTimeKpi } from './kpi/CycleTimeKpi'
import { ThroughputSection } from './productivity/ThroughputSection'
import { PriorityMixOverTimeSection } from './productivity/PriorityMixOverTimeSection'
import { WorkloadByAssigneeSection } from './workload/WorkloadByAssigneeSection'
import { BlockedByDependenciesSection } from './workload/BlockedByDependenciesSection'
import { TimeInKanbanStatusSection } from './workload/TimeInKanbanStatusSection'
import { AgingOpenTasksSection } from './workload/AgingOpenTasksSection'
import { OverdueByAgeSection } from './quality/OverdueByAgeSection'
import { CycleTimeHistogramSection } from './quality/CycleTimeHistogramSection'
import { StaleTasksSection } from './quality/StaleTasksSection'
import { CycleTimePerProjectSection } from './quality/CycleTimePerProjectSection'
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
import { parseEnabledSectionIds } from './sectionEnv'

const builders: SectionBuilder[] = [
  // KPI
  new CreatedTasksKpi(),
  new CompletedTasksKpi(),
  new OverdueKpi(),
  new CycleTimeKpi(),
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
  new TimeInKanbanStatusSection(),
  new AgingOpenTasksSection(),
  // Quality
  new OverdueByAgeSection(),
  new CycleTimeHistogramSection(),
  new StaleTasksSection(),
  new CycleTimePerProjectSection(),
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
}
