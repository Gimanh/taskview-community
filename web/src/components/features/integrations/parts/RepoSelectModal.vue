<template>
  <UModal v-model:open="isOpen">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('integrations.selectRepo') }}
      </h3>
    </template>
    <template #body>
      <div class="flex flex-col gap-3">
        <UInput
          v-model="search"
          :placeholder="t('integrations.searchRepos')"
          icon="i-lucide-search"
        />
        <div
          v-if="loading"
          class="flex items-center justify-center h-32"
        >
          <p>{{ t('common.loading') }}</p>
        </div>
        <div
          v-else-if="filteredRepos.length === 0"
          class="flex items-center justify-center h-32 text-muted"
        >
          <p>{{ t('integrations.noReposFound') }}</p>
        </div>
        <div
          v-else
          class="flex flex-col gap-2 max-h-80 overflow-y-auto"
        >
          <div
            v-for="repo in filteredRepos"
            :key="repo.id"
            class="flex items-center justify-between p-3 border border-default rounded-lg cursor-pointer hover:bg-elevated transition-colors"
            @click="handleSelect(repo)"
          >
            <div class="flex flex-col gap-0.5 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium truncate">{{ repo.fullName }}</span>
                <UBadge
                  v-if="repo.isPrivate"
                  :label="t('integrations.private')"
                  size="xs"
                  variant="subtle"
                />
              </div>
              <span
                v-if="repo.description"
                class="text-xs text-muted truncate"
              >
                {{ repo.description }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RepoItem } from 'taskview-api'

const props = defineProps<{
  repos: RepoItem[]
  loading: boolean
}>()

const emit = defineEmits<{
  select: [repo: RepoItem]
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const search = ref('')

const filteredRepos = computed(() => {
  if (!search.value.trim()) return props.repos
  const q = search.value.toLowerCase()
  return props.repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q),
  )
})

function handleSelect(repo: RepoItem) {
  emit('select', repo)
}
</script>
