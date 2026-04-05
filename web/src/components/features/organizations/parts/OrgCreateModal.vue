<template>
  <UModal v-model:open="open" :fullscreen="isMobile">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">{{ t('organizations.create') }}</h3>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="open = false" />
          </div>
        </template>

        <div class="flex flex-col gap-4">
          <UFormField :label="t('organizations.name')">
            <UInput
              v-model="name"
              :placeholder="t('organizations.namePlaceholder')"
              autofocus
              class="w-full"
            />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton :label="t('organizations.save')" :loading="loading" @click="create" />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrganizationStore } from '@/stores/organization.store'
import { useTaskView } from '@/composables/useTaskView'

const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ created: [] }>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const orgStore = useOrganizationStore()

const name = ref('')
const loading = ref(false)

async function create() {
  if (!name.value.trim()) return
  loading.value = true
  try {
    const org = await orgStore.createOrganization(name.value.trim())
    if (org) {
      toast.add({ title: t('organizations.created'), color: 'success' })
      name.value = ''
      emit('created')
    }
  } finally {
    loading.value = false
  }
}
</script>
