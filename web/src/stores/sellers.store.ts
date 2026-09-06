import { defineStore } from 'pinia'
import type { SellerItem } from 'taskview-api'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import { httpStatusOf } from '@/helpers/billingErrors'
import type {
  ArchiveArgs,
  BillingDeleteResult,
  CreateSellerArgs,
  SellersStoreState,
  UpdateSellerArgs,
} from '@/types/invoices.types'

export const useSellersStore = defineStore('sellers', {
  state: (): SellersStoreState => ({
    sellers: [],
    loading: false,
    includeArchived: false,
  }),

  getters: {
    active: (state) => state.sellers.filter((seller) => !seller.archived),
    byId: (state) => (sellerId: number) => state.sellers.find((seller) => seller.id === sellerId) ?? null,
  },

  actions: {
    async fetch(organizationId: number) {
      this.loading = true
      const result = await $tvApi.billing
        .fetchSellers({ organizationId, includeArchived: this.includeArchived })
        .catch(logError)
        .finally(() => { this.loading = false })
      if (result) this.sellers = result
    },

    async createSeller({ organizationId, value }: CreateSellerArgs): Promise<SellerItem | null> {
      const seller = await $tvApi.billing.createSeller({ organizationId, ...value }).catch(logError)
      if (!seller) return null
      this.sellers.push(seller)
      return seller
    },

    async updateSeller({ sellerId, value }: UpdateSellerArgs): Promise<SellerItem | null> {
      const seller = await $tvApi.billing.updateSeller({ id: sellerId, data: value }).catch(logError)
      if (!seller) return null
      this.replace(seller)
      return seller
    },

    async setArchived({ id, archived }: ArchiveArgs): Promise<SellerItem | null> {
      const seller = await $tvApi.billing.archiveSeller({ id, archived }).catch(logError)
      if (!seller) return null
      if (!archived || this.includeArchived) this.replace(seller)
      else this.sellers = this.sellers.filter((item) => item.id !== id)
      return seller
    },

    async deleteSeller(sellerId: number): Promise<BillingDeleteResult> {
      try {
        await $tvApi.billing.deleteSeller(sellerId)
      } catch (error) {
        return httpStatusOf(error) === 409 ? 'in_use' : 'failed'
      }
      this.sellers = this.sellers.filter((seller) => seller.id !== sellerId)
      return 'deleted'
    },

    replace(seller: SellerItem) {
      const index = this.sellers.findIndex((item) => item.id === seller.id)
      if (index >= 0) this.sellers[index] = seller
      else this.sellers.push(seller)
    },
  },
})
