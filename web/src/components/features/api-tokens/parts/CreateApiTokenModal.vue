<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('apiTokens.add') }}
      </h3>
    </template>
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="t('apiTokens.name')">
          <UInput
            v-model="name"
            :placeholder="t('apiTokens.namePlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('apiTokens.expiration')">
          <USelectMenu
            v-model="expiration"
            :items="expirationOptions"
            value-key="value"
            :search-input="false"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('apiTokens.projects')">
          <p class="text-xs text-muted mb-2">
            {{ t('apiTokens.projectsHint') }}
          </p>
          <USelectMenu
            v-model="selectedGoalIds"
            :items="goalOptions"
            multiple
            value-key="value"
            :search-input="false"
            class="w-full"
            :placeholder="t('apiTokens.allProjects')"
          />
        </UFormField>
        <UFormField :label="t('apiTokens.permissions')">
          <p class="text-xs text-muted mb-2">
            <a
              href="https://taskview.tech/docs/collaboration/roles-and-permissions#project-permissions"
              target="_blank"
              rel="noopener noreferrer"
              class="underline underline-offset-2 hover:text-default"
            >{{ t('apiTokens.permissionsDocs') }}</a>
          </p>
          <TvPermissionPicker v-model="selectedPermissions" />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          :label="t('apiTokens.generate')"
          color="primary"
          :disabled="!name"
          variant="outline"
          :loading="saving"
          @click="handleCreate"
        />
      </div>
    </template>
  </UModal>

  <UModal
    v-model:open="showToken"
    :fullscreen="isMobile"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t('apiTokens.tokenCreated') }}
      </h3>
    </template>
    <template #body>
      <p class="text-sm text-muted mb-3">
        {{ t('apiTokens.tokenDescription') }}
      </p>
      <div class="flex items-center justify-between gap-2 p-3 bg-elevated rounded-lg">
        <span class="font-mono text-xs break-all">{{ createdToken }}</span>
        <UButton
          icon="i-lucide-copy"
          variant="ghost"
          size="xs"
          class="shrink-0"
          @click="copy(createdToken)"
        />
      </div>
    </template>
    <template #footer>
      <div class="w-full flex justify-end">
        <UButton
          :label="t('common.done')"
          color="primary"
          variant="outline"
          @click="showToken = false"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@vueuse/core'
import { useApiTokensStore } from '@/stores/api-tokens.store'
import { useGoalsStore } from '@/stores/goals.store'
import { useTaskView } from '@/composables/useTaskView'
import TvPermissionPicker from '@/components/features/base/TvPermissionPicker.vue'

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()
const { copy } = useClipboard()
const store = useApiTokensStore()
const goalsStore = useGoalsStore()

const name = ref('')
const expiration = ref('none')
const selectedPermissions = ref<string[]>([])
const selectedGoalIds = ref<number[]>([])
const saving = ref(false)
const showToken = ref(false)
const createdToken = ref('')

const expirationOptions = [
  { label: t('apiTokens.noExpiration'), value: 'none' },
  { label: t('apiTokens.days30'), value: '30' },
  { label: t('apiTokens.days60'), value: '60' },
  { label: t('apiTokens.days90'), value: '90' },
  { label: t('apiTokens.year1'), value: '365' },
]

const goalOptions = computed(() =>
  goalsStore.goals
    .filter((g) => g.archive === 0)
    .map((g) => ({ label: g.name, value: g.id })),
)

function getExpiresAt(): string | null {
  if (expiration.value === 'none') return null
  const days = parseInt(expiration.value)
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

async function handleCreate() {
  saving.value = true
  try {
    const result = await store.createToken({
      name: name.value,
      allowedPermissions: selectedPermissions.value.length > 0 ? selectedPermissions.value : undefined,
      allowedGoalIds: selectedGoalIds.value.length > 0 ? selectedGoalIds.value : undefined,
      expiresAt: getExpiresAt(),
    })

    if (result) {
      isOpen.value = false
      createdToken.value = result.token
      showToken.value = true
      name.value = ''
      selectedPermissions.value = []
      selectedGoalIds.value = []
      expiration.value = 'none'
      emit('created')
    }
  } finally {
    saving.value = false
  }
}

</script>
