import TvApiBase from './base'
import type { AppResponse } from './base.types'
import type { InvoiceArgCreate, InvoiceArgList, InvoiceArgPdf, InvoiceArgStatus, InvoiceArgUpdate, InvoiceItem } from './invoices.types'

export default class TvInvoicesApi extends TvApiBase {
    protected moduleUrl = '/module/invoices'

    public async fetch(params: InvoiceArgList) {
        return this.request(this.$axios.get<AppResponse<InvoiceItem[]>>(`${this.moduleUrl}`, { params }))
    }

    public async fetchById(id: number) {
        return this.request(this.$axios.get<AppResponse<InvoiceItem>>(`${this.moduleUrl}/${id}`))
    }

    public async create(data: InvoiceArgCreate) {
        return this.request(this.$axios.post<AppResponse<InvoiceItem>>(`${this.moduleUrl}`, data))
    }

    public async update({ id, data }: InvoiceArgUpdate) {
        return this.request(this.$axios.patch<AppResponse<InvoiceItem>>(`${this.moduleUrl}/${id}`, data))
    }

    public async setStatus({ id, status }: InvoiceArgStatus) {
        return this.request(this.$axios.patch<AppResponse<InvoiceItem>>(`${this.moduleUrl}/${id}/status`, { status }))
    }

    public async reissue(id: number) {
        return this.request(this.$axios.post<AppResponse<InvoiceItem>>(`${this.moduleUrl}/${id}/reissue`, {}))
    }

    public async fetchPdf({ id, lang }: InvoiceArgPdf) {
        const response = await this.$axios.get<Blob>(`${this.moduleUrl}/${id}/pdf`, { params: { lang }, responseType: 'blob' })
        return response.data
    }

    public async delete(id: number) {
        return this.request(this.$axios.delete<AppResponse<boolean>>(`${this.moduleUrl}/${id}`))
    }
}
