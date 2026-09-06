import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type {
    BillingArgArchive,
    BillingArgList,
    CounterpartyArgCreate,
    CounterpartyArgUpdate,
    CounterpartyItem,
    CurrencyItem,
    SellerArgCreate,
    SellerArgUpdate,
    SellerItem,
} from './billing.types'

export default class TvBillingApi extends TvApiBase {
    protected moduleUrl = '/module/billing'

    public async fetchCurrencies() {
        return this.request(this.$axios.get<AppResponse<CurrencyItem[]>>(`${this.moduleUrl}/currencies`))
    }

    public async fetchSellers(params: BillingArgList) {
        return this.request(this.$axios.get<AppResponse<SellerItem[]>>(`${this.moduleUrl}/sellers`, { params }))
    }

    public async createSeller(data: SellerArgCreate) {
        return this.request(this.$axios.post<AppResponse<SellerItem>>(`${this.moduleUrl}/sellers`, data))
    }

    public async updateSeller({ id, data }: SellerArgUpdate) {
        return this.request(this.$axios.patch<AppResponse<SellerItem>>(`${this.moduleUrl}/sellers/${id}`, data))
    }

    public async archiveSeller({ id, archived }: BillingArgArchive) {
        return this.request(this.$axios.patch<AppResponse<SellerItem>>(`${this.moduleUrl}/sellers/${id}/archive`, { archived }))
    }

    public async deleteSeller(id: number) {
        return this.request(this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/sellers/${id}`))
    }

    public async fetchCounterparties(params: BillingArgList) {
        return this.request(this.$axios.get<AppResponse<CounterpartyItem[]>>(`${this.moduleUrl}/counterparties`, { params }))
    }

    public async createCounterparty(data: CounterpartyArgCreate) {
        return this.request(this.$axios.post<AppResponse<CounterpartyItem>>(`${this.moduleUrl}/counterparties`, data))
    }

    public async updateCounterparty({ id, data }: CounterpartyArgUpdate) {
        return this.request(this.$axios.patch<AppResponse<CounterpartyItem>>(`${this.moduleUrl}/counterparties/${id}`, data))
    }

    public async archiveCounterparty({ id, archived }: BillingArgArchive) {
        return this.request(
            this.$axios.patch<AppResponse<CounterpartyItem>>(`${this.moduleUrl}/counterparties/${id}/archive`, { archived }),
        )
    }

    public async deleteCounterparty(id: number) {
        return this.request(this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/counterparties/${id}`))
    }
}
