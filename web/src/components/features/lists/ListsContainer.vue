<template>
  <UDashboardPanel
    id="lists"
    collapsible
    :resizable="false"
    :default-size="25"
    :min-size="15"
    :max-size="35"
    :class="[
      'lg:flex',
      hasListSelected || hasTaskSelected ? 'hidden' : 'flex'
    ]"
  >
    <template #header>
      <UDashboardNavbar :ui="{ right: 'flex-1', root: 'px-2!' }">
        <template #leading>
          <TvCollapseSidebarDesktop />
        </template>
        <template #right>
          <ListAddInput
            v-if="canAddTaskList"
            @add="handleAdd"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-2">
        <ListsList
          :lists="activeLists"
          @save="handleSave"
          @delete="handleDelete"
          @archive="handleArchive"
        />
        <ListsArchive
          v-if="archivedLists.length > 0"
          :lists="archivedLists"
          @save="handleSave"
          @delete="handleDelete"
          @restore="handleRestore"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useGoalListsStore } from '@/stores/goal-lists.store'
import ListAddInput from './parts/ListAddInput.vue'
import ListsList from './ListsList.vue'
import ListsArchive from './ListsArchive.vue'
import type { List } from './types'
import { useGoalPermissions } from '@/composables/useGoalPermissions'

const { canAddTaskList } = useGoalPermissions()

const route = useRoute()
const router = useRouter()

const listsStore = useGoalListsStore()
const { lists } = storeToRefs(listsStore)

const projectId = computed(() => Number(route.params.projectId) || null)
const hasListSelected = computed(() => !!route.params.listId)
const hasTaskSelected = computed(() => !!route.params.taskId)

const activeLists = computed(() => lists.value.filter(l => l.archive === 0))
const archivedLists = computed(() => lists.value.filter(l => l.archive === 1))

watch(projectId, async (newProjectId) => {
  if (newProjectId) {
    await listsStore.fetchLists(newProjectId)
  }
}, { immediate: true })

async function handleAdd(name: string) {
  if (!projectId.value) return
  const newList = await listsStore.addList({ name, goalId: projectId.value })
  if (newList) {
    router.push({ name: 'user', params: { projectId: projectId.value, listId: newList.id } })
  }
}

async function handleSave(list: List, data: { name: string }) {
  await listsStore.updateList({
    id: list.id,
    name: data.name,
  })
}

async function handleDelete(list: List) {
  await listsStore.deleteList(list.id)
}

async function handleArchive(list: List) {
  await listsStore.updateList({
    id: list.id,
    archive: 1,
  })
}

async function handleRestore(list: List) {
  await listsStore.updateList({
    id: list.id,
    archive: 0,
  })
}
</script>
