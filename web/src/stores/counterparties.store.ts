import { defineStore } from 'pinia'
import type { CounterpartyItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { httpStatusOf } from '@/helpers/billingErrors'
import type {
  ArchiveArgs,
  BillingDeleteResult,
  CounterpartiesStoreState,
  CreateCounterpartyArgs,
  UpdateCounterpartyArgs,
} from '@/types/invoices.types'

export const useCounterpartiesStore = defineStore('counterparties', {
  state: (): CounterpartiesStoreState => ({
    counterparties: [],
    loading: false,
    includeArchived: false,
  }),

  getters: {
    active: (state) => state.counterparties.filter((item) => !item.archived),
    byId: (state) => (counterpartyId: number) => state.counterparties.find((item) => item.id === counterpartyId) ?? null,
  },

  actions: {
    async fetch(organizationId: number) {
      this.loading = true
      const result = await $tvApi.billing
        .fetchCounterparties({ organizationId, includeArchived: this.includeArchived })
        .catch(logError)
        .finally(() => { this.loading = false })
      if (result) this.counterparties = result
    },

    async createCounterparty({ organizationId, value }: CreateCounterpartyArgs): Promise<CounterpartyItem | null> {
      const counterparty = await $tvApi.billing.createCounterparty({ organizationId, ...value }).catch(logError)
      if (!counterparty) return null
      this.counterparties.push(counterparty)
      return counterparty
    },

    async updateCounterparty({ counterpartyId, value }: UpdateCounterpartyArgs): Promise<CounterpartyItem | null> {
      const counterparty = await $tvApi.billing.updateCounterparty({ id: counterpartyId, data: value }).catch(logError)
      if (!counterparty) return null
      this.replace(counterparty)
      return counterparty
    },

    async setArchived({ id, archived }: ArchiveArgs): Promise<CounterpartyItem | null> {
      const counterparty = await $tvApi.billing.archiveCounterparty({ id, archived }).catch(logError)
      if (!counterparty) return null
      if (!archived || this.includeArchived) this.replace(counterparty)
      else this.counterparties = this.counterparties.filter((item) => item.id !== id)
      return counterparty
    },

    async deleteCounterparty(counterpartyId: number): Promise<BillingDeleteResult> {
      try {
        await $tvApi.billing.deleteCounterparty(counterpartyId)
      } catch (error) {
        return httpStatusOf(error) === 409 ? 'in_use' : 'failed'
      }
      this.counterparties = this.counterparties.filter((item) => item.id !== counterpartyId)
      return 'deleted'
    },

    replace(counterparty: CounterpartyItem) {
      const index = this.counterparties.findIndex((item) => item.id === counterparty.id)
      if (index >= 0) this.counterparties[index] = counterparty
      else this.counterparties.push(counterparty)
    },
  },
})
