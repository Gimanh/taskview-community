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
          <TvColorPresetPicker
            v-model="tagColor"
            picker-test-id="tag-edit-dialog-color"
          />
        </UFormField>

        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">{{ t('tags.preview') }}</span>
          <UBadge
            :label="tagName || t('tags.tagName')"
            size="lg"
            :ui="{ base: 'rounded-10' }"
            :style="{ backgroundColor: currentColor, color: contrastColor(currentColor) }"
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
import { contrastColor } from '@/helpers/color'
import TvColorPresetPicker from '@/components/features/base/TvColorPresetPicker.vue'

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
const DEFAULT_TAG_COLOR = '#1E88E5'
const tagColor = ref<string | null>(DEFAULT_TAG_COLOR)
const currentColor = computed(() => tagColor.value ?? DEFAULT_TAG_COLOR)

const isNewTag = computed(() => !props.tag)

watch(isOpen, (open) => {
  if (open) {
    if (props.tag) {
      tagName.value = props.tag.name
      tagColor.value = props.tag.color
    } else {
      tagName.value = ''
      tagColor.value = DEFAULT_TAG_COLOR
    }
  }
})

function handleSave() {
  emit('save', {
    id: props.tag?.id,
    name: tagName.value.trim(),
    color: currentColor.value,
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
