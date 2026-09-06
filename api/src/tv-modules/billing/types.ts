import { type } from 'arktype'
import type {
  BillingBankDetails,
  BillingRequisite,
  CounterpartiesSchemaTypeForSelect,
  SellersSchemaTypeForSelect,
} from 'taskview-db-schemas'

const NumberFromString = type('string|number').pipe((v) => Number(v))
const BooleanFromString = type('string|boolean|undefined').pipe((v) => {
  if (v === undefined) return undefined
  if (typeof v === 'boolean') return v
  return v === 'true' || v === '1'
})

export const RequisiteArkType = type({
  key: 'string<=64',
  label: 'string<=100',
  value: 'string<=300',
})

export const BankDetailsArkType = type({
  bankName: 'string<=200',
  accountNumber: 'string<=64',
  iban: 'string<=64',
  swift: 'string<=32',
  correspondentAccount: 'string<=64',
})

export const SellerArkTypeCreate = type({
  organizationId: 'number',
  name: '1<=string<=200',
  legalName: 'string<=300',
  address: 'string<=1000',
  email: 'string<=320',
  phone: 'string<=50',
  logoUrl: 'string<=1000',
  currencyCode: /^[A-Z]{3}$/,
  bank: BankDetailsArkType,
  requisites: RequisiteArkType.array(),
  defaultTerms: 'string<=2000',
  taxNote: 'string<=500',
})
export type SellerArgCreate = typeof SellerArkTypeCreate.infer

export const SellerArkTypeUpdate = SellerArkTypeCreate.omit('organizationId')
export type SellerArgUpdate = typeof SellerArkTypeUpdate.infer

export const CounterpartyArkTypeCreate = type({
  organizationId: 'number',
  kind: "'organization' | 'person'",
  name: '1<=string<=200',
  legalName: 'string<=300',
  address: 'string<=1000',
  email: 'string<=320',
  phone: 'string<=50',
  contactPerson: 'string<=200',
  requisites: RequisiteArkType.array(),
})
export type CounterpartyArgCreate = typeof CounterpartyArkTypeCreate.infer

export const CounterpartyArkTypeUpdate = CounterpartyArkTypeCreate.omit('organizationId')
export type CounterpartyArgUpdate = typeof CounterpartyArkTypeUpdate.infer

export const BillingArkTypeList = type({
  organizationId: NumberFromString,
  'includeArchived?': BooleanFromString,
})
export type BillingArgList = typeof BillingArkTypeList.infer

export const BillingArkTypeId = type({
  id: NumberFromString,
})

export const BillingArkTypeArchive = type({
  archived: 'boolean',
})

export type SellerUpdateArgs = {
  sellerId: number
  data: SellerArgUpdate
}

export type CounterpartyUpdateArgs = {
  counterpartyId: number
  data: CounterpartyArgUpdate
}

export type SetArchivedArgs = {
  id: number
  archived: boolean
}

export type SellerForClient = Omit<SellersSchemaTypeForSelect, 'bank' | 'requisites'> & {
  bank: BillingBankDetails
  requisites: BillingRequisite[]
}

export type CounterpartyForClient = Omit<CounterpartiesSchemaTypeForSelect, 'requisites'> & {
  requisites: BillingRequisite[]
}

export type DeleteResult = 'deleted' | 'in_use' | 'not_found'
