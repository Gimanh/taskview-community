<template>
  <UModal
    v-model:open="isOpen"
    :title="t('lists.edit')"
    :ui="{ footer: 'justify-end!' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="t('lists.name')">
          <UInput
            v-model="formData.name"
            :placeholder="t('lists.namePlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="isOpen = false"
      />
      <UButton
        :label="t('common.save')"
        color="primary"
        variant="outline"
        @click="save"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { List } from '@/components/features/lists/types'

const props = defineProps<{
  list: List | null
}>()

const emit = defineEmits<{
  save: [data: { name: string }]
}>()

const { t } = useI18n()

const isOpen = defineModel<boolean>('open', { required: true })

const formData = ref({
  name: '',
})

watch(
  () => props.list,
  (list) => {
    if (list) {
      formData.value.name = list.name
    }
  },
  { immediate: true },
)

function save() {
  emit('save', { name: formData.value.name })
  isOpen.value = false
}
</script>
