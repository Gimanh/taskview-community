import { computed } from 'vue'
import { useMainDashboardStore } from '@/stores/main-dashboard.store'
import type { ProjectDashboardBucket, ProjectDashboardBucketTask } from '@/types/project-dashboard.types'

// The task list behind a column of the main dashboard: the server keeps the tasks, so pages are asked from it
export function useMainDashboardBucket() {
  const store = useMainDashboardStore()

  const isOpen = computed({
    get: () => store.bucket !== null,
    set: (value: boolean) => {
      if (!value) store.closeBucket()
    },
  })

  const items = computed<ProjectDashboardBucketTask[]>(() => (store.bucket?.tasks ?? []).map((task) => ({
    taskId: task.id,
    goalId: task.goalId,
    description: task.description,
    daysLate: task.daysLate,
    assigneeEmail: task.assigneeEmail,
    completedOn: task.completedOn,
  })))

  return {
    selection: computed(() => store.bucket?.selection ?? null),
    isOpen,
    items,
    total: computed(() => store.bucket?.total ?? 0),
    loading: computed(() => store.bucket?.loading ?? false),
    failed: computed(() => store.bucket?.failed ?? false),
    select: (bucket: ProjectDashboardBucket) => void store.openBucket(bucket),
    more: () => void store.loadBucketPage(),
  }
}
