<template>
  <UModal
    v-model:open="open"
    :fullscreen="isMobile"
    :ui="{ content: isMobile ? 'flex flex-col' : 'lg:max-w-2xl max-h-[90vh] flex flex-col' }"
  >
    <template #content>
      <UCard :ui="{ root: 'flex flex-col flex-1 min-h-0', body: 'flex-1 min-h-0 overflow-y-auto' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">
              {{ isEdit ? t('invoices.seller.editTitle') : t('invoices.seller.create') }}
            </h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="open = false"
            />
          </div>
        </template>

        <SellerForm v-model="formValue" />

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <span
              v-if="!canSubmit"
              class="mr-auto text-xs text-muted"
            >
              {{ t('invoices.validation.fillIn') }}: {{ t('invoices.party.name') }}
            </span>
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="open = false"
            />
            <UButton
              :label="isEdit ? t('common.save') : t('invoices.seller.create')"
              variant="soft"
              :disabled="!canSubmit"
              @click="submit"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SellerForm from './SellerForm.vue'
import { useTaskView } from '@/composables/useTaskView'
import { useSellersStore } from '@/stores/sellers.store'
import type { SellerItem } from 'taskview-api'
import type { SellerFormValue } from '@/types/invoices.types'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  organizationId: number
  seller?: SellerItem | null
}>()

const emit = defineEmits<{
  saved: [seller: SellerItem]
}>()

const { t } = useI18n()
const toast = useToast()
const { isMobile } = useTaskView()
const sellersStore = useSellersStore()

const isEdit = computed(() => !!props.seller)

function emptyValue(): SellerFormValue {
  return {
    name: '',
    legalName: '',
    address: '',
    email: '',
    phone: '',
    requisites: [],
    logoUrl: '',
    currencyCode: 'USD',
    bank: { bankName: '', accountNumber: '', iban: '', swift: '', correspondentAccount: '' },
    defaultTerms: '',
    taxNote: '',
  }
}

function fromSeller(seller: SellerItem): SellerFormValue {
  return {
    name: seller.name,
    legalName: seller.legalName,
    address: seller.address,
    email: seller.email,
    phone: seller.phone,
    requisites: seller.requisites.map((item) => ({ ...item })),
    logoUrl: seller.logoUrl,
    currencyCode: seller.currencyCode,
    bank: { ...seller.bank },
    defaultTerms: seller.defaultTerms,
    taxNote: seller.taxNote,
  }
}

const formValue = ref<SellerFormValue>(props.seller ? fromSeller(props.seller) : emptyValue())
const canSubmit = computed(() => formValue.value.name.trim().length > 0)

watch(open, (value) => {
  if (value) formValue.value = props.seller ? fromSeller(props.seller) : emptyValue()
})

async function submit() {
  if (!canSubmit.value) return
  const seller = isEdit.value && props.seller
    ? await sellersStore.updateSeller({ sellerId: props.seller.id, value: formValue.value })
    : await sellersStore.createSeller({ organizationId: props.organizationId, value: formValue.value })
  if (!seller) {
    toast.add({ title: t('invoices.toasts.saveFailed'), color: 'error' })
    return
  }
  toast.add({ title: t(isEdit.value ? 'invoices.seller.toasts.updated' : 'invoices.seller.toasts.created'), color: 'success' })
  emit('saved', seller)
  open.value = false
}
</script>
