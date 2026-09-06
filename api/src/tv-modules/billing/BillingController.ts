import type { Request, Response } from 'express'
import { ArkErrors } from 'arktype'
import { BillingManager } from './BillingManager'
import {
  BillingArkTypeArchive,
  BillingArkTypeId,
  BillingArkTypeList,
  CounterpartyArkTypeCreate,
  CounterpartyArkTypeUpdate,
  SellerArkTypeCreate,
  SellerArkTypeUpdate,
  type DeleteResult,
} from './types'

const DELETE_STATUS: Record<DeleteResult, number> = { deleted: 200, in_use: 409, not_found: 404 }

export class BillingController {
  private readonly manager = new BillingManager()

  currencies = async (_req: Request, res: Response) => {
    return res.tvJson(await this.manager.fetchCurrencies())
  }

  fetchSellers = async (req: Request, res: Response) => {
    const data = BillingArkTypeList(req.query)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    return res.tvJson(await this.manager.fetchSellers(data))
  }

  createSeller = async (req: Request, res: Response) => {
    const data = SellerArkTypeCreate(req.body)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.createSeller(data)
    if (!result) return res.status(500).end()
    return res.tvJson(result)
  }

  updateSeller = async (req: Request, res: Response) => {
    const id = BillingArkTypeId(req.params)
    const data = SellerArkTypeUpdate(req.body)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.updateSeller({ sellerId: id.id, data })
    if (!result) return res.status(404).end()
    return res.tvJson(result)
  }

  archiveSeller = async (req: Request, res: Response) => {
    const id = BillingArkTypeId(req.params)
    const data = BillingArkTypeArchive(req.body)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.setSellerArchived({ id: id.id, archived: data.archived })
    if (!result) return res.status(404).end()
    return res.tvJson(result)
  }

  deleteSeller = async (req: Request, res: Response) => {
    const id = BillingArkTypeId(req.params)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    const result = await this.manager.deleteSeller(id.id)
    if (result !== 'deleted') return res.status(DELETE_STATUS[result]).end()
    return res.tvJson(true)
  }

  fetchCounterparties = async (req: Request, res: Response) => {
    const data = BillingArkTypeList(req.query)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    return res.tvJson(await this.manager.fetchCounterparties(data))
  }

  createCounterparty = async (req: Request, res: Response) => {
    const data = CounterpartyArkTypeCreate(req.body)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.createCounterparty(data)
    if (!result) return res.status(500).end()
    return res.tvJson(result)
  }

  updateCounterparty = async (req: Request, res: Response) => {
    const id = BillingArkTypeId(req.params)
    const data = CounterpartyArkTypeUpdate(req.body)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.updateCounterparty({ counterpartyId: id.id, data })
    if (!result) return res.status(404).end()
    return res.tvJson(result)
  }

  archiveCounterparty = async (req: Request, res: Response) => {
    const id = BillingArkTypeId(req.params)
    const data = BillingArkTypeArchive(req.body)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    if (data instanceof ArkErrors) return res.status(400).send(data.summary)
    const result = await this.manager.setCounterpartyArchived({ id: id.id, archived: data.archived })
    if (!result) return res.status(404).end()
    return res.tvJson(result)
  }

  deleteCounterparty = async (req: Request, res: Response) => {
    const id = BillingArkTypeId(req.params)
    if (id instanceof ArkErrors) return res.status(400).send(id.summary)
    const result = await this.manager.deleteCounterparty(id.id)
    if (result !== 'deleted') return res.status(DELETE_STATUS[result]).end()
    return res.tvJson(true)
  }
}
