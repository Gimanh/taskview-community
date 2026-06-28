<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
    :title="isNewTag ? t('tags.createTag') : t('tags.editTag')"
    :ui="{ content: 'sm:max-w-md' }"
  >
    <template #body>
      <div
        class="space-y-5"
        data-testid="tag-edit-dialog"
      >
        <UFormField :label="t('tags.name')">
          <UInput
            v-model="tagName"
            :placeholder="t('tags.namePlaceholder')"
            size="xl"
            variant="soft"
            class="w-full"
            :ui="{ base: 'rounded-xl' }"
            data-testid="tag-edit-dialog-name"
          />
        </UFormField>

        <UFormField :label="t('tags.color')">
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in colorPresets"
                :key="preset"
                type="button"
                class="size-7 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 transition-shadow"
                :class="isPreset(preset) ? 'ring-primary' : 'ring-transparent'"
                :style="{ backgroundColor: preset }"
                @click="tagColor = preset"
              >
                <UIcon
                  v-if="isPreset(preset)"
                  name="i-lucide-check"
                  class="size-4"
                  :style="{ color: getContrastColor(preset) }"
                />
              </button>
            </div>

            <UColorPicker
              v-model="tagColor"
              :ui="{ root: 'w-full', picker: 'w-full', selector: 'w-full' }"
              data-testid="tag-edit-dialog-color"
            />
          </div>
        </UFormField>

        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">{{ t('tags.preview') }}</span>
          <UBadge
            :label="tagName || t('tags.tagName')"
            size="lg"
            :ui="{ base: 'rounded-10' }"
            :style="{ backgroundColor: tagColor, color: getContrastColor(tagColor) }"
          >
            <template #leading>
              <UIcon
                name="i-lucide-tag"
                class="size-3"
              />
            </template>
          </UBadge>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <UButton
          v-if="!isNewTag"
          :label="t('common.delete')"
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          data-testid="tag-edit-dialog-delete"
          @click="handleDelete"
        />
        <div class="flex gap-2 ml-auto">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="isOpen = false"
          />
          <UButton
            :label="t('common.save')"
            :disabled="!tagName.trim()"
            color="primary"
            data-testid="tag-edit-dialog-save"
            @click="handleSave"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TagItem } from 'taskview-api'
import { useTaskView } from '@/composables/useTaskView'

const props = defineProps<{
  tag?: TagItem | null
  goalId: number
}>()

const emit = defineEmits<{
  save: [data: { id?: number; name: string; color: string; goalId: number }]
  delete: [tag: TagItem]
}>()

const { t } = useI18n()
const { isMobile } = useTaskView()

const isOpen = defineModel<boolean>('open', { required: true })

const tagName = ref('')
const tagColor = ref('#1E88E5')

const isNewTag = computed(() => !props.tag)

const colorPresets = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41', '#546E7A', '#26A69A', '#EC407A',
]

watch(isOpen, (open) => {
  if (open) {
    if (props.tag) {
      tagName.value = props.tag.name
      tagColor.value = props.tag.color
    } else {
      tagName.value = ''
      tagColor.value = '#1E88E5'
    }
  }
})

function isPreset(preset: string): boolean {
  return tagColor.value.toLowerCase() === preset.toLowerCase()
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

function handleSave() {
  emit('save', {
    id: props.tag?.id,
    name: tagName.value.trim(),
    color: tagColor.value,
    goalId: props.goalId,
  })
  isOpen.value = false
}

function handleDelete() {
  if (props.tag) {
    emit('delete', props.tag)
    isOpen.value = false
  }
}
</script>
