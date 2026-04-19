<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 class="text-lg font-semibold">
          {{ t('sessions.title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ t('sessions.description') }}
        </p>
      </div>
      <UButton
        v-if="hasOtherSessions"
        :label="t('sessions.deleteAll')"
        icon="i-lucide-log-out"
        color="error"
        variant="soft"
        @click="showDeleteAllConfirm = true"
      />
    </div>

    <div
      v-if="store.loading"
      class="flex items-center justify-center h-32"
    >
      <p>{{ t('common.loading') }}</p>
    </div>

    <div
      v-else-if="store.sessions.length === 0"
      class="flex flex-col items-center justify-center h-32 text-muted"
    >
      <UIcon
        name="i-lucide-monitor"
        class="size-10 mb-3"
      />
      <p>{{ t('sessions.empty') }}</p>
    </div>

    <div
      v-else
      class="flex flex-col gap-3"
    >
      <SessionItem
        v-for="session in store.sessions"
        :key="session.id"
        :session="session"
      />
    </div>

    <UModal
      v-model:open="showDeleteAllConfirm"
      :fullscreen="isMobile"
    >
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ t('sessions.deleteAll') }}
        </h3>
      </template>
      <template #body>
        <p class="text-sm">
          {{ t('sessions.deleteAllConfirm') }}
        </p>
      </template>
      <template #footer>
        <div class="w-full flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            variant="ghost"
            @click="showDeleteAllConfirm = false"
          />
          <UButton
            :label="t('sessions.deleteAll')"
            color="error"
            variant="outline"
            :loading="deletingAll"
            @click="handleDeleteAll"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionsStore } from '@/stores/sessions.store'
import { useTaskView } from '@/composables/useTaskView'
import SessionItem from './parts/SessionItem.vue'

const { t } = useI18n()
const { isMobile } = useTaskView()
const store = useSessionsStore()

const showDeleteAllConfirm = ref(false)
const deletingAll = ref(false)

const hasOtherSessions = computed(() =>
  store.sessions.some((s) => !s.isCurrent),
)

async function handleDeleteAll() {
  deletingAll.value = true
  await store.deleteAllSessions()
  showDeleteAllConfirm.value = false
  deletingAll.value = false
}

onMounted(() => {
  store.fetchSessions()
})
</script>
