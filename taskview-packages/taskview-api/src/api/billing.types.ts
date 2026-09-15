export type CurrencyItem = {
    id: number
    code: string
    numericCode: number
    name: string
    symbol: string
    decimalDigits: number
    sortOrder: number
    isActive: boolean
    createdAt: string
}

export type BillingRequisite = {
    key: string
    label: string
    value: string
}

export type BillingBankDetails = {
    bankName: string
    accountNumber: string
    iban: string
    swift: string
    correspondentAccount: string
}

export type CounterpartyKind = 'organization' | 'person'

export type SellerItem = {
    id: number
    organizationId: number
    name: string
    legalName: string
    address: string
    email: string
    phone: string
    logoUrl: string
    currencyCode: string
    bank: BillingBankDetails
    requisites: BillingRequisite[]
    defaultTerms: string
    taxNote: string
    archived: boolean
    createdAt: string
    updatedAt: string
}

export type SellerArgCreate = Omit<SellerItem, 'id' | 'archived' | 'createdAt' | 'updatedAt'>

export type SellerArgUpdate = {
    id: number
    data: Omit<SellerArgCreate, 'organizationId'>
}

export type CounterpartyItem = {
    id: number
    organizationId: number
    kind: CounterpartyKind
    name: string
    legalName: string
    address: string
    email: string
    phone: string
    contactPerson: string
    requisites: BillingRequisite[]
    archived: boolean
    createdAt: string
    updatedAt: string
}

export type CounterpartyArgCreate = Omit<CounterpartyItem, 'id' | 'archived' | 'createdAt' | 'updatedAt'>

export type CounterpartyArgUpdate = {
    id: number
    data: Omit<CounterpartyArgCreate, 'organizationId'>
}

export type BillingArgList = {
    organizationId: number
    includeArchived?: boolean
}

export type BillingArgArchive = {
    id: number
    archived: boolean
}
