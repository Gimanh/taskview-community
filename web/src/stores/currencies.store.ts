import { defineStore } from 'pinia'
import { $tvApi } from '@/plugins/axios'
import { logError } from '@/helpers/Helper'
import type { CurrenciesStoreState } from '@/types/invoices.types'

export const useCurrenciesStore = defineStore('currencies', {
  state: (): CurrenciesStoreState => ({
    currencies: [],
    loaded: false,
  }),

  getters: {
    options: (state) =>
      state.currencies.map((currency) => ({ label: `${currency.code} ${currency.symbol}`, value: currency.code })),
  },

  actions: {
    async fetch() {
      if (this.loaded) return
      const result = await $tvApi.billing.fetchCurrencies().catch(logError)
      if (!result) return
      this.currencies = result.map((currency) => ({
        code: currency.code.trim(),
        symbol: currency.symbol,
        decimalDigits: currency.decimalDigits,
      }))
      this.loaded = true
    },
  },
})
