import { isOrgAdminFor } from '../../billing/middlewares/is-org-admin-for'
import { InvoicesRepository } from '../InvoicesRepository'

const repository = new InvoicesRepository()

export const isOrgAdminForInvoice = isOrgAdminFor((id) => repository.fetchOrganizationId(id))
