import { BillingRepository } from './BillingRepository'
import type {
  BillingArgList,
  CounterpartyArgCreate,
  CounterpartyForClient,
  CounterpartyUpdateArgs,
  DeleteResult,
  SellerArgCreate,
  SellerForClient,
  SellerUpdateArgs,
  SetArchivedArgs,
} from './types'

export class BillingManager {
  public readonly repository: BillingRepository

  constructor() {
    this.repository = new BillingRepository()
  }

  fetchCurrencies() {
    return this.repository.fetchCurrencies()
  }

  fetchSellers(args: BillingArgList): Promise<SellerForClient[]> {
    return this.repository.fetchSellers(args)
  }

  fetchSellerById(sellerId: number): Promise<SellerForClient | null> {
    return this.repository.fetchSellerById(sellerId)
  }

  createSeller(data: SellerArgCreate): Promise<SellerForClient | null> {
    return this.repository.createSeller(data)
  }

  updateSeller(args: SellerUpdateArgs): Promise<SellerForClient | null> {
    return this.repository.updateSeller(args)
  }

  setSellerArchived(args: SetArchivedArgs): Promise<SellerForClient | null> {
    return this.repository.setSellerArchived(args)
  }

  async deleteSeller(sellerId: number): Promise<DeleteResult> {
    if ((await this.repository.countInvoicesBySeller(sellerId)) > 0) return 'in_use'
    return (await this.repository.deleteSeller(sellerId)) ? 'deleted' : 'not_found'
  }

  fetchCounterparties(args: BillingArgList): Promise<CounterpartyForClient[]> {
    return this.repository.fetchCounterparties(args)
  }

  fetchCounterpartyById(counterpartyId: number): Promise<CounterpartyForClient | null> {
    return this.repository.fetchCounterpartyById(counterpartyId)
  }

  createCounterparty(data: CounterpartyArgCreate): Promise<CounterpartyForClient | null> {
    return this.repository.createCounterparty(data)
  }

  updateCounterparty(args: CounterpartyUpdateArgs): Promise<CounterpartyForClient | null> {
    return this.repository.updateCounterparty(args)
  }

  setCounterpartyArchived(args: SetArchivedArgs): Promise<CounterpartyForClient | null> {
    return this.repository.setCounterpartyArchived(args)
  }

  async deleteCounterparty(counterpartyId: number): Promise<DeleteResult> {
    if ((await this.repository.countInvoicesByCounterparty(counterpartyId)) > 0) return 'in_use'
    return (await this.repository.deleteCounterparty(counterpartyId)) ? 'deleted' : 'not_found'
  }
}
