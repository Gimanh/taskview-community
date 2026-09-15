import { BillingRepository } from '../BillingRepository'
import { isOrgAdminFor } from './is-org-admin-for'

const repository = new BillingRepository()

export const isOrgAdminForSeller = isOrgAdminFor(async (id) => (await repository.fetchSellerById(id))?.organizationId ?? null)

export const isOrgAdminForCounterparty = isOrgAdminFor(
  async (id) => (await repository.fetchCounterpartyById(id))?.organizationId ?? null,
)
