import { computed, ref } from 'vue'
import type { ProjectDashboardBucket, ProjectDashboardBucketTask } from '@/types/project-dashboard.types'

const PAGE_SIZE = 50

// The task list behind a column of the project dashboard: the tasks are already loaded, so pages are cut on the spot
export function useProjectDashboardBucket(bucketTasks: (bucket: ProjectDashboardBucket) => ProjectDashboardBucketTask[]) {
  const selection = ref<ProjectDashboardBucket | null>(null)
  const isOpen = ref(false)
  const shown = ref(PAGE_SIZE)

  const all = computed(() => (selection.value ? bucketTasks(selection.value) : []))

  function select(bucket: ProjectDashboardBucket) {
    selection.value = bucket
    shown.value = PAGE_SIZE
    isOpen.value = true
  }

  function more() {
    shown.value += PAGE_SIZE
  }

  return {
    selection,
    isOpen,
    items: computed(() => all.value.slice(0, shown.value)),
    total: computed(() => all.value.length),
    select,
    more,
  }
}
